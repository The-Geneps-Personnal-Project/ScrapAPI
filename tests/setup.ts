import { closeDb, getDb } from "../src/db/dbConfig";

/**
 * Wired up through `setupFilesAfterEach` in jest.config.js.
 *
 * The old tests/setup.ts was never referenced by the Jest config, so it never ran and
 * each suite duplicated this logic inline.
 */
beforeAll(async () => {
    await getDb(true);
});

afterAll(async () => {
    await closeDb();
});
