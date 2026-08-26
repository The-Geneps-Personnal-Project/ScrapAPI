import express from "express";
import { json, urlencoded } from "body-parser";
import { Server } from "http";
import cors from "cors";
import dotenv from "dotenv";
import pinoHttp from "pino-http";

import { closeDb, getDb } from "./db/dbConfig";
import siteRouter from "./routes/siteRoutes";
import mangaRouter from "./routes/mangaRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./logger";

dotenv.config({ path: ".env" });

const PORT = process.env.PORT || 8080;
let server: Server | undefined;

export const app = express();

app.use(pinoHttp({ logger, autoLogging: { ignore: req => req.url === "/health" } }));
app.use(cors());
app.use(json({ limit: "1mb" }));
app.use(urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/sites", siteRouter);
app.use("/mangas", mangaRouter);

// Order matters: 404 for unmatched routes, then the error handler last so it sees
// everything the routers throw. Neither was mounted before — errorHandler.ts existed
// but was never registered.
app.use(notFoundHandler);
app.use(errorHandler);

let shuttingDown = false;

/**
 * Closes the HTTP server and the database before exiting.
 *
 * The previous version dropped the promise returned by `closeDb()` and called
 * `process.exit(0)` from a `finally` block, so the SQLite connection was never
 * flushed. It also exited with code 0 on `uncaughtException`, reporting every crash
 * as a clean shutdown.
 */
export const shutdown = async (exitCode = 0): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
        if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
        await closeDb();
        logger.info("Shutdown complete");
    } catch (error) {
        logger.error({ err: error }, "Error during shutdown");
        exitCode = exitCode || 1;
    } finally {
        process.exit(exitCode);
    }
};

process.on("SIGTERM", () => void shutdown(0));
process.on("SIGINT", () => void shutdown(0));

process.on("uncaughtException", error => {
    logger.fatal({ err: error }, "Uncaught exception");
    void shutdown(1);
});

process.on("unhandledRejection", reason => {
    logger.fatal({ err: reason }, "Unhandled rejection");
    void shutdown(1);
});

if (process.env.NODE_ENV !== "test") {
    // Opened eagerly so migrations run (and fail loudly) at boot rather than on the
    // first request.
    void getDb()
        .then(() => {
            server = app.listen(PORT, () => logger.info(`Server is running on port ${PORT}`));
        })
        .catch(error => {
            logger.fatal({ err: error }, "Failed to initialise the database");
            process.exit(1);
        });
}

export { server };
