import { WidgetApi } from "matrix-widget-api";
import { MatrixClient, ICreateClientOpts } from "./client";
import { ICapabilities } from "./embedded";
import { CryptoStore } from "./crypto/store/base";
export * from "./client";
export * from "./embedded";
export * from "./http-api";
export * from "./autodiscovery";
export * from "./sync-accumulator";
export * from "./errors";
export * from "./models/beacon";
export * from "./models/event";
export * from "./models/room";
export * from "./models/event-timeline";
export * from "./models/event-timeline-set";
export * from "./models/room-member";
export * from "./models/room-state";
export * from "./models/user";
export * from "./scheduler";
export * from "./filter";
export * from "./timeline-window";
export * from "./interactive-auth";
export * from "./service-types";
export * from "./store/memory";
export * from "./store/indexeddb";
export * from "./crypto/store/memory-crypto-store";
export * from "./crypto/store/indexeddb-crypto-store";
export * from "./content-repo";
export * from "./@types/event";
export * from "./@types/PushRules";
export * from "./@types/partials";
export * from "./@types/requests";
export * from "./@types/search";
export * from "./models/room-summary";
export * as ContentHelpers from "./content-helpers";
export type { ICryptoCallbacks } from "./crypto";
export { createNewMatrixCall } from "./webrtc/call";
export type { MatrixCall } from "./webrtc/call";
export { GroupCallEvent, GroupCallIntent, GroupCallState, GroupCallType } from "./webrtc/groupCall";
export type { GroupCall } from "./webrtc/groupCall";
/**
 * Configure a different factory to be used for creating crypto stores
 *
 * @param fac - a function which will return a new {@link CryptoStore}
 */
export declare function setCryptoStoreFactory(fac: () => CryptoStore): void;
/**
 * Construct a Matrix Client. Similar to {@link MatrixClient}
 * except that the 'request', 'store' and 'scheduler' dependencies are satisfied.
 * @param opts - The configuration options for this client. These configuration
 * options will be passed directly to {@link MatrixClient}.
 *
 * @returns A new matrix client.
 * @see {@link MatrixClient} for the full list of options for
 * `opts`.
 */
export declare function createClient(opts: ICreateClientOpts): MatrixClient;
export declare function createRoomWidgetClient(widgetApi: WidgetApi, capabilities: ICapabilities, roomId: string, opts: ICreateClientOpts): MatrixClient;
//# sourceMappingURL=matrix.d.ts.map