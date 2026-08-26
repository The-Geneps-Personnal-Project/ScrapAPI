import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

import { HttpError } from "../errors";
import { logger } from "../logger";

/**
 * Wraps an async handler so a rejected promise reaches Express's error pipeline.
 *
 * Express 4 does not catch rejections from async handlers on its own — without this,
 * a throwing controller hangs the request instead of returning a response.
 */
export const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: `Cannot ${req.method} ${req.path}` } });
};

/** `_next` is unused but required: Express identifies error middleware by its 4-argument arity. */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
        logger.warn({ path: req.path, issues: err.issues }, "Request validation failed");
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request payload",
                details: err.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
            },
        });
        return;
    }

    if (err instanceof HttpError) {
        // Client errors are expected traffic; only 5xx deserves an error-level log.
        const log = err.status >= 500 ? logger.error : logger.warn;
        log.call(logger, { path: req.path, status: err.status, err: err.message }, "Request failed");

        res.status(err.status).json({
            error: { code: err.name, message: err.message, ...(err.details ? { details: err.details } : {}) },
        });
        return;
    }

    // Anything unrecognised is a bug. Log it in full, tell the client nothing.
    logger.error({ path: req.path, err }, "Unhandled error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
};
