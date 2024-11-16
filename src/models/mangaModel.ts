import { SiteInfo } from "./siteModel";
import { replaceURL } from "../utils/utils";
import { getDb } from "../db/dbConfig";

export interface MangaInfo {
    id?: Number;
    sites: SiteInfo[];
    anilist_id: Number;
    alert?: Number;
    chapter: string;
    name: string;
    last_update?: string;
    infos?: {
        tags: { name: string }[];
        description: string;
        coverImage: { medium: string };
    };
}

export const getMangaList = async (): Promise<MangaInfo[]> => {
    const db = await getDb();

    const mangas = await db.all("SELECT * FROM mangas");

    const mangasInfo: MangaInfo[] = await Promise.all(
        mangas.map(async manga => {
            const sites: SiteInfo[] = await db.all(
                `SELECT s.* FROM sites s
                JOIN manga_sites ms ON s.id = ms.site_id
                WHERE ms.manga_id = ?`,
                [manga.id]
            );

            const sitesInfo = sites.map(site => ({
                ...site,
                url: site.url + replaceURL(manga.name),
                chapter_url: site.chapter_url + replaceURL(manga.name),
            }));

            const tagsInfo = await db.all(
                `SELECT t.name FROM tags t
                JOIN manga_tags mt ON t.id = mt.tag_id
                WHERE mt.manga_id = ?`,
                [manga.id]
            );

            return {
                id: manga.id,
                sites: sitesInfo,
                anilist_id: manga.anilist_id,
                name: manga.name,
                chapter: manga.chapter,
                alert: manga.alert,
                last_update: manga.last_update ?? "",
                infos: {
                    description: manga.description ?? "",
                    coverImage: manga.coverImage ?? { medium: "" },
                    tags: tagsInfo,
                },
            };
        })
    );

    return mangasInfo;
};

export const getMangaFromName = async (name: string): Promise<MangaInfo | null> => {
    const db = await getDb();

    const manga = await db.get("SELECT * FROM mangas WHERE name = ?", [name]);

    if (!manga) return null;

    const sites: SiteInfo[] = await db.all(
        `SELECT s.* FROM sites s
        JOIN manga_sites ms ON s.id = ms.site_id
        WHERE ms.manga_id = ?`,
        [manga.id]
    );

    const sitesInfo = sites.map(site => ({
        ...site,
        url: site.url + replaceURL(manga.name),
        chapter_url: site.chapter_url + replaceURL(manga.name),
    }));

    const tagsInfo = await db.all(
        `SELECT t.name FROM tags t
        JOIN manga_tags mt ON t.id = mt.tag_id
        WHERE mt.manga_id = ?`,
        [manga.id]
    );

    return {
        id: manga.id,
        sites: sitesInfo,
        anilist_id: manga.anilist_id,
        name: manga.name,
        chapter: manga.chapter,
        alert: manga.alert,
        last_update: manga.last_update ?? "",
        infos: {
            description: manga.description ?? "",
            coverImage: manga.coverImage ?? { medium: "" },
            tags: tagsInfo,
        },
    };
};

export const getMangaFromSite = async (site: string): Promise<MangaInfo | null> => {
    const db = await getDb();

    const manga = await db.get(
        `SELECT m.* FROM mangas m
        JOIN manga_sites ms ON m.id = ms.manga_id
        JOIN sites s ON s.id = ms.site_id
        WHERE s.site = ?`,
        [site]
    );

    if (!manga) return null;

    const sites: SiteInfo[] = await db.all(
        `SELECT s.* FROM sites s
        JOIN manga_sites ms ON s.id = ms.site_id
        WHERE ms.manga_id = ?`,
        [manga.id]
    );

    const sitesInfo = sites.map(site => ({
        ...site,
        url: site.url + replaceURL(manga.name),
        chapter_url: site.chapter_url + replaceURL(manga.name),
    }));

    const tagsInfo = await db.all(
        `SELECT t.name FROM tags t
        JOIN manga_tags mt ON t.id = mt.tag_id
        WHERE mt.manga_id = ?`,
        [manga.id]
    );

    return {
        id: manga.id,
        sites: sitesInfo,
        anilist_id: manga.anilist_id,
        name: manga.name,
        chapter: manga.chapter,
        alert: manga.alert,
        last_update: manga.last_update ?? "",
        infos: {
            description: manga.description ?? "",
            coverImage: manga.coverImage ?? { medium: "" },
            tags: tagsInfo,
        },
    };
};

export const addManga = async (manga: MangaInfo): Promise<void> => {
    const db = await getDb();

    if (manga.infos?.tags) {
        await Promise.all(
            manga.infos.tags.map(async tag => {
                const existingTag = await db.get("SELECT id FROM tags WHERE name = ?", [tag.name]);
                if (!existingTag) {
                    await db.run("INSERT INTO tags (name) VALUES (?)", [tag.name]);
                }
            })
        );
    }

    await db.run(
        "INSERT INTO mangas (anilist_id, name, chapter, alert, description, coverImage) VALUES (?, ?, ?, ?, ?, ?)",
        [
            manga.anilist_id,
            manga.name,
            manga.chapter,
            manga.alert ? manga.alert : 1,
            manga.infos?.description || "",
            manga.infos?.coverImage?.medium || "",
        ]
    );

    const mangaId: number = (await db.get("SELECT last_insert_rowid() as id")).id;

    await Promise.all(
        manga.sites.map(async site => {
            await db.run("INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [mangaId, site.id]);
        })
    );

    if (manga.infos?.tags) {
        await Promise.all(
            manga.infos.tags.map(async tag => {
                const tagId = (await db.get("SELECT id FROM tags WHERE name = ?", [tag.name])).id;
                await db.run("INSERT INTO manga_tags (manga_id, tag_id) VALUES (?, ?)", [mangaId, tagId]);
            })
        );
    }
};

export const addSiteToManga = async (mangaName: string, site: SiteInfo): Promise<void> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [mangaName]);

    if (!manga) return;

    await db.run("INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [manga.id, site.id]);
};

export const updateManga = async (manga: MangaInfo): Promise<void> => {
    const db = await getDb();

    await db.run("UPDATE mangas SET anilist_id = ?, name = ?, chapter = ?, alert = ? WHERE id = ?", [
        manga.anilist_id,
        manga.name,
        manga.chapter,
        manga.alert,
        manga.id,
    ]);

    await db.run("DELETE FROM manga_sites WHERE manga_id = ?", [manga.id]);

    await Promise.all(
        manga.sites.map(async site => {
            await db.run("INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [manga.id, site.id]);
        })
    );
};

export const updateMangaChapter = async (mangaName: string, chapter: string, updated: String): Promise<void> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [mangaName]);

    if (!manga) return;

    await db.run("UPDATE mangas SET chapter = ?, last_update = ? WHERE id = ?", [chapter, updated, manga.id]);
};

export const deleteManga = async (name: string): Promise<void> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [name]);

    if (!manga) return;

    await db.run("DELETE FROM mangas WHERE id = ?", [manga.id]);
    await db.run("DELETE FROM manga_sites WHERE manga_id = ?", [manga.id]);
    await db.run("DELETE FROM manga_tags WHERE manga_id = ?", [manga.id]);
};

export const deleteSiteFromManga = async (mangaName: string, site: SiteInfo): Promise<void> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [mangaName]);

    if (!manga) return;

    await db.run("DELETE FROM manga_sites WHERE manga_id = ? AND site_id = ?", [manga.id, site.id]);
};
