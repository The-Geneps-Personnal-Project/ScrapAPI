import request from "supertest";
import { Server } from "http";
import { app } from "../../src/app";
import { getDb, closeDb } from "../../src/db/dbConfig";

let server: Server;

beforeAll(async () => {
    await getDb(true); // Initialize the in-memory database for testing
    server = app.listen(0); // Listen on an ephemeral port
});

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
    });
    await closeDb(); // Close the database connection after all tests
});

describe("Site API", () => {
    it("should get all sites", async () => {
        const res = await request(app).get("/sites");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2); // Assuming there are 2 sites initially
    });

    it("should get a site by name", async () => {
        const res = await request(app).get("/sites/Site%20A");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("site", "Site A");
    });

    it("should return 404 for a non-existent site", async () => {
        const res = await request(app).get("/sites/NonExistentSite");
        expect(res.status).toBe(404);
        expect(res.text).toBe("Site not found");
    });

    it("should create a new site", async () => {
        const newSite = {
            site: "Site C",
            url: "https://site-c.com",
            chapter_url: "https://site-c.com/chapters",
            chapter_limiter: "/chapter-",
        };
        const res = await request(app).post("/sites").send(newSite);
        expect(res.status).toBe(201);
        expect(res.text).toBe("Site added");

        const getRes = await request(app).get("/sites");
        expect(getRes.body).toHaveLength(3); // Now there should be 3 sites
    });

    it("should update an existing site", async () => {
        const updatedSite = {
            site: "Site A",
            url: "https://site-a-updated.com",
            chapter_url: "https://site-a-updated.com/chapters",
            chapter_limiter: "/chapter-",
        };
        const res = await request(app).put("/sites").send(updatedSite);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Site updated");

        const getRes = await request(app).get("/sites/Site%20A");
        expect(getRes.body).toHaveProperty("url", "https://site-a-updated.com");
    });

    it("should delete a site", async () => {
        const res = await request(app).delete("/sites/Site%20A");
        expect(res.status).toBe(200);
        expect(res.text).toBe("Site deleted");

        const getRes = await request(app).get("/sites/Site%20A");
        expect(getRes.status).toBe(404);
    });
});
