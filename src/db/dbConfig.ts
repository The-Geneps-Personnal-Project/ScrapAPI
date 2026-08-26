import path from "path";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

import { runMigrations } from "./migrations";
import { logger } from "../logger";

export type Db = Database<sqlite3.Database, sqlite3.Statement>;

let db: Db | null = null;
// Shared so concurrent callers await one open instead of racing to open twice.
let opening: Promise<Db> | null = null;

/** True when the whole process is running under Jest, not just when a caller asks. */
const isTestEnv = () => process.env.NODE_ENV === "test";

function resolveFilename(isTest: boolean): string {
    // Checking NODE_ENV here too means requests served through `app` during tests hit
    // the in-memory database without every call site having to pass a flag.
    if (isTest || isTestEnv()) return ":memory:";

    const name = process.env.NODE_ENV === "development" ? process.env.DB_NAME_TEST : process.env.DB_NAME;

    if (!name) {
        throw new Error(
            `Database file is not configured: set ${
                process.env.NODE_ENV === "development" ? "DB_NAME_TEST" : "DB_NAME"
            } in your .env`
        );
    }

    // Resolved against the project root rather than process.cwd(). A relative name
    // used to silently create a brand new empty database when the process was
    // started from a different directory.
    return path.isAbsolute(name) ? name : path.resolve(__dirname, "..", "..", name);
}

export const getDb = async (isTest = false): Promise<Db> => {
    if (db) return db;
    if (opening) return opening;

    opening = (async () => {
        const filename = resolveFilename(isTest);
        const opened = await open({ filename, driver: sqlite3.Database });

        // Now safe to enforce: migration 3 rebuilds the join tables whose foreign keys
        // referenced dropped `*_old` tables.
        await opened.exec("PRAGMA foreign_keys = ON");
        await runMigrations(opened);

        if (isTest || isTestEnv()) await seedTestDb(opened);

        logger.info({ filename }, "Database ready");
        db = opened;
        return opened;
    })();

    try {
        return await opening;
    } finally {
        opening = null;
    }
};

/**
 * Fixture data for the in-memory test database.
 *
 * Schema creation now comes from the shared migrations, so tests and production can
 * no longer drift apart. This only inserts rows, and only into an empty database —
 * it used to run on *every* getDb(true) call and blow up on the UNIQUE constraint of
 * `tags.name` the second time around.
 */
export const seedTestDb = async (database: Db): Promise<void> => {
    const existing = await database.get<{ count: number }>("SELECT COUNT(*) as count FROM mangas");
    if ((existing?.count ?? 0) > 0) return;

    await database.exec(`
        INSERT INTO sites (site, url, chapter_url, chapter_limiter) VALUES
            ('Site A', 'https://site-a.com', 'https://site-a.com/chapters', '/chapter-'),
            ('Site B', 'https://site-b.com', 'https://site-b.com/chapters', '-chapter-');

        INSERT INTO mangas (anilist_id, name, chapter, alert, description, coverImage) VALUES
            (1, 'Manga One', 'Chapter 10', 0, 'Description One', 'https://example.com/cover1.jpg'),
            (2, 'Manga Two', 'Chapter 20', 1, 'Description Two', 'https://example.com/cover2.jpg'),
            (3, 'Manga Three', 'Chapter 30', 0, 'Description Three', 'https://example.com/cover3.jpg'),
            (4, 'Manga Four', 'Chapter 40', 1, 'Description Four', 'https://example.com/cover4.jpg');

        INSERT INTO manga_sites (manga_id, site_id) VALUES (1, 1), (1, 2), (2, 1), (3, 2), (4, 1);

        INSERT INTO tags (name) VALUES ('Action'), ('Adventure'), ('Comedy');

        INSERT INTO manga_tags (manga_id, tag_id) VALUES (1, 1), (2, 2), (3, 3), (4, 1);
    `);
};

export const closeDb = async (): Promise<void> => {
    if (!db) return;

    const closing = db;
    db = null;
    await closing.close();
};

/**
 * Runs `work` inside a transaction, rolling back on any failure.
 *
 * Multi-statement writes (creating a manga plus its sites and tags, deleting a manga
 * and its join rows) were previously issued one statement at a time, so a failure
 * halfway left the database inconsistent.
 */
export async function withTransaction<T>(work: (db: Db) => Promise<T>): Promise<T> {
    const database = await getDb();

    await database.exec("BEGIN");
    try {
        const result = await work(database);
        await database.exec("COMMIT");
        return result;
    } catch (error) {
        await database.exec("ROLLBACK").catch(() => undefined);
        throw error;
    }
}
