import request from "supertest";

import { app } from "../src/app";
import { getDb } from "../src/db/dbConfig";

/**
 * Integration tests against a real in-memory SQLite database.
 *
 * The previous suites stubbed the model layer with jest.spyOn, so no SQL was ever
 * executed — which is exactly why the schema drift and the `/mangas/site/:name`
 * parameter bug went unnoticed.
 */
describe("GET /mangas", () => {
    it("returns the seeded mangas with their sites and tags", async () => {
        const response = await request(app).get("/mangas");

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThanOrEqual(4);

        const first = response.body.find((manga: { name: string }) => manga.name === "Manga One");
        expect(first.sites).toHaveLength(2);
        expect(first.infos.tags).toEqual([{ name: "Action" }]);
        // coverImage is a plain string, matching the TEXT column.
        expect(typeof first.infos.coverImage).toBe("string");
    });

    it("appends the manga slug to each site URL", async () => {
        const response = await request(app).get("/mangas/Manga%20One");

        expect(response.status).toBe(200);
        expect(response.body.sites[0].url).toBe("https://site-a.commanga-one");
    });

    it("answers 404 for an unknown manga instead of an empty 200", async () => {
        const response = await request(app).get("/mangas/Does%20Not%20Exist");

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NotFoundError");
    });
});

describe("GET /mangas/site/:name", () => {
    it("reads the path parameter and returns every manga on that site", async () => {
        const response = await request(app).get("/mangas/site/Site%20A");

        expect(response.status).toBe(200);
        // Site A hosts mangas 1, 2 and 4 — the old implementation read req.query.name
        // and always came back empty, and used db.get so only one row survived.
        expect(response.body.map((manga: { name: string }) => manga.name).sort()).toEqual([
            "Manga Four",
            "Manga One",
            "Manga Two",
        ]);
    });
});

