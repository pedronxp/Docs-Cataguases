export type Result<T, E = string> =
    | { ok: true; value: T }
    | { ok: false; error: E };

export function ok<T>(value: T): Result<T, any> {
    return { ok: true, value };
}

export function err<E>(error: E): Result<any, E> {
    return { ok: false, error };
}
