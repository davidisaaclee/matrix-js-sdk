import { Optional } from "matrix-events-sdk";
import { MatrixEvent } from "./models/event";
/**
 * Internalises a string, reusing a known pointer or storing the pointer
 * if needed for future strings.
 * @param str - The string to internalise.
 * @returns The internalised string.
 */
export declare function internaliseString(str: string): string;
/**
 * Encode a dictionary of query parameters.
 * Omits any undefined/null values.
 * @param params - A dict of key/values to encode e.g.
 * `{"foo": "bar", "baz": "taz"}`
 * @returns The encoded string e.g. foo=bar&baz=taz
 */
export declare function encodeParams(params: QueryDict, urlSearchParams?: URLSearchParams): URLSearchParams;
export type QueryDict = Record<string, string[] | string | number | boolean | undefined>;
/**
 * Replace a stable parameter with the unstable naming for params
 */
export declare function replaceParam(stable: string, unstable: string, dict: QueryDict): QueryDict;
/**
 * Decode a query string in `application/x-www-form-urlencoded` format.
 * @param query - A query string to decode e.g.
 * foo=bar&via=server1&server2
 * @returns The decoded object, if any keys occurred multiple times
 * then the value will be an array of strings, else it will be an array.
 * This behaviour matches Node's qs.parse but is built on URLSearchParams
 * for native web compatibility
 */
export declare function decodeParams(query: string): Record<string, string | string[]>;
/**
 * Encodes a URI according to a set of template variables. Variables will be
 * passed through encodeURIComponent.
 * @param pathTemplate - The path with template variables e.g. '/foo/$bar'.
 * @param variables - The key/value pairs to replace the template
 * variables with. E.g. `{ "$bar": "baz" }`.
 * @returns The result of replacing all template variables e.g. '/foo/baz'.
 */
export declare function encodeUri(pathTemplate: string, variables: Record<string, Optional<string>>): string;
/**
 * The removeElement() method removes the first element in the array that
 * satisfies (returns true) the provided testing function.
 * @param array - The array.
 * @param fn - Function to execute on each value in the array, with the
 * function signature `fn(element, index, array)`. Return true to
 * remove this element and break.
 * @param reverse - True to search in reverse order.
 * @returns True if an element was removed.
 */
export declare function removeElement<T>(array: T[], fn: (t: T, i?: number, a?: T[]) => boolean, reverse?: boolean): boolean;
/**
 * Checks if the given thing is a function.
 * @param value - The thing to check.
 * @returns True if it is a function.
 */
export declare function isFunction(value: any): boolean;
/**
 * Checks that the given object has the specified keys.
 * @param obj - The object to check.
 * @param keys - The list of keys that 'obj' must have.
 * @throws If the object is missing keys.
 */
export declare function checkObjectHasKeys(obj: object, keys: string[]): void;
/**
 * Deep copy the given object. The object MUST NOT have circular references and
 * MUST NOT have functions.
 * @param obj - The object to deep copy.
 * @returns A copy of the object without any references to the original.
 */
export declare function deepCopy<T>(obj: T): T;
/**
 * Compare two objects for equality. The objects MUST NOT have circular references.
 *
 * @param x - The first object to compare.
 * @param y - The second object to compare.
 *
 * @returns true if the two objects are equal
 */
export declare function deepCompare(x: any, y: any): boolean;
/**
 * Creates an array of object properties/values (entries) then
 * sorts the result by key, recursively. The input object must
 * ensure it does not have loops. If the input is not an object
 * then it will be returned as-is.
 * @param obj - The object to get entries of
 * @returns The entries, sorted by key.
 */
export declare function deepSortedObjectEntries(obj: any): [string, any][];
/**
 * Returns whether the given value is a finite number without type-coercion
 *
 * @param value - the value to test
 * @returns whether or not value is a finite number without type-coercion
 */
export declare function isNumber(value: any): value is number;
/**
 * Removes zero width chars, diacritics and whitespace from the string
 * Also applies an unhomoglyph on the string, to prevent similar looking chars
 * @param str - the string to remove hidden characters from
 * @returns a string with the hidden characters removed
 */
export declare function removeHiddenChars(str: string): string;
/**
 * Removes the direction override characters from a string
 * @returns string with chars removed
 */
