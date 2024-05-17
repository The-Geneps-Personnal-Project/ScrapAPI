import { getDb, closeDb } from "../src/db/dbConfig";

beforeAll(async () => {
    await getDb(true);
});

afterAll(async () => {
    await closeDb();
});
