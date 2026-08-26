import { SiteInfo } from "./siteModel";
import { replaceURL } from "../utils/utils";
import { Db, getDb, withTransaction } from "../db/dbConfig";

export type MangaStatus = "active" | "must_watch";

export interface MangaInfo {
    id?: number;
    sites: SiteInfo[];
    anilist_id: number;
    alert?: number;
    chapter: string;
    name: string;
    last_update?: string;
    /** 'active' takes part in scraping and alerts; 'must_watch' is a backlog entry. */
    status?: MangaStatus;
    infos?: {
        tags: { name: string }[];
        description: string;
        /** URL string — matches the TEXT column. It was typed `{ medium }`, so every
         *  consumer reading `.medium` off a stored value got undefined. */
        coverImage: string;
        largeImage?: string;
    };
}

interface MangaRow {
    id: number;
    anilist_id: number;
    name: string;
    chapter: string;
    alert: number;
    description: string | null;
    coverImage: string | null;
    largeImage: string | null;
    last_update: string | null;
    status: string | null;
}

/**
 * Inserts any tag that does not exist yet.
 *
 * `INSERT OR IGNORE` replaces a SELECT-then-INSERT pair that raced under
 * `Promise.all`: two concurrent inserts of the same tag both saw "missing" and the
 * second hit the UNIQUE constraint on `tags.name`.
 */
const createTags = async (db: Db, tags: { name: string }[]): Promise<void> => {
    for (const tag of tags) {
        await db.run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [tag.name]);
    }
};

/** Links a manga to the given tag names, creating tags as needed. */
const linkTags = async (db: Db, mangaId: number, tags: { name: string }[]): Promise<void> => {
    await createTags(db, tags);

    for (const tag of tags) {
        // A single statement instead of a SELECT whose result was dereferenced
        // unguarded — `(await db.get(...)).id` threw whenever the row was missing.
        await db.run(
            "INSERT OR IGNORE INTO manga_tags (manga_id, tag_id) SELECT ?, id FROM tags WHERE name = ?",
            [mangaId, tag.name]
        );
    }
};

const loadSites = async (db: Db, mangaId: number, mangaName: string): Promise<SiteInfo[]> => {
    const sites: SiteInfo[] = await db.all(
        `SELECT s.* FROM sites s
        JOIN manga_sites ms ON s.id = ms.site_id
        WHERE ms.manga_id = ?`,
        [mangaId]
    );

    const slug = replaceURL(mangaName);

    return sites.map(site => ({
        ...site,
        url: site.url + slug,
        chapter_url: site.chapter_url + slug,
    }));
};

const loadTags = async (db: Db, mangaId: number): Promise<{ name: string }[]> =>
    db.all(
        `SELECT t.name FROM tags t
        JOIN manga_tags mt ON t.id = mt.tag_id
        WHERE mt.manga_id = ?`,
        [mangaId]
    );

const toMangaInfo = async (db: Db, row: MangaRow): Promise<MangaInfo> => ({
    id: row.id,
    sites: await loadSites(db, row.id, row.name),
    anilist_id: row.anilist_id,
    name: row.name,
    chapter: row.chapter,
    alert: row.alert,
    last_update: row.last_update ?? "",
    status: (row.status as MangaStatus) ?? "active",
    infos: {
        description: row.description ?? "",
        coverImage: row.coverImage ?? "",
        largeImage: row.largeImage ?? "",
        tags: await loadTags(db, row.id),
    },
});

export const getMangaList = async (): Promise<MangaInfo[]> => {
    const db = await getDb();
    const rows: MangaRow[] = await db.all("SELECT * FROM mangas");

    return Promise.all(rows.map(row => toMangaInfo(db, row)));
};

export const getMangaFromName = async (name: string): Promise<MangaInfo | null> => {
    const db = await getDb();
    const row: MangaRow | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [name]);

    return row ? toMangaInfo(db, row) : null;
};

/** All mangas available on a given site. */
export const getMangasFromSite = async (site: string): Promise<MangaInfo[]> => {
    const db = await getDb();

    // `db.all`, not `db.get`: a site hosts many mangas, but only the first was ever
    // returned.
    const rows: MangaRow[] = await db.all(
        `SELECT m.* FROM mangas m
        JOIN manga_sites ms ON m.id = ms.manga_id
        JOIN sites s ON s.id = ms.site_id
        WHERE s.site = ?`,
        [site]
    );

    return Promise.all(rows.map(row => toMangaInfo(db, row)));
};