export declare function removeDirectionOverrideChars(str: string): string;
export declare function normalize(str: string): string;
export declare function escapeRegExp(string: string): string;
export declare function globToRegexp(glob: string, extended?: boolean): string;
export declare function ensureNoTrailingSlash(url: string): string;
export declare function ensureNoTrailingSlash(url: undefined): undefined;
export declare function ensureNoTrailingSlash(url?: string): string | undefined;
export declare function sleep<T>(ms: number, value?: T): Promise<T>;
export declare function isNullOrUndefined(val: any): boolean;
export interface IDeferred<T> {
    resolve: (value: T | Promise<T>) => void;
    reject: (reason?: any) => void;
    promise: Promise<T>;
}
export declare function defer<T = void>(): IDeferred<T>;
export declare function promiseMapSeries<T>(promises: Array<T | Promise<T>>, fn: (t: T) => Promise<unknown> | undefined): Promise<void>;
export declare function promiseTry<T>(fn: () => T | Promise<T>): Promise<T>;
export declare function chunkPromises<T>(fns: (() => Promise<T>)[], chunkSize: number): Promise<T[]>;
/**
 * Retries the function until it succeeds or is interrupted. The given function must return
 * a promise which throws/rejects on error, otherwise the retry will assume the request
 * succeeded. The promise chain returned will contain the successful promise. The given function
 * should always return a new promise.
 * @param promiseFn - The function to call to get a fresh promise instance. Takes an
 * attempt count as an argument, for logging/debugging purposes.
 * @returns The promise for the retried operation.
 */
export declare function simpleRetryOperation<T>(promiseFn: (attempt: number) => Promise<T>): Promise<T>;
/**
 * The default alphabet used by string averaging in this SDK. This matches
 * all usefully printable ASCII characters (0x20-0x7E, inclusive).
 */
export declare const DEFAULT_ALPHABET: string;
/**
 * Pads a string using the given alphabet as a base. The returned string will be
 * padded at the end with the first character in the alphabet.
 *
 * This is intended for use with string averaging.
 * @param s - The string to pad.
 * @param n - The length to pad to.
 * @param alphabet - The alphabet to use as a single string.
 * @returns The padded string.
 */
export declare function alphabetPad(s: string, n: number, alphabet?: string): string;
/**
 * Converts a baseN number to a string, where N is the alphabet's length.
 *
 * This is intended for use with string averaging.
 * @param n - The baseN number.
 * @param alphabet - The alphabet to use as a single string.
 * @returns The baseN number encoded as a string from the alphabet.
 */
export declare function baseToString(n: bigint, alphabet?: string): string;
/**
 * Converts a string to a baseN number, where N is the alphabet's length.
 *
 * This is intended for use with string averaging.
 * @param s - The string to convert to a number.
 * @param alphabet - The alphabet to use as a single string.
 * @returns The baseN number.
 */
export declare function stringToBase(s: string, alphabet?: string): bigint;
/**
 * Averages two strings, returning the midpoint between them. This is accomplished by
 * converting both to baseN numbers (where N is the alphabet's length) then averaging
 * those before re-encoding as a string.
 * @param a - The first string.
 * @param b - The second string.
 * @param alphabet - The alphabet to use as a single string.
 * @returns The midpoint between the strings, as a string.
 */
export declare function averageBetweenStrings(a: string, b: string, alphabet?: string): string;
/**
 * Finds the next string using the alphabet provided. This is done by converting the
 * string to a baseN number, where N is the alphabet's length, then adding 1 before
 * converting back to a string.
 * @param s - The string to start at.
 * @param alphabet - The alphabet to use as a single string.
 * @returns The string which follows the input string.
 */
export declare function nextString(s: string, alphabet?: string): string;
/**
 * Finds the previous string using the alphabet provided. This is done by converting the
 * string to a baseN number, where N is the alphabet's length, then subtracting 1 before
 * converting back to a string.
 * @param s - The string to start at.
 * @param alphabet - The alphabet to use as a single string.
 * @returns The string which precedes the input string.
 */
export declare function prevString(s: string, alphabet?: string): string;
/**
 * Compares strings lexicographically as a sort-safe function.
 * @param a - The first (reference) string.
 * @param b - The second (compare) string.
 * @returns Negative if the reference string is before the compare string;
 * positive if the reference string is after; and zero if equal.
 */
export declare function lexicographicCompare(a: string, b: string): number;
/**
 * Performant language-sensitive string comparison
 * @param a - the first string to compare
 * @param b - the second string to compare
 */
export declare function compare(a: string, b: string): number;
/**
 * This function is similar to Object.assign() but it assigns recursively and
 * allows you to ignore nullish values from the source
 *
 * @returns the target object
 */
export declare function recursivelyAssign<T1 extends T2, T2 extends Record<string, any>>(target: T1, source: T2, ignoreNullish?: boolean): T1 & T2;
/**
 * Sort events by their content m.ts property
 * Latest timestamp first
 */
export declare function sortEventsByLatestContentTimestamp(left: MatrixEvent, right: MatrixEvent): number;
export declare function isSupportedReceiptType(receiptType: string): boolean;
/**
 * Determines whether two maps are equal.
 * @param eq - The equivalence relation to compare values by. Defaults to strict equality.
 */
export declare function mapsEqual<K, V>(x: Map<K, V>, y: Map<K, V>, eq?: (v1: V, v2: V) => boolean): boolean;
//# sourceMappingURL=utils.d.ts.map