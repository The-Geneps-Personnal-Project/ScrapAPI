import sqlite3 from "sqlite3";
import { Database } from "sqlite";

import { logger } from "../logger";

type Db = Database<sqlite3.Database, sqlite3.Statement>;

interface Migration {
    id: number;
    name: string;
    up: (db: Db) => Promise<void>;
}

/**
 * Minimal forward-only migration runner.
 *
 * The schema had drifted badly because there was no runner at all: production was
 * evolved by hand with ALTER TABLE while `initializeTestDb` described a different,
 * older shape. Anything schema-related now goes here so both stay in step.
 */
const migrations: Migration[] = [
    {
        id: 1,
        name: "baseline schema",
        up: async db => {
            await db.exec(`
                CREATE TABLE IF NOT EXISTS mangas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    anilist_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    chapter TEXT,
                    alert BOOLEAN DEFAULT FALSE,
                    description TEXT,
                    coverImage TEXT,
                    last_update TEXT,
                    largeImage TEXT
                );

                CREATE TABLE IF NOT EXISTS sites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site TEXT NOT NULL,
                    url TEXT NOT NULL,
                    chapter_url TEXT NOT NULL,
                    chapter_limiter TEXT NOT NULL DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE
                );

                CREATE TABLE IF NOT EXISTS manga_sites (
                    manga_id INTEGER NOT NULL,
                    site_id INTEGER NOT NULL,
                    PRIMARY KEY (manga_id, site_id),
                    FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
                    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS manga_tags (
                    manga_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (manga_id, tag_id),
                    FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );
            `);
        },
    },
    {
        id: 2,
        name: "add columns missing from older databases",
        up: async db => {
            // Production gained these through ad-hoc ALTER TABLEs that never made it
            // into the checked-in schema.
            const columns = await db.all<{ name: string }[]>("PRAGMA table_info(mangas)");
            const present = new Set(columns.map(column => column.name));

            if (!present.has("last_update")) await db.exec("ALTER TABLE mangas ADD COLUMN last_update TEXT");
            if (!present.has("largeImage")) await db.exec("ALTER TABLE mangas ADD COLUMN largeImage TEXT");
        },
    },
    {
        id: 3,
        name: "rebuild join tables whose foreign keys pointed at dropped tables",
        up: async db => {
            // A botched table rebuild left manga_sites and manga_tags referencing
            // `mangas_old` / `sites_old`, which no longer exist. Harmless only while
            // foreign keys are off — every write would fail the moment they are on.
            for (const [table, columns, definition] of [
                [
                    "manga_sites",
                    "manga_id, site_id",
                    `CREATE TABLE manga_sites (
                        manga_id INTEGER NOT NULL,
                        site_id INTEGER NOT NULL,
                        PRIMARY KEY (manga_id, site_id),
                        FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
                        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
                    )`,
                ],
                [
                    "manga_tags",
                    "manga_id, tag_id",
                    `CREATE TABLE manga_tags (
                        manga_id INTEGER NOT NULL,
                        tag_id INTEGER NOT NULL,
                        PRIMARY KEY (manga_id, tag_id),
                        FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                    )`,
                ],
            ] as const) {
                const row = await db.get<{ sql: string } | undefined>(
                    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
                    [table]
                );

                if (!row?.sql?.includes("_old")) continue;

                logger.warn({ table }, "Rebuilding join table with corrected foreign keys");

                await db.exec(`
                    ALTER TABLE ${table} RENAME TO ${table}_broken;
                    ${definition};
                    INSERT OR IGNORE INTO ${table} (${columns}) SELECT ${columns} FROM ${table}_broken;
                    DROP TABLE ${table}_broken;
                `);
            }
        },
    },
    {
        id: 4,
        name: "index lookups by name",
        up: async db => {
            // Nearly every model function filters on these, and neither was indexed.
            await db.exec(`
                CREATE INDEX IF NOT EXISTS idx_mangas_name ON mangas(name);
                CREATE INDEX IF NOT EXISTS idx_sites_site ON sites(site);
                CREATE INDEX IF NOT EXISTS idx_manga_sites_site ON manga_sites(site_id);
                CREATE INDEX IF NOT EXISTS idx_manga_tags_tag ON manga_tags(tag_id);
            `);
        },
    },
];

export async function runMigrations(db: Db): Promise<void> {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);

    const applied = await db.all<{ id: number }[]>("SELECT id FROM schema_migrations");
    const done = new Set(applied.map(row => row.id));

    for (const migration of migrations) {
        if (done.has(migration.id)) continue;

        logger.info({ id: migration.id, name: migration.name }, "Applying migration");
        await migration.up(db);
        await db.run("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)", [
            migration.id,
            migration.name,
            new Date().toISOString(),
        ]);
    }
}
