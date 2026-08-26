import pino from "pino";

/**
 * The API previously had no logging at all: handled errors went to the client and
 * were never recorded server-side, so production 500s left no trace.
 */
// pino-pretty is a devDependency, so the transport is only wired up in development
// where it is guaranteed to be installed. Production emits plain JSON lines.
const pretty =
    process.env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } }
        : {};

export const logger = pino({
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    ...pretty,
});
