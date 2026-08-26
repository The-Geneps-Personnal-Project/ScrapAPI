/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js"],
    testMatch: ["**/tests/**/*.test.ts"],
    // Was missing entirely, so tests/setup.ts was dead code.
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    // The database is a single shared in-memory connection; parallel workers would
    // fight over it.
    maxWorkers: 1,
};
