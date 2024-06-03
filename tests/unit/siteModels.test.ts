import { getDb } from "../../src/db/dbConfig";
import { getSites, getSiteFromName, addSite, updateSite, deleteSite, SiteInfo } from "../../src/models/siteModel";

// Mock the getDb function to return a mock database connection
jest.mock("../../src/db/dbConfig", () => ({
    getDb: jest.fn(),
}));

const mockDb = {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
};

describe("Site Model", () => {
    beforeAll(() => {
        (getDb as jest.Mock).mockResolvedValue(mockDb);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getSites", () => {
        it("should return a list of sites", async () => {
            mockDb.all.mockResolvedValueOnce([
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
                    chapter_limiter: "-chapter-",
                },
            ]);

            const sites = await getSites();

            expect(sites).toHaveLength(2);
            expect(sites[0]).toHaveProperty("site", "Site A");
            expect(sites[1]).toHaveProperty("site", "Site B");
        });

        it("should return an empty list if there are no sites", async () => {
            mockDb.all.mockResolvedValueOnce([]);

            const sites = await getSites();

            expect(sites).toHaveLength(0);
        });
    });

    describe("getSiteFromName", () => {
        it("should return a site by name", async () => {
            const name = "Site A";
            mockDb.get.mockResolvedValueOnce({
                id: 1,
                site: name,
                url: "https://site-a.com",
                chapter_url: "https://site-a.com/chapters",
                chapter_limiter: "/chapter-",
            });

            const site = await getSiteFromName(name);

            expect(site).toHaveProperty("site", name);
            expect(site).toHaveProperty("url", "https://site-a.com");
        });

        it("should return undefined if site is not found", async () => {
            const name = "NonExistentSite";
            mockDb.get.mockResolvedValueOnce(undefined);

            const site = await getSiteFromName(name);

            expect(site).toBeUndefined();
        });
    });

    describe("addSite", () => {
        it("should add a new site", async () => {
            const newSite: SiteInfo = {
                site: "Site C",
                url: "https://site-c.com",
                chapter_url: "https://site-c.com/chapters",
                chapter_limiter: "/chapter-",
            };

            mockDb.run.mockResolvedValueOnce(undefined);

            await addSite(newSite);

            expect(mockDb.run).toHaveBeenCalledWith(
                "INSERT INTO sites (site, url, chapter_url, chapter_limiter) VALUES (?, ?, ?, ?)",
                [newSite.site, newSite.url, newSite.chapter_url, newSite.chapter_limiter]
            );
        });
    });

    describe("updateSite", () => {
        it("should update an existing site", async () => {
            const updatedSite: SiteInfo = {
                site: "Site A",
                url: "https://site-a-updated.com",
                chapter_url: "https://site-a-updated.com/chapters",
                chapter_limiter: "/chapter-",
            };

            mockDb.run.mockResolvedValueOnce(undefined);

            await updateSite(updatedSite);

            expect(mockDb.run).toHaveBeenCalledWith(
                "UPDATE sites SET url = ?, chapter_limiter = ?, chapter_url = ? WHERE site = ?",
                [updatedSite.url, updatedSite.chapter_limiter, updatedSite.chapter_url, updatedSite.site]
            );
        });
    });

    describe("deleteSite", () => {
        it("should delete an existing site", async () => {
            const name = "Site A";

            mockDb.run.mockResolvedValueOnce(undefined);

            await deleteSite(name);

            expect(mockDb.run).toHaveBeenCalledWith("DELETE FROM sites WHERE site = ?", [name]);
        });
    });
});
