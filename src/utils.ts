export type MaybePromise<T> = T | Promise<T>;
export type MaybeFunction<T> = T | (() => T);

export const extractValue = <T extends any>(value: MaybeFunction<T>): T =>
  typeof value === 'function' ? (value as () => T)() : value;
