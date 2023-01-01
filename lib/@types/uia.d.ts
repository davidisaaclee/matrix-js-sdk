import { IAuthData } from "../interactive-auth";
/**
 * Helper type to represent HTTP request body for a UIA enabled endpoint
 */
export type UIARequest<T> = T & {
    auth?: IAuthData;
};
/**
 * Helper type to represent HTTP response body for a UIA enabled endpoint
 */
export type UIAResponse<T> = T | IAuthData;
//# sourceMappingURL=uia.d.ts.map