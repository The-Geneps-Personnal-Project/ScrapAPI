import request from "supertest";
import { Server } from "http";
import { app } from "../../src/app";
import { getDb, closeDb } from "../../src/db/dbConfig";
import * as mangaModel from "../../src/models/mangaModel";
import * as siteModel from "../../src/models/siteModel";
import { MangaInfo } from "../../src/models/mangaModel";
import { SiteInfo } from "../../src/models/siteModel";

let server: Server;
let port: number;

beforeAll(async () => {
    await getDb(true); // Initialize the in-memory database for testing
});

afterAll(async () => {
    await closeDb(); // Close the database connection after all tests
});

beforeEach(done => {
    server = app.listen(0, () => {
        port = (server.address() as any).port;
        done();
    });
});

afterEach(done => {
    server.close(done);
});

describe("Manga API", () => {
    it("should get all mangas", async () => {
        const mockMangas: MangaInfo[] = [
            { id: 1, anilist_id: 1, name: "Manga One", chapter: "Chapter 1", alert: 0, sites: [] },
            { id: 2, anilist_id: 2, name: "Manga Two", chapter: "Chapter 2", alert: 1, sites: [] },
            { id: 3, anilist_id: 3, name: "Manga Three", chapter: "Chapter 3", alert: 0, sites: [] },
            { id: 4, anilist_id: 4, name: "Manga Four", chapter: "Chapter 4", alert: 1, sites: [] },
        ];

        jest.spyOn(mangaModel, "getMangaList").mockResolvedValue(mockMangas);

        const res = await request(`http://localhost:${port}`).get("/mangas");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(4); // Assuming there are 4 mangas initially
    });

    it("should get a manga by name", async () => {
        const mockManga: MangaInfo = {
            id: 1,
            anilist_id: 1,
            name: "Manga One",
            chapter: "Chapter 1",
            alert: 0,
            sites: [],
        };

        jest.spyOn(mangaModel, "getMangaFromName").mockResolvedValue(mockManga);

        const res = await request(`http://localhost:${port}`).get("/mangas/Manga%20One");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("name", "Manga One");
    });

    it("should return empty list for a non-existent manga", async () => {
        jest.spyOn(mangaModel, "getMangaFromName").mockResolvedValue(null);

        const res = await request(`http://localhost:${port}`).get("/mangas/NonExistentManga");
        expect(res.body).toEqual({});
    });

    it("should get mangas from a specific site", async () => {
        const mockMangas: MangaInfo[] = [
            { id: 1, anilist_id: 1, name: "Manga One", chapter: "Chapter 1", alert: 0, sites: [] },
            { id: 2, anilist_id: 2, name: "Manga Two", chapter: "Chapter 2", alert: 1, sites: [] },
        ];

        jest.spyOn(mangaModel, "getMangaFromSite").mockResolvedValue(mockMangas as any);

        const res = await request(`http://localhost:${port}`).get("/mangas/site/Site%20A");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2); // Assuming Site A has 2 mangas
    });

    it("should create a new manga", async () => {
        jest.spyOn(mangaModel, "addManga").mockResolvedValue();

        const newManga: MangaInfo = { anilist_id: 5, name: "Manga Five", chapter: "Chapter 50", alert: 0, sites: [] };
        const res = await request(`http://localhost:${port}`).post("/mangas").send(newManga);
        expect(res.status).toBe(201);
        expect(res.text).toBe("Manga added");

        const mockMangas: MangaInfo[] = [
            { id: 1, anilist_id: 1, name: "Manga One", chapter: "Chapter 1", alert: 0, sites: [] },
            { id: 2, anilist_id: 2, name: "Manga Two", chapter: "Chapter 2", alert: 1, sites: [] },
            { id: 3, anilist_id: 3, name: "Manga Three", chapter: "Chapter 3", alert: 0, sites: [] },
            { id: 4, anilist_id: 4, name: "Manga Four", chapter: "Chapter 4", alert: 1, sites: [] },
            { id: 5, anilist_id: 5, name: "Manga Five", chapter: "Chapter 50", alert: 0, sites: [] },
        ];

        jest.spyOn(mangaModel, "getMangaList").mockResolvedValue(mockMangas);

        const getRes = await request(`http://localhost:${port}`).get("/mangas");
        expect(getRes.body).toHaveLength(5); // Now there should be 5 mangas
    });

    it("should update an existing manga", async () => {
        jest.spyOn(mangaModel, "updateManga").mockResolvedValue();

        const updatedManga: MangaInfo = {
            id: 1,
            anilist_id: 1,
            name: "Manga One",
            chapter: "Chapter 15",
            alert: 1,
            sites: [],
        };
        const res = await request(`http://localhost:${port}`).put("/mangas").send(updatedManga);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Manga updated");

        const mockManga: MangaInfo = {
            id: 1,
            anilist_id: 1,
            name: "Manga One",
            chapter: "Chapter 15",
            alert: 1,
            sites: [],
        };

        jest.spyOn(mangaModel, "getMangaFromName").mockResolvedValue(mockManga);

        const getRes = await request(`http://localhost:${port}`).get("/mangas/Manga%20One");
        expect(getRes.body).toHaveProperty("chapter", "Chapter 15");
    });

    it("should update the chapter of an existing manga", async () => {
        jest.spyOn(mangaModel, "updateMangaChapter").mockResolvedValue();

        const updatedManga = { name: "Manga One", chapter: "Chapter 20" };
        const res = await request(`http://localhost:${port}`).put("/mangas/chapter").send(updatedManga);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Manga chapter updated");

        const mockManga: MangaInfo = {
            id: 1,
            anilist_id: 1,
            name: "Manga One",
            chapter: "Chapter 20",
            alert: 0,
            sites: [],
        };

        jest.spyOn(mangaModel, "getMangaFromName").mockResolvedValue(mockManga);

        const getRes = await request(`http://localhost:${port}`).get("/mangas/Manga%20One");
        expect(getRes.body).toHaveProperty("chapter", "Chapter 20");
    });

    it("should delete a manga", async () => {
        jest.spyOn(mangaModel, "deleteManga").mockResolvedValue();

        const res = await request(`http://localhost:${port}`).delete("/mangas/Manga%20One");
        expect(res.status).toBe(200);
        expect(res.text).toBe("Manga deleted");

        jest.spyOn(mangaModel, "getMangaFromName").mockResolvedValue(null);

        const getRes = await request(`http://localhost:${port}`).get("/mangas/Manga%20One");
        expect(getRes.body).toStrictEqual({});
    });

    it("should add a site to a manga", async () => {
        const mockSite: SiteInfo = {
            id: 1,
            site: "Site B",
            url: "https://site-b.com",
            chapter_url: "https://site-b.com/chapters",
            chapter_limiter: "/chapter-",
        };

        const mockMangas: MangaInfo = {
            id: 2,
            anilist_id: 2,
            name: "Manga Two",
            chapter: "Chapter 2",
            alert: 1,
            sites: [mockSite],
        };

        jest.spyOn(siteModel, "getSiteFromName").mockResolvedValue(mockSite);
        jest.spyOn(mangaModel, "addSiteToManga").mockResolvedValue();
        jest.spyOn(mangaModel, "getMangaFromSite").mockResolvedValue(mockMangas);

        const data = { manga: "Manga Two", site: "Site B" };
        const res = await request(`http://localhost:${port}`).post("/mangas/site").send(data);
        expect(res.status).toBe(201);
        expect(res.text).toBe("Site added to manga");

        const getRes = await request(`http://localhost:${port}`).get("/mangas/site/Manga%20Two");
        expect(getRes.body.sites).toHaveLength(1);
    });

    it("should delete a site from a manga", async () => {
        const mockSite: SiteInfo = {
            id: 1,
            site: "Site B",
            url: "https://site-b.com",
            chapter_url: "https://site-b.com/chapters",
            chapter_limiter: "/chapter-",
        };

        jest.spyOn(siteModel, "getSiteFromName").mockResolvedValue(mockSite);
        jest.spyOn(mangaModel, "deleteSiteFromManga").mockResolvedValue();

        const data = { manga: "Manga Two", site: "Site B" };
        const res = await request(`http://localhost:${port}`).delete("/mangas/site").send(data);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Site deleted from manga");

        const mockMangas: MangaInfo[] = [
            { id: 1, anilist_id: 1, name: "Manga One", chapter: "Chapter 1", alert: 0, sites: [] },
        ];

        jest.spyOn(mangaModel, "getMangaFromSite").mockResolvedValue(mockMangas as any);

        const getRes = await request(`http://localhost:${port}`).get("/mangas/site/Site%20B");
        expect(getRes.body).toHaveLength(1); // Assuming Site B now has 1 manga
    });

    describe("Error Handling", () => {
        beforeAll(() => {
            jest.spyOn(mangaModel, "getMangaList").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "getMangaFromName").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "getMangaFromSite").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "addManga").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "addSiteToManga").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "updateManga").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "updateMangaChapter").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "deleteManga").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(mangaModel, "deleteSiteFromManga").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(siteModel, "getSiteFromName").mockImplementation(() => {
                throw new Error("Test Error");
            });
        });

        afterAll(() => {
            jest.restoreAllMocks();
        });

        it("should handle error in getMangasController", async () => {
            const res = await request(`http://localhost:${port}`).get("/mangas");
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in getMangaFromNameController", async () => {
            const res = await request(`http://localhost:${port}`).get("/mangas/Manga%20One");
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in getMangaFromSiteController", async () => {
            const res = await request(`http://localhost:${port}`).get("/mangas/site/Site%20A");
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in addMangaController", async () => {
            const newManga = { anilist_id: 5, name: "Manga Five", chapter: "Chapter 50", alert: 0, sites: [] };
            const res = await request(`http://localhost:${port}`).post("/mangas").send(newManga);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in addSiteToMangaController", async () => {
            const data = { manga: "Manga Two", site: "Site B" };
            const res = await request(`http://localhost:${port}`).post("/mangas/site").send(data);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in updateMangaController", async () => {
            const updatedManga = { anilist_id: 1, name: "Manga One", chapter: "Chapter 15", alert: 1, sites: [] };
            const res = await request(`http://localhost:${port}`).put("/mangas").send(updatedManga);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in updateMangaChapterController", async () => {
            const updatedManga = { name: "Manga One", chapter: "Chapter 20" };
            const res = await request(`http://localhost:${port}`).put("/mangas/chapter").send(updatedManga);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in deleteMangaController", async () => {
            const res = await request(`http://localhost:${port}`).delete("/mangas/Manga%20One");
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in deleteSiteFromMangaController", async () => {
            const data = { manga: "Manga Two", site: "Site B" };
            const res = await request(`http://localhost:${port}`).delete("/mangas/site").send(data);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });
    });
});