export const addManga = async (manga: MangaInfo): Promise<number> =>
    withTransaction(async db => {
        const result = await db.run(
            `INSERT INTO mangas (anilist_id, name, chapter, alert, description, coverImage, largeImage, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                manga.anilist_id,
                manga.name,
                manga.chapter,
                // `??`, not a truthy test: `alert: 0` used to be flipped to 1.
                manga.alert ?? 1,
                manga.infos?.description ?? "",
                manga.infos?.coverImage ?? "",
                manga.infos?.largeImage ?? "",
                manga.status ?? "active",
            ]
        );

        // `result.lastID` instead of `SELECT last_insert_rowid()`. The connection is
        // shared by every request, so two concurrent inserts could interleave and
        // attach sites and tags to the wrong manga.
        const mangaId = result.lastID;
        if (!mangaId) throw new Error("Failed to insert manga: no row id returned");

        for (const site of manga.sites) {
            if (site?.id === undefined) continue;
            await db.run("INSERT OR IGNORE INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [mangaId, site.id]);
        }

        if (manga.infos?.tags?.length) await linkTags(db, mangaId, manga.infos.tags);

        return mangaId;
    });

/** @returns false when the manga does not exist. */
export const addSiteToManga = async (mangaName: string, site: SiteInfo): Promise<boolean> => {
    const db = await getDb();
    const manga = await db.get<{ id: number } | undefined>("SELECT id FROM mangas WHERE name = ?", [mangaName]);

    if (!manga) return false;

    await db.run("INSERT OR IGNORE INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [manga.id, site.id]);
    return true;
};

/** @returns false when no manga matched the given id. */
export const updateManga = async (manga: MangaInfo): Promise<boolean> =>
    withTransaction(async db => {
        const result = await db.run(
            `UPDATE mangas
             SET anilist_id = ?, name = ?, chapter = ?, alert = ?, description = ?, coverImage = ?, largeImage = ?, status = ?
             WHERE id = ?`,
            [
                manga.anilist_id,
                manga.name,
                manga.chapter,
                manga.alert ?? 1,
                manga.infos?.description ?? "",
                manga.infos?.coverImage ?? "",
                manga.infos?.largeImage ?? "",
                manga.status ?? "active",
                manga.id,
            ]
        );

        if (!result.changes) return false;
        const mangaId = manga.id as number;

        if (manga.infos?.tags) {
            // Reconcile rather than append: tags could previously only ever be added,
            // so removing one was impossible.
            await db.run("DELETE FROM manga_tags WHERE manga_id = ?", [mangaId]);
            await linkTags(db, mangaId, manga.infos.tags);
        }

        if (manga.sites?.length) {
            // Sites were never updated at all — the block was commented out.
            for (const site of manga.sites) {
                if (site?.id === undefined) continue;
                await db.run("INSERT OR IGNORE INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [
                    mangaId,
                    site.id,
                ]);
            }
        }

        return true;
    });

/** @returns false when the manga does not exist. */
export const updateMangaChapter = async (
    mangaName: string,
    chapter: string,
    updated: string | undefined
): Promise<boolean> => {
    const db = await getDb();

    const result = await db.run("UPDATE mangas SET chapter = ?, last_update = ? WHERE name = ?", [
        chapter,
        updated ?? new Date().toISOString(),
        mangaName,
    ]);

    return Boolean(result.changes);
};

/** @returns false when the manga does not exist. */
export const deleteManga = async (name: string): Promise<boolean> =>
    withTransaction(async db => {
        const manga = await db.get<{ id: number } | undefined>("SELECT id FROM mangas WHERE name = ?", [name]);
        if (!manga) return false;

        // Join rows first, then the parent — the reverse order left orphans behind if
        // the process died mid-way.
        await db.run("DELETE FROM manga_sites WHERE manga_id = ?", [manga.id]);
        await db.run("DELETE FROM manga_tags WHERE manga_id = ?", [manga.id]);
        await db.run("DELETE FROM mangas WHERE id = ?", [manga.id]);

        return true;
    });

/** @returns false when the manga does not exist. */
export const deleteSiteFromManga = async (mangaName: string, site: SiteInfo): Promise<boolean> => {
    const db = await getDb();
    const manga = await db.get<{ id: number } | undefined>("SELECT id FROM mangas WHERE name = ?", [mangaName]);

    if (!manga) return false;

    await db.run("DELETE FROM manga_sites WHERE manga_id = ? AND site_id = ?", [manga.id, site.id]);
    return true;
};
