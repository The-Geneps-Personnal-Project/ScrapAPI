import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export const getDb = async (): Promise<Database<sqlite3.Database, sqlite3.Statement>> => {
    if (!db) {
        db = await open({
            filename: "database.sqlite",
            driver: sqlite3.Database,
        });
    }
    return db;
};

export const closeDb = async (): Promise<void> => {
    if (db) {
        await db.close();
        db = null;
    }
};
