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
      chapter_limiter TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manga_sites (
      manga_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      FOREIGN KEY (manga_id) REFERENCES mangas(id),
      FOREIGN KEY (site_id) REFERENCES sites(id),
      PRIMARY KEY (manga_id, site_id)
    );

    INSERT INTO sites (site, url, chapter_url, chapter_limiter) VALUES 
    ('Site A', 'https://site-a.com', 'https://site-a.com/chapters', '/chapter-'),
    ('Site B', 'https://site-b.com', 'https://site-b.com/chapters', '-chapter-');

    INSERT INTO mangas (anilist_id, name, chapter, alert) VALUES 
      (1, 'Manga One', 'Chapter 10', 0),
      (2, 'Manga Two', 'Chapter 20', 1),
      (3, 'Manga Three', 'Chapter 30', 0),
      (4, 'Manga Four', 'Chapter 40', 1);

    INSERT INTO manga_sites (manga_id, site_id) VALUES 
      (1, 1),
      (1, 2),
      (2, 1),
      (3, 2),
      (4, 1);
  `);
};

export const closeDb = async (): Promise<void> => {
    if (db) {
        await db.close();
        db = null;
    }
};
