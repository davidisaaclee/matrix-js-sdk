export interface IIdentityServerProvider {
    /**
     * Gets an access token for use against the identity server,
     * for the associated client.
     * @returns Promise which resolves to the access token.
     */
    getAccessToken(): Promise<string>;
}
//# sourceMappingURL=IIdentityServerProvider.d.ts.map