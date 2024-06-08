import request from "supertest";
import { Server } from "http";
import { app } from "../../src/app";
import { getDb, closeDb } from "../../src/db/dbConfig";
import * as siteModel from "../../src/models/siteModel";
import { SiteInfo } from "../../src/models/siteModel";

let server: Server;
let port: number;

beforeAll(async () => {
    await getDb(true);
});

afterAll(async () => {
    await closeDb();
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

describe("Site API", () => {
    it("should get all sites", async () => {
        const mockSites: SiteInfo[] = [
            {
                id: 1,
                site: "Site A",
                url: "https://site-a.com",
                chapter_url: "https://site-a.com/chapters",
                chapter_limiter: "/chapter-",
            },
            {
                id: 2,
                site: "Site B",
                url: "https://site-b.com",
                chapter_url: "https://site-b.com/chapters",
                chapter_limiter: "/chapter-",
            },
        ];

        jest.spyOn(siteModel, "getSites").mockResolvedValue(mockSites);

        const res = await request(`http://localhost:${port}`).get("/sites");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it("should return 404 if there are no sites", async () => {
        jest.spyOn(siteModel, "getSites").mockResolvedValue([]);

        const res = await request(`http://localhost:${port}`).get("/sites");
        expect(res.status).toBe(404);
        expect(res.text).toBe("No sites found");
    });

    it("should get a site by name", async () => {
        const mockSite: SiteInfo = {
            id: 1,
            site: "Site A",
            url: "https://site-a.com",
            chapter_url: "https://site-a.com/chapters",
            chapter_limiter: "/chapter-",
        };

        jest.spyOn(siteModel, "getSiteFromName").mockResolvedValue(mockSite);

        const res = await request(`http://localhost:${port}`).get("/sites/Site%20A");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("site", "Site A");
    });

    it("should return empty list for a non-existent site", async () => {
        jest.spyOn(siteModel, "getSiteFromName").mockResolvedValue(null as any);

        const res = await request(`http://localhost:${port}`).get("/sites/NonExistentSite");
        expect(res.body).toEqual({});
    });

    it("should create a new site", async () => {
        jest.spyOn(siteModel, "addSite").mockResolvedValue();

        const newSite: SiteInfo = {
            site: "Site C",
            url: "https://site-c.com",
            chapter_url: "https://site-c.com/chapters",
            chapter_limiter: "/chapter-",
        };
        const res = await request(`http://localhost:${port}`).post("/sites").send(newSite);
        expect(res.status).toBe(201);
        expect(res.text).toBe("Site added");

        const mockSites: SiteInfo[] = [
            {
                id: 1,
                site: "Site A",
                url: "https://site-a.com",
                chapter_url: "https://site-a.com/chapters",
                chapter_limiter: "/chapter-",
            },
            {
                id: 2,
                site: "Site B",
                url: "https://site-b.com",
                chapter_url: "https://site-b.com/chapters",
                chapter_limiter: "/chapter-",
            },
            {
                id: 3,
                site: "Site C",
                url: "https://site-c.com",
                chapter_url: "https://site-c.com/chapters",
                chapter_limiter: "/chapter-",
            },
        ];

        jest.spyOn(siteModel, "getSites").mockResolvedValue(mockSites);

        const getRes = await request(`http://localhost:${port}`).get("/sites");
        expect(getRes.body).toHaveLength(3);
    });

    it("should update an existing site", async () => {
        jest.spyOn(siteModel, "updateSite").mockResolvedValue();

        const updatedSite: SiteInfo = {
            site: "Site A",
            url: "https://site-a-updated.com",
            chapter_url: "https://site-a-updated.com/chapters",
            chapter_limiter: "/chapter-",
        };
        const res = await request(`http://localhost:${port}`).put("/sites").send(updatedSite);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Site updated");

        const mockSite: SiteInfo = {
            id: 1,
            site: "Site A",
            url: "https://site-a-updated.com",
            chapter_url: "https://site-a-updated.com/chapters",
            chapter_limiter: "/chapter-",
        };

        jest.spyOn(siteModel, "getSiteFromName").mockResolvedValue(mockSite);

        const getRes = await request(`http://localhost:${port}`).get("/sites/Site%20A");
        expect(getRes.body).toHaveProperty("url", "https://site-a-updated.com");
    });

    it("should delete a site", async () => {
        jest.spyOn(siteModel, "deleteSite").mockResolvedValue();

        const res = await request(`http://localhost:${port}`).delete("/sites").query({ name: "Site A" });
        expect(res.status).toBe(200);
        expect(res.text).toBe("Site deleted");

        jest.spyOn(siteModel, "getSiteFromName").mockResolvedValue(null as any);

        const getRes = await request(`http://localhost:${port}`).get("/sites/Site%20A");
        expect(getRes.body).toStrictEqual({});
    });

    describe("Error Handling", () => {
        beforeAll(() => {
            jest.spyOn(siteModel, "getSites").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(siteModel, "getSiteFromName").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(siteModel, "addSite").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(siteModel, "updateSite").mockImplementation(() => {
                throw new Error("Test Error");
            });
            jest.spyOn(siteModel, "deleteSite").mockImplementation(() => {
                throw new Error("Test Error");
            });
        });

        afterAll(() => {
            jest.restoreAllMocks();
        });

        it("should handle error in getSitesController", async () => {
            const res = await request(`http://localhost:${port}`).get("/sites");
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in getSiteFromNameController", async () => {
            const res = await request(`http://localhost:${port}`).get("/sites/Site%20A");
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in addSiteController", async () => {
            const newSite: SiteInfo = {
                site: "Site C",
                url: "https://site-c.com",
                chapter_url: "https://site-c.com/chapters",
                chapter_limiter: "/chapter-",
            };
            const res = await request(`http://localhost:${port}`).post("/sites").send(newSite);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in updateSiteController", async () => {
            const updatedSite: SiteInfo = {
                site: "Site A",
                url: "https://site-a-updated.com",
                chapter_url: "https://site-a-updated.com/chapters",
                chapter_limiter: "/chapter-",
            };
            const res = await request(`http://localhost:${port}`).put("/sites").send(updatedSite);
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });

        it("should handle error in deleteSiteController", async () => {
            const res = await request(`http://localhost:${port}`).delete("/sites").query({ name: "Site A" });
            expect(res.status).toBe(500);
            expect(res.text).toBe("Test Error");
        });
    });
});
