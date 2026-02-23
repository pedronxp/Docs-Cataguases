export type Ok<T> = { readonly success: true; readonly data: T }
export type Err<E = string> = { readonly success: false; readonly error: E }
export type Result<T, E = string> = Ok<T> | Err<E>
export const ok = <T>(data: T): Ok<T> => ({ success: true, data })
export const err = <E = string>(error: E): Err<E> => ({ success: false, error })
export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.success
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.success
