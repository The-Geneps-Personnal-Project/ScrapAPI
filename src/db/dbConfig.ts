import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export const getDb = async (isTest = false): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
    if (!db) {
        db = await open({
            filename: isTest ? ":memory:" : "database.sqlite",
            driver: sqlite3.Database,
        });
    }

    if (isTest) initializeTestDb(db);

    return db;
};

export const initializeTestDb = async (db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> => {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS mangas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anilist_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      chapter TEXT,
      alert BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site TEXT NOT NULL,
      url TEXT NOT NULL,
      chapter_url TEXT NOT NULL,
      chapter_limiter TEXT NOT NULL,
    );

    CREATE TABLE IF NOT EXISTS manga_sites (
      manga_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      FOREIGN KEY (manga_id) REFERENCES mangas(id),
      FOREIGN KEY (site_id) REFERENCES sites(id),
      PRIMARY KEY (manga_id, site_id)
    );
  `);
};

export const closeDb = async (): Promise<void> => {
    if (db) {
        await db.close();
        db = null;
    }
};
