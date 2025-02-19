/**
 * Thrown when no client could be found.
 */
export class ClientNotFoundError extends Error {
    constructor(message: string) {
        super(message);

        this.name = ClientNotFoundError.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
