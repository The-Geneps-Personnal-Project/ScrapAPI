import { getDb } from "../db/dbConfig";
import { SiteInfo } from "../models/siteModel";

export const getSitesService = async (): Promise<SiteInfo[]> => {
    const db = await getDb();

    const sites: SiteInfo[] = await db.all("SELECT * FROM sites");

    return sites;
};

export const getSiteFromNameService = async (name: string): Promise<SiteInfo> => {
    const db = await getDb();

    const site: SiteInfo = (await db.get("SELECT * FROM sites WHERE site = ?", [name])) as SiteInfo;

    return site;
};

export const addSiteService = async (site: SiteInfo): Promise<void> => {
    const db = await getDb();

    await db.run("INSERT INTO sites (site, url, chapter_url) VALUES (?, ?, ?)", [
        site.site,
        site.url,
        site.chapter_url,
    ]);
};

export const updateSiteService = async (site: SiteInfo): Promise<void> => {
    const db = await getDb();

    await db.run("UPDATE sites SET url = ?, chapter_url = ? WHERE site = ?", [site.url, site.chapter_url, site.site]);
};

export const deleteSiteService = async (name: string): Promise<void> => {
    const db = await getDb();

    await db.run("DELETE FROM sites WHERE site = ?", [name]);
};
