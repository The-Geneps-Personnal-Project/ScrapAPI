import { SiteInfo } from "./siteModel";

export interface MangaInfo {
    id?: Number;
    sites: SiteInfo[];
    anilist_id: Number;
    alert?: Number;
    chapter: string;
    name: string;
}