describe("POST /mangas", () => {
    it("creates a manga with tags and links its sites", async () => {
        const db = await getDb();
        const site = await db.get<{ id: number }>("SELECT id FROM sites WHERE site = 'Site A'");

        const response = await request(app)
            .post("/mangas")
            .send({
                anilist_id: 99,
                name: "Created Manga",
                chapter: "1",
                sites: [{ id: site!.id, site: "Site A" }],
                infos: {
                    tags: [{ name: "Action" }, { name: "BrandNewTag" }],
                    description: "Fresh",
                    coverImage: { medium: "https://example.com/new.jpg" },
                },
            });

        expect(response.status).toBe(201);

        const created = await request(app).get("/mangas/Created%20Manga");
        expect(created.status).toBe(200);
        expect(created.body.sites).toHaveLength(1);
        expect(created.body.infos.tags.map((tag: { name: string }) => tag.name).sort()).toEqual([
            "Action",
            "BrandNewTag",
        ]);
        // The `{ medium }` object shape is normalised to the stored string.
        expect(created.body.infos.coverImage).toBe("https://example.com/new.jpg");
    });

    it("preserves alert: 0 instead of flipping it to 1", async () => {
        const response = await request(app)
            .post("/mangas")
            .send({ anilist_id: 100, name: "Silent Manga", chapter: "1", alert: 0, sites: [] });

        expect(response.status).toBe(201);

        const created = await request(app).get("/mangas/Silent%20Manga");
        expect(created.body.alert).toBe(0);
    });

    it("rejects an invalid payload with 400 rather than a 500 TypeError", async () => {
        const response = await request(app).post("/mangas").send({ name: "" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a duplicate name with 409", async () => {
        const payload = { anilist_id: 101, name: "Duplicate Manga", chapter: "1", sites: [] };

        expect((await request(app).post("/mangas").send(payload)).status).toBe(201);
        expect((await request(app).post("/mangas").send(payload)).status).toBe(409);
    });

    it("does not leave a half-created manga behind when a site id is bogus", async () => {
        const response = await request(app)
            .post("/mangas")
            .send({
                anilist_id: 102,
                name: "Rollback Manga",
                chapter: "1",
                sites: [{ id: 999999, site: "Ghost" }],
            });

        expect(response.status).toBe(500);

        // The transaction must have rolled the manga insert back too.
        const lookup = await request(app).get("/mangas/Rollback%20Manga");
        expect(lookup.status).toBe(404);
    });
});

describe("PUT /mangas/chapter", () => {
    it("updates the chapter and stamps last_update", async () => {
        const response = await request(app)
            .put("/mangas/chapter")
            .send({ name: "Manga Two", chapter: "21", last_updated: "2026-01-01T00:00:00.000Z" });

        expect(response.status).toBe(200);

        const updated = await request(app).get("/mangas/Manga%20Two");
        expect(updated.body.chapter).toBe("21");
        expect(updated.body.last_update).toBe("2026-01-01T00:00:00.000Z");
    });

    it("answers 404 for an unknown manga instead of reporting success", async () => {
        const response = await request(app).put("/mangas/chapter").send({ name: "Nope", chapter: "5" });

        expect(response.status).toBe(404);
    });
});

describe("DELETE /mangas", () => {
    it("removes the manga and its join rows", async () => {
        await request(app).post("/mangas").send({ anilist_id: 103, name: "Doomed", chapter: "1", sites: [] });

        const response = await request(app).delete("/mangas").query({ name: "Doomed" });
        expect(response.status).toBe(200);

        expect((await request(app).get("/mangas/Doomed")).status).toBe(404);
    });

    it("answers 404 rather than reporting a successful delete of nothing", async () => {
        const response = await request(app).delete("/mangas").query({ name: "Never Existed" });
        expect(response.status).toBe(404);
    });

    it("requires the name query parameter", async () => {
        const response = await request(app).delete("/mangas");
        expect(response.status).toBe(400);
    });
});

describe("error handling", () => {
    it("returns a JSON 404 for an unmatched route", async () => {
        const response = await request(app).get("/nope");

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("never leaks raw SQL error text to the client", async () => {
        const response = await request(app)
            .post("/mangas")
            .send({ anilist_id: 104, name: "Leaky", chapter: "1", sites: [{ id: 888888, site: "Ghost" }] });

        expect(response.status).toBe(500);
        expect(response.body.error.message).toBe("Internal server error");
        expect(JSON.stringify(response.body)).not.toMatch(/SQLITE_/);
    });
});

describe("manga status (must-watch)", () => {
    it("defaults to active when omitted", async () => {
        await request(app)
            .post("/mangas")
            .send({ anilist_id: 200, name: "Default Status", chapter: "1", sites: [] });

        const created = await request(app).get("/mangas/Default%20Status");
        expect(created.body.status).toBe("active");
    });

    it("stores a must_watch entry with alerts off", async () => {
        const response = await request(app)
            .post("/mangas")
            .send({ anilist_id: 201, name: "Backlog Manga", chapter: "0", alert: 0, status: "must_watch", sites: [] });

        expect(response.status).toBe(201);

        const created = await request(app).get("/mangas/Backlog%20Manga");
        expect(created.body.status).toBe("must_watch");
        expect(created.body.alert).toBe(0);
    });

    it("promotes a must_watch entry to active", async () => {
        const manga = (await request(app).get("/mangas/Backlog%20Manga")).body;

        const response = await request(app)
            .put("/mangas")
            .send({ ...manga, status: "active", alert: 1 });

        expect(response.status).toBe(200);

        const updated = await request(app).get("/mangas/Backlog%20Manga");
        expect(updated.body.status).toBe("active");
        expect(updated.body.alert).toBe(1);
    });

    it("rejects an unknown status with 400", async () => {
        const response = await request(app)
            .post("/mangas")
            .send({ anilist_id: 202, name: "Bad Status", chapter: "1", status: "someday", sites: [] });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
});
