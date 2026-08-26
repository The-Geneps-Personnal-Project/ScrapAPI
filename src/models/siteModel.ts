import { getDb, withTransaction } from "../db/dbConfig";

export interface SiteInfo {
    id?: number;
    site: string;
    url: string;
    chapter_url: string;
    chapter_limiter: string;
}

export const getSites = async (): Promise<SiteInfo[]> => {
    const db = await getDb();
    return db.all("SELECT * FROM sites");
};

/** Returns null when no site matches — the return type used to lie about this. */
export const getSiteFromName = async (name: string): Promise<SiteInfo | null> => {
    const db = await getDb();
    const site = await db.get<SiteInfo | undefined>("SELECT * FROM sites WHERE site = ?", [name]);

    return site ?? null;
};

export const addSite = async (site: SiteInfo): Promise<number> => {
    const db = await getDb();

    const result = await db.run("INSERT INTO sites (site, url, chapter_url, chapter_limiter) VALUES (?, ?, ?, ?)", [
        site.site,
        site.url,
        site.chapter_url,
        site.chapter_limiter,
    ]);

    if (!result.lastID) throw new Error("Failed to insert site: no row id returned");
    return result.lastID;
};

/** @returns false when no site matched, so the caller can answer 404 instead of a silent 200. */
export const updateSite = async (site: SiteInfo): Promise<boolean> => {
    const db = await getDb();

    const result = await db.run("UPDATE sites SET url = ?, chapter_limiter = ?, chapter_url = ? WHERE site = ?", [
        site.url,
        site.chapter_limiter,
        site.chapter_url,
        site.site,
    ]);

    return Boolean(result.changes);
};

/** @returns false when the site does not exist. */
export const deleteSite = async (name: string): Promise<boolean> =>
    withTransaction(async db => {
        const site = await db.get<{ id: number } | undefined>("SELECT id FROM sites WHERE site = ?", [name]);
        if (!site) return false;

        // Both statements in one transaction — they used to run independently, so a
        // failure on the second left orphaned manga_sites rows.
        await db.run("DELETE FROM manga_sites WHERE site_id = ?", [site.id]);
        await db.run("DELETE FROM sites WHERE id = ?", [site.id]);

        return true;
    });
