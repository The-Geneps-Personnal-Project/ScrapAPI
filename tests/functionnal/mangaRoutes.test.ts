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

describe("Manga API", () => {
    it("should get all mangas", async () => {
        const res = await request(app).get("/mangas");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(4); // Assuming there are 4 mangas initially
    });

    it("should get a manga by name", async () => {
        const res = await request(app).get("/mangas/Manga%20One");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("name", "Manga One");
    });

    it("should return 404 for a non-existent manga", async () => {
        const res = await request(app).get("/mangas/NonExistentManga");
        expect(res.status).toBe(404);
        expect(res.text).toBe("Manga not found");
    });

    it("should get mangas from a specific site", async () => {
        const res = await request(app).get("/mangas/site/Site%20A");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2); // Assuming Site A has 2 mangas
    });

    it("should create a new manga", async () => {
        const newManga = { anilist_id: 5, name: "Manga Five", chapter: "Chapter 50", alert: false };
        const res = await request(app).post("/mangas").send(newManga);
        expect(res.status).toBe(201);
        expect(res.text).toBe("Manga added");

        const getRes = await request(app).get("/mangas");
        expect(getRes.body).toHaveLength(5); // Now there should be 5 mangas
    });

    it("should update an existing manga", async () => {
        const updatedManga = { anilist_id: 1, name: "Manga One", chapter: "Chapter 15", alert: true };
        const res = await request(app).put("/mangas").send(updatedManga);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Manga updated");

        const getRes = await request(app).get("/mangas/Manga%20One");
        expect(getRes.body).toHaveProperty("chapter", "Chapter 15");
    });

    it("should delete a manga", async () => {
        const res = await request(app).delete("/mangas/Manga%20One");
        expect(res.status).toBe(200);
        expect(res.text).toBe("Manga deleted");

        const getRes = await request(app).get("/mangas/Manga%20One");
        expect(getRes.status).toBe(404);
    });

    it("should add a site to a manga", async () => {
        const data = { manga: "Manga Two", site: "Site B" };
        const res = await request(app).post("/mangas/site").send(data);
        expect(res.status).toBe(201);
        expect(res.text).toBe("Site added to manga");

        const getRes = await request(app).get("/mangas/site/Site%20B");
        expect(getRes.body).toHaveLength(2); // Assuming Site B now has 2 mangas
    });

    it("should delete a site from a manga", async () => {
        const data = { manga: "Manga Two", site: "Site B" };
        const res = await request(app).delete("/mangas/site").send(data);
        expect(res.status).toBe(200);
        expect(res.text).toBe("Site deleted from manga");

        const getRes = await request(app).get("/mangas/site/Site%20B");
        expect(getRes.body).toHaveLength(1); // Assuming Site B now has 1 manga
    });
});
