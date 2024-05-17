import { getDb } from "../db/dbConfig";

export interface SiteInfo {
    id?: number;
    site: string;
    url: string;
    chapter_url: string;
    chapter_limiter: string;
}

export const getSites = async (): Promise<SiteInfo[]> => {
    const db = await getDb();

    const sites: SiteInfo[] = await db.all("SELECT * FROM sites");

    return sites;
};

export const getSiteFromName = async (name: string): Promise<SiteInfo> => {
    const db = await getDb();

    const site: SiteInfo = (await db.get("SELECT * FROM sites WHERE site = ?", [name])) as SiteInfo;

    return site;
};

export const addSite = async (site: SiteInfo): Promise<void> => {
    const db = await getDb();

    await db.run("INSERT INTO sites (site, url, chapter_url) VALUES (?, ?, ?)", [
        site.site,
        site.url,
        site.chapter_url,
    ]);
};

export const updateSite = async (site: SiteInfo): Promise<void> => {
    const db = await getDb();

    await db.run("UPDATE sites SET url = ?, chapter_url = ? WHERE site = ?", [site.url, site.chapter_url, site.site]);
};

export const deleteSite = async (name: string): Promise<void> => {
    const db = await getDb();

    await db.run("DELETE FROM sites WHERE site = ?", [name]);
};
