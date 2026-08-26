import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodSchema } from "zod";

export interface Validated {
    body?: unknown;
    query?: unknown;
    params?: unknown;
}

/**
 * Parses whichever parts of the request the route declares, and stashes the typed
 * result on `res.locals.validated`.
 *
 * Controllers used to cast `req.body` straight to a domain type. Those types are
 * erased at runtime, so a missing field reached the SQL layer and came back as a 500
 * TypeError. A ZodError thrown here becomes a 400 in the error handler.
 */
export const validate =
    (schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }): RequestHandler =>
    (req: Request, res: Response, next: NextFunction) => {
        const validated: Validated = (res.locals.validated as Validated) ?? {};

        if (schemas.body) validated.body = schemas.body.parse(req.body);
        if (schemas.query) validated.query = schemas.query.parse(req.query);
        if (schemas.params) validated.params = schemas.params.parse(req.params);

        res.locals.validated = validated;
        next();
    };

export const body = <T>(res: Response): T => (res.locals.validated as Validated).body as T;
export const query = <T>(res: Response): T => (res.locals.validated as Validated).query as T;
export const params = <T>(res: Response): T => (res.locals.validated as Validated).params as T;
