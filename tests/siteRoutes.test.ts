import request from "supertest";

import { app } from "../src/app";

describe("GET /sites", () => {
    it("returns the seeded sites", async () => {
        const response = await request(app).get("/sites");

        expect(response.status).toBe(200);
        expect(response.body.map((site: { site: string }) => site.site)).toEqual(
            expect.arrayContaining(["Site A", "Site B"])
        );
    });

    it("answers 404 for an unknown site instead of an empty 200", async () => {
        const response = await request(app).get("/sites/Nope");

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NotFoundError");
    });
});

describe("POST /sites", () => {
    const validSite = {
        site: "Site C",
        url: "https://site-c.com/manga/",
        chapter_url: "https://site-c.com/manga/",
        chapter_limiter: "/chapter-",
    };

    it("creates a site", async () => {
        const response = await request(app).post("/sites").send(validSite);

        expect(response.status).toBe(201);
        expect((await request(app).get("/sites/Site%20C")).status).toBe(200);
    });

    it("rejects a duplicate name with 409", async () => {
        // Duplicates used to be allowed, which silently corrupted every lookup keyed
        // on the site name.
        const response = await request(app).post("/sites").send(validSite);
        expect(response.status).toBe(409);
    });

    it("rejects a malformed URL with 400", async () => {
        const response = await request(app).post("/sites").send({ ...validSite, site: "Site D", url: "not-a-url" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a missing field with 400", async () => {
        const response = await request(app).post("/sites").send({ site: "Site E" });
        expect(response.status).toBe(400);
    });

    it("accepts an empty chapter_limiter", async () => {
        const response = await request(app)
            .post("/sites")
            .send({ site: "Site F", url: "https://site-f.com/", chapter_url: "https://site-f.com/", chapter_limiter: "" });

        expect(response.status).toBe(201);
    });
});

describe("PUT /sites", () => {
    it("answers 404 when no site matched instead of reporting success", async () => {
        const response = await request(app).put("/sites").send({
            site: "Ghost Site",
            url: "https://ghost.com/",
            chapter_url: "https://ghost.com/",
            chapter_limiter: "",
        });

        expect(response.status).toBe(404);
    });
});

describe("DELETE /sites", () => {
    it("removes the site and its manga links", async () => {
        const response = await request(app).delete("/sites").query({ name: "Site B" });
        expect(response.status).toBe(200);

        expect((await request(app).get("/sites/Site%20B")).status).toBe(404);

        // Manga Three was only on Site B, so it must now have no sites left.
        const manga = await request(app).get("/mangas/Manga%20Three");
        expect(manga.body.sites).toHaveLength(0);
    });

    it("answers 404 for an unknown site", async () => {
        const response = await request(app).delete("/sites").query({ name: "Never Existed" });
        expect(response.status).toBe(404);
    });
});
