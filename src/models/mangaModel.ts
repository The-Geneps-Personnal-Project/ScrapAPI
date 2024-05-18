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
}

export const getMangaList = async (): Promise<MangaInfo[]> => {
    const db = await getDb();

    const mangas: MangaInfo[] = await db.all("SELECT * FROM mangas");

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

            return {
                id: manga.id,
                sites: sitesInfo,
                anilist_id: manga.anilist_id,
                name: manga.name,
                chapter: manga.chapter,
                alert: manga.alert,
            };
        })
    );

    return mangasInfo;
};

export const getMangaFromName = async (name: string): Promise<MangaInfo | null> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [name]);

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

    return {
        id: manga.id,
        sites: sitesInfo,
        anilist_id: manga.anilist_id,
        name: manga.name,
        chapter: manga.chapter,
        alert: manga.alert,
    };
};

export const getMangaFromSite = async (site: string): Promise<MangaInfo | null> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get(
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

    return {
        id: manga.id,
        sites: sitesInfo,
        anilist_id: manga.anilist_id,
        name: manga.name,
        chapter: manga.chapter,
        alert: manga.alert,
    };
};

export const addManga = async (manga: MangaInfo): Promise<void> => {
    const db = await getDb();

    await db.run("INSERT INTO mangas (anilist_id, name, chapter, alert) VALUES (?, ?, ?, ?)", [
        manga.anilist_id,
        manga.name,
        manga.chapter,
        manga.alert,
    ]);

    const mangaId: number = (await db.get("SELECT last_insert_rowid() as id")).id;

    await Promise.all(
        manga.sites.map(async site => {
            await db.run("INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [mangaId, site.id]);
        })
    );
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

export const deleteManga = async (name: string): Promise<void> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [name]);

    if (!manga) return;

    await db.run("DELETE FROM mangas WHERE id = ?", [manga.id]);
};

export const deleteSiteFromManga = async (mangaName: string, site: SiteInfo): Promise<void> => {
    const db = await getDb();

    const manga: MangaInfo | undefined = await db.get("SELECT * FROM mangas WHERE name = ?", [mangaName]);

    if (!manga) return;

    await db.run("DELETE FROM manga_sites WHERE manga_id = ? AND site_id = ?", [manga.id, site.id]);
};
