import { TypedEventEmitter } from "../models/typed-event-emitter";
import { Method } from "./method";
import { HttpApiEvent, HttpApiEventHandlerMap, IHttpOpts, IRequestOpts } from "./interface";
import { QueryDict } from "../utils";
type Body = Record<string, any> | BodyInit;
interface TypedResponse<T> extends Response {
    json(): Promise<T>;
}
export type ResponseType<T, O extends IHttpOpts> = O extends undefined ? T : O extends {
    onlyData: true;
} ? T : TypedResponse<T>;
export declare class FetchHttpApi<O extends IHttpOpts> {
    private eventEmitter;
    readonly opts: O;
    private abortController;
    constructor(eventEmitter: TypedEventEmitter<HttpApiEvent, HttpApiEventHandlerMap>, opts: O);
    abort(): void;
    fetch(resource: URL | string, options?: RequestInit): ReturnType<typeof global.fetch>;
    /**
     * Sets the base URL for the identity server
     * @param url - The new base url
     */
    setIdBaseUrl(url: string): void;
    idServerRequest<T extends Record<string, unknown>>(method: Method, path: string, params: Record<string, string | string[]> | undefined, prefix: string, accessToken?: string): Promise<ResponseType<T, O>>;
    /**
     * Perform an authorised request to the homeserver.
     * @param method - The HTTP method e.g. "GET".
     * @param path - The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     *
     * @param queryParams - A dict of query params (these will NOT be
     * urlencoded). If unspecified, there will be no query params.
     *
     * @param body - The HTTP JSON body.
     *
     * @param opts - additional options. If a number is specified,
     * this is treated as `opts.localTimeoutMs`.
     *
     * @returns Promise which resolves to
     * ```
     * {
     *     data: {Object},
     *     headers: {Object},
     *     code: {Number},
     * }
     * ```
     * If `onlyData` is set, this will resolve to the `data` object only.
     * @returns Rejects with an error if a problem occurred.
     * This includes network problems and Matrix-specific error JSON.
     */
    authedRequest<T>(method: Method, path: string, queryParams?: QueryDict, body?: Body, opts?: IRequestOpts): Promise<ResponseType<T, O>>;
    /**
     * Perform a request to the homeserver without any credentials.
     * @param method - The HTTP method e.g. "GET".
     * @param path - The HTTP path <b>after</b> the supplied prefix e.g.
     * "/createRoom".
     *
     * @param queryParams - A dict of query params (these will NOT be
     * urlencoded). If unspecified, there will be no query params.
     *
     * @param body - The HTTP JSON body.
     *
     * @param opts - additional options
     *
     * @returns Promise which resolves to
     * ```
     * {
     *  data: {Object},
     *  headers: {Object},
     *  code: {Number},
     * }
     * ```
     * If `onlyData</code> is set, this will resolve to the <code>data`
     * object only.
     * @returns Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     */
    request<T>(method: Method, path: string, queryParams?: QueryDict, body?: Body, opts?: IRequestOpts): Promise<ResponseType<T, O>>;
    /**
     * Perform a request to an arbitrary URL.
     * @param method - The HTTP method e.g. "GET".
     * @param url - The HTTP URL object.
     *
     * @param body - The HTTP JSON body.
     *
     * @param opts - additional options
     *
     * @returns Promise which resolves to data unless `onlyData` is specified as false,
     * where the resolved value will be a fetch Response object.
     * @returns Rejects with an error if a problem
     * occurred. This includes network problems and Matrix-specific error JSON.
     */
    requestOtherUrl<T>(method: Method, url: URL | string, body?: Body, opts?: Pick<IRequestOpts, "headers" | "json" | "localTimeoutMs" | "keepAlive" | "abortSignal">): Promise<ResponseType<T, O>>;
    /**
     * Form and return a homeserver request URL based on the given path params and prefix.
     * @param path - The HTTP path <b>after</b> the supplied prefix e.g. "/createRoom".
     * @param queryParams - A dict of query params (these will NOT be urlencoded).
     * @param prefix - The full prefix to use e.g. "/_matrix/client/v2_alpha", defaulting to this.opts.prefix.
     * @param baseUrl - The baseUrl to use e.g. "https://matrix.org/", defaulting to this.opts.baseUrl.
     * @returns URL
     */
    getUrl(path: string, queryParams?: QueryDict, prefix?: string, baseUrl?: string): URL;
}
export {};
//# sourceMappingURL=fetch.d.ts.map