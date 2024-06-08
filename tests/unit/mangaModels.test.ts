import { getDb } from "../../src/db/dbConfig";
import {
    getMangaList,
    getMangaFromName,
    getMangaFromSite,
    addManga,
    addSiteToManga,
    updateManga,
    deleteManga,
    deleteSiteFromManga,
    MangaInfo,
    updateMangaChapter,
} from "../../src/models/mangaModel";
import { SiteInfo } from "../../src/models/siteModel";

jest.mock("../../src/db/dbConfig", () => ({
    getDb: jest.fn(),
}));

const mockDb = {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
};

describe("Manga Model", () => {
    beforeAll(() => {
        (getDb as jest.Mock).mockResolvedValue(mockDb);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getMangaList", () => {
        it("should return a list of mangas with their sites", async () => {
            mockDb.all
                .mockResolvedValueOnce([
                    { id: 1, anilist_id: 123, name: "Manga One", chapter: "Chapter 1", alert: false },
                    { id: 2, anilist_id: 456, name: "Manga Two", chapter: "Chapter 2", alert: true },
                ])
                .mockResolvedValueOnce([
                    {
                        id: 1,
                        site: "Site A",
                        url: "https://site-a.com/",
                        chapter_url: "https://site-a.com/chapters/",
                        chapter_limiter: "",
                    },
                ])
                .mockResolvedValueOnce([]);

            const mangas = await getMangaList();

            expect(mangas).toHaveLength(2);
            expect(mangas[0]).toHaveProperty("name", "Manga One");
            expect(mangas[0].sites[0]).toHaveProperty("site", "Site A");
        });

        it("should return an empty list if there are no mangas", async () => {
            mockDb.all.mockResolvedValueOnce([]);

            const mangas = await getMangaList();

            expect(mangas).toHaveLength(0);
        });
    });

    describe("getMangaFromName", () => {
        it("should return a manga with its sites by name", async () => {
            const name = "Manga One";
            mockDb.get.mockResolvedValueOnce({ id: 1, anilist_id: 123, name, chapter: "Chapter 1", alert: false });
            mockDb.all.mockResolvedValueOnce([
                {
                    id: 1,
                    site: "Site A",
                    url: "https://site-a.com/",
                    chapter_url: "https://site-a.com/chapters/",
                    chapter_limiter: "",
                },
            ]);

            const manga = await getMangaFromName(name);

            expect(manga).toHaveProperty("name", name);
            expect(manga?.sites[0]).toHaveProperty("site", "Site A");
        });

        it("should return null if manga is not found", async () => {
            const name = "NonExistentManga";
            mockDb.get.mockResolvedValueOnce(undefined);

            const manga = await getMangaFromName(name);

            expect(manga).toBeNull();
        });
    });

    describe("getMangaFromSite", () => {
        it("should return a manga with its sites by site name", async () => {
            const site = "Site A";
            mockDb.get.mockResolvedValueOnce({
                id: 1,
                anilist_id: 123,
                name: "Manga One",
                chapter: "Chapter 1",
                alert: false,
            });
            mockDb.all.mockResolvedValueOnce([
                {
                    id: 1,
                    site: "Site A",
                    url: "https://site-a.com/",
                    chapter_url: "https://site-a.com/chapters/",
                    chapter_limiter: "",
                },
            ]);

            const manga = await getMangaFromSite(site);

            expect(manga).toHaveProperty("name", "Manga One");
            expect(manga?.sites[0]).toHaveProperty("site", site);
        });

        it("should return null if manga is not found", async () => {
            const site = "NonExistentSite";
            mockDb.get.mockResolvedValueOnce(undefined);

            const manga = await getMangaFromSite(site);

            expect(manga).toBeNull();
        });
    });

    // TO FIX: Not working in dev environment but works in prod environment
    // describe("addManga", () => {
    //     it("should add a new manga and its sites", async () => {
    //         const newManga: MangaInfo = {
    //             anilist_id: 123,
    //             name: "Manga Six",
    //             chapter: "3",
    //             alert: 0,
    //             sites: [
    //                 {
    //                     id: 1,
    //                     site: "Site A",
    //                     url: "https://site-a.com/",
    //                     chapter_url: "https://site-a.com/chapters/",
    //                     chapter_limiter: "",
    //                 },
    //             ],
    //             infos: {
    //                 tags: [{ name: "Action" }, { name: "Adventure" }],
    //                 description: "An exciting adventure manga.",
    //                 coverImage: { medium: "https://example.com/cover.jpg" },
    //             },
    //         };

    //         mockDb.run.mockResolvedValueOnce(undefined);
    //         mockDb.get.mockResolvedValueOnce({ id: 3 });

    //         await addManga(newManga);

    //         expect(mockDb.run).toHaveBeenCalledWith(
    //             "INSERT INTO mangas (anilist_id, name, chapter, alert, description, coverImage) VALUES (?, ?, ?, ?, ?, ?)",
    //             [
    //                 newManga.anilist_id,
    //                 newManga.name,
    //                 newManga.chapter,
    //                 newManga.alert,
    //                 newManga.infos?.description,
    //                 newManga.infos?.coverImage?.medium,
    //             ]
    //         );
    //         expect(mockDb.run).toHaveBeenCalledWith(
    //             "INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)",
    //             [3, 1]
    //         );

    //         if (newManga.infos?.tags) {
    //             for (const tag of newManga.infos.tags) {
    //                 expect(mockDb.run).toHaveBeenCalledWith("INSERT INTO tags (name) VALUES (?)", [tag.name]);
    //                 expect(mockDb.run).toHaveBeenCalledWith(
    //                     "INSERT INTO manga_tags (manga_id, tag_id) VALUES (?, (SELECT id FROM tags WHERE name = ?))",
    //                     [3, tag.name]
    //                 );
    //             }
    //         }
    //     });
    // });

    describe("addSiteToManga", () => {
        it("should add a site to an existing manga", async () => {
            const mangaName = "Manga One";
            const site: SiteInfo = {
                id: 2,
                site: "Site B",
                url: "https://site-b.com/",
                chapter_url: "https://site-b.com/chapters/",
                chapter_limiter: "",
            };

            mockDb.get.mockResolvedValueOnce({ id: 1 });

            await addSiteToManga(mangaName, site);

            expect(mockDb.run).toHaveBeenCalledWith("INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [
                1,
                site.id,
            ]);
        });

        it("should not add a site if manga is not found", async () => {
            const mangaName = "NonExistentManga";
            const site: SiteInfo = {
                id: 2,
                site: "Site B",
                url: "https://site-b.com/",
                chapter_url: "https://site-b.com/chapters/",
                chapter_limiter: "",
            };

            mockDb.get.mockResolvedValueOnce(undefined);

            await addSiteToManga(mangaName, site);

            expect(mockDb.run).not.toHaveBeenCalled();
        });
    });

    describe("updateManga", () => {
        it("should update an existing manga and its sites", async () => {
            const updatedManga: MangaInfo = {
                id: 1,
                anilist_id: 123,
                name: "Manga One Updated",
                chapter: "Chapter 10",
                alert: 1,
                sites: [
                    {
                        id: 1,
                        site: "Site A",
                        url: "https://site-a.com/",
                        chapter_url: "https://site-a.com/chapters/",
                        chapter_limiter: "",
                    },
                ],
            };

            mockDb.run.mockResolvedValueOnce(undefined);

            await updateManga(updatedManga);

            expect(mockDb.run).toHaveBeenCalledWith(
                "UPDATE mangas SET anilist_id = ?, name = ?, chapter = ?, alert = ? WHERE id = ?",
                [updatedManga.anilist_id, updatedManga.name, updatedManga.chapter, updatedManga.alert, updatedManga.id]
            );
            expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM manga_sites WHERE manga_id = ?", [updatedManga.id]);
            expect(mockDb.run).toHaveBeenCalledWith("INSERT INTO manga_sites (manga_id, site_id) VALUES (?, ?)", [
                updatedManga.id,
                1,
            ]);
        });
    });

    describe("updateMangaChapter", () => {
        it("should update the chapter of an existing manga", async () => {
            const name = "Manga One";
            const chapter = "Chapter 20";

            mockDb.get.mockResolvedValueOnce({ id: 1 });
            mockDb.run.mockResolvedValueOnce(undefined);

            const date = new Date().toISOString();

            await updateMangaChapter(name, chapter, date);

            expect(mockDb.run).toHaveBeenCalledWith("UPDATE mangas SET chapter = ?, last_update = ? WHERE id = ?", [
                chapter,
                date,
                1,
            ]);
        });

        it("should not update a manga if it is not found", async () => {
            const name = "NonExistentManga";
            const chapter = "Chapter 20";

            mockDb.get.mockResolvedValueOnce(undefined);

            await updateMangaChapter(name, chapter, new Date().toISOString());

            expect(mockDb.run).not.toHaveBeenCalled();
        });
    });

    describe("deleteManga", () => {
        it("should delete an existing manga", async () => {
            const name = "Manga One";

            mockDb.get.mockResolvedValueOnce({ id: 1 });
            mockDb.run.mockResolvedValueOnce(undefined);

            await deleteManga(name);

            expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM mangas WHERE id = ?", [1]);
        });

        it("should not delete a manga if it is not found", async () => {
            const name = "NonExistentManga";

            mockDb.get.mockResolvedValueOnce(undefined);

            await deleteManga(name);

            expect(mockDb.run).not.toHaveBeenCalled();
        });
    });

    describe("deleteSiteFromManga", () => {
        it("should delete a site from an existing manga", async () => {
            const mangaName = "Manga One";
            const site: SiteInfo = {
                id: 1,
                site: "Site A",
                url: "https://site-a.com/",
                chapter_url: "https://site-a.com/chapters/",
                chapter_limiter: "",
            };

            mockDb.get.mockResolvedValueOnce({ id: 1 });

            await deleteSiteFromManga(mangaName, site);

            expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM manga_sites WHERE manga_id = ? AND site_id = ?", [
                1,
                site.id,
            ]);
        });

        it("should not delete a site if manga is not found", async () => {
            const mangaName = "NonExistentManga";
            const site: SiteInfo = {
                id: 1,
                site: "Site A",
                url: "https://site-a.com/",
                chapter_url: "https://site-a.com/chapters/",
                chapter_limiter: "",
            };

            mockDb.get.mockResolvedValueOnce(undefined);

            await deleteSiteFromManga(mangaName, site);

            expect(mockDb.run).not.toHaveBeenCalled();
        });
    });
});
