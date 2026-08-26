/**
 * Typed errors so controllers can express intent and the error handler can map that
 * to a status code.
 *
 * Previously every controller caught everything and answered 500 with the raw error
 * message, which both hid real outcomes ("not found" looked like "server broken") and
 * leaked internals such as `SQLITE_CONSTRAINT: UNIQUE constraint failed: tags.name`
 * to clients.
 */
export class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly details?: unknown
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class BadRequestError extends HttpError {
    constructor(message: string, details?: unknown) {
        super(400, message, details);
    }
}

export class NotFoundError extends HttpError {
    constructor(resource: string, identifier: string | number) {
        super(404, `${resource} '${identifier}' not found`);
    }
}

export class ConflictError extends HttpError {
    constructor(message: string) {
        super(409, message);
    }
}
