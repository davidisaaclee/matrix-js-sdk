import { MatrixClient } from "./client";
import { IRoomEvent, IStateEvent } from "./sync-accumulator";
import { TypedEventEmitter } from "./models/typed-event-emitter";
export declare const MSC3575_WILDCARD = "*";
export declare const MSC3575_STATE_KEY_ME = "$ME";
export declare const MSC3575_STATE_KEY_LAZY = "$LAZY";
/**
 * Represents a subscription to a room or set of rooms. Controls which events are returned.
 */
export interface MSC3575RoomSubscription {
    required_state?: string[][];
    timeline_limit?: number;
    include_old_rooms?: MSC3575RoomSubscription;
}
/**
 * Controls which rooms are returned in a given list.
 */
export interface MSC3575Filter {
    is_dm?: boolean;
    is_encrypted?: boolean;
    is_invite?: boolean;
    room_name_like?: string;
    room_types?: string[];
    not_room_types?: string[];
    spaces?: string[];
    tags?: string[];
    not_tags?: string[];
}
/**
 * Represents a list subscription.
 */
export interface MSC3575List extends MSC3575RoomSubscription {
    ranges: number[][];
    sort?: string[];
    filters?: MSC3575Filter;
    slow_get_all_rooms?: boolean;
}
/**
 * A complete Sliding Sync request.
 */
export interface MSC3575SlidingSyncRequest {
    lists?: MSC3575List[];
    unsubscribe_rooms?: string[];
    room_subscriptions?: Record<string, MSC3575RoomSubscription>;
    extensions?: object;
    txn_id?: string;
    pos?: string;
    timeout?: number;
    clientTimeout?: number;
}
export interface MSC3575RoomData {
    name: string;
    required_state: IStateEvent[];
    timeline: (IRoomEvent | IStateEvent)[];
    notification_count?: number;
    highlight_count?: number;
    joined_count?: number;
    invited_count?: number;
    invite_state?: IStateEvent[];
    initial?: boolean;
    limited?: boolean;
    is_dm?: boolean;
    prev_batch?: string;
    num_live?: number;
}
interface ListResponse {
    count: number;
    ops: Operation[];
}
interface BaseOperation {
    op: string;
}
interface DeleteOperation extends BaseOperation {
    op: "DELETE";
    index: number;
}
interface InsertOperation extends BaseOperation {
    op: "INSERT";
    index: number;
    room_id: string;
}
interface InvalidateOperation extends BaseOperation {
    op: "INVALIDATE";
    range: [number, number];
}
interface SyncOperation extends BaseOperation {
    op: "SYNC";
    range: [number, number];
    room_ids: string[];
}
type Operation = DeleteOperation | InsertOperation | InvalidateOperation | SyncOperation;
/**
 * A complete Sliding Sync response
 */
export interface MSC3575SlidingSyncResponse {
    pos: string;
    txn_id?: string;
    lists: ListResponse[];
    rooms: Record<string, MSC3575RoomData>;
    extensions: Record<string, object>;
}
export declare enum SlidingSyncState {
    /**
     * Fired by SlidingSyncEvent.Lifecycle event immediately before processing the response.
     */
    RequestFinished = "FINISHED",
    /**
     * Fired by SlidingSyncEvent.Lifecycle event immediately after all room data listeners have been
     * invoked, but before list listeners.
     */
    Complete = "COMPLETE"
}
/**
 * When onResponse extensions should be invoked: before or after processing the main response.
 */
export declare enum ExtensionState {
    PreProcess = "ExtState.PreProcess",
    PostProcess = "ExtState.PostProcess"
}
/**
 * An interface that must be satisfied to register extensions
 */
export interface Extension<Req extends {}, Res extends {}> {
    /**
     * The extension name to go under 'extensions' in the request body.
     * @returns The JSON key.
     */
    name(): string;
    /**
     * A function which is called when the request JSON is being formed.
     * Returns the data to insert under this key.
     * @param isInitial - True when this is part of the initial request (send sticky params)
     * @returns The request JSON to send.
     */
    onRequest(isInitial: boolean): Req | undefined;
    /**
     * A function which is called when there is response JSON under this extension.
     * @param data - The response JSON under the extension name.
     */
    onResponse(data: Res): void;
    /**
     * Controls when onResponse should be called.
     * @returns The state when it should be called.
     */
    when(): ExtensionState;
}
/**
 * Events which can be fired by the SlidingSync class. These are designed to provide different levels
 * of information when processing sync responses.
 *  - RoomData: concerns rooms, useful for SlidingSyncSdk to update its knowledge of rooms.
 *  - Lifecycle: concerns callbacks at various well-defined points in the sync process.
 *  - List: concerns lists, useful for UI layers to re-render room lists.
 * Specifically, the order of event invocation is:
 *  - Lifecycle (state=RequestFinished)
 *  - RoomData (N times)
 *  - Lifecycle (state=Complete)
 *  - List (at most once per list)
 */
export declare enum SlidingSyncEvent {
    /**
     * This event fires when there are updates for a room. Fired as and when rooms are encountered
     * in the response.
     */
    RoomData = "SlidingSync.RoomData",
    /**
     * This event fires at various points in the /sync loop lifecycle.
     *  - SlidingSyncState.RequestFinished: Fires after we receive a valid response but before the
     * response has been processed. Perform any pre-process steps here. If there was a problem syncing,
     * `err` will be set (e.g network errors).
     *  - SlidingSyncState.Complete: Fires after all SlidingSyncEvent.RoomData have been fired but before
     * SlidingSyncEvent.List.
     */
    Lifecycle = "SlidingSync.Lifecycle",
    /**
     * This event fires whenever there has been a change to this list index. It fires exactly once
     * per list, even if there were multiple operations for the list.
     * It fires AFTER Lifecycle and RoomData events.
     */
    List = "SlidingSync.List"
}
export type SlidingSyncEventHandlerMap = {
    [SlidingSyncEvent.RoomData]: (roomId: string, roomData: MSC3575RoomData) => void;
    [SlidingSyncEvent.Lifecycle]: (state: SlidingSyncState, resp: MSC3575SlidingSyncResponse | null, err?: Error) => void;
    [SlidingSyncEvent.List]: (listIndex: number, joinedCount: number, roomIndexToRoomId: Record<number, string>) => void;
};
/**
 * SlidingSync is a high-level data structure which controls the majority of sliding sync.
 * It has no hooks into JS SDK except for needing a MatrixClient to perform the HTTP request.
 * This means this class (and everything it uses) can be used in isolation from JS SDK if needed.
 * To hook this up with the JS SDK, you need to use SlidingSyncSdk.
 */
export declare class SlidingSync extends TypedEventEmitter<SlidingSyncEvent, SlidingSyncEventHandlerMap> {
    private readonly proxyBaseUrl;
    private roomSubscriptionInfo;
    private readonly client;
    private readonly timeoutMS;
    private lists;
    private listModifiedCount;
    private terminated;
    private needsResend;
    private txnId;
    private txnIdDefers;
    private extensions;
    private desiredRoomSubscriptions;
    private confirmedRoomSubscriptions;
    private customSubscriptions;
    private roomIdToCustomSubscription;
    private pendingReq?;
    private abortController?;
    /**
     * Create a new sliding sync instance
     * @param proxyBaseUrl - The base URL of the sliding sync proxy
     * @param lists - The lists to use for sliding sync.
     * @param roomSubscriptionInfo - The params to use for room subscriptions.
     * @param client - The client to use for /sync calls.
     * @param timeoutMS - The number of milliseconds to wait for a response.
     */
    constructor(proxyBaseUrl: string, lists: MSC3575List[], roomSubscriptionInfo: MSC3575RoomSubscription, client: MatrixClient, timeoutMS: number);
    /**
     * Add a custom room subscription, referred to by an arbitrary name. If a subscription with this
     * name already exists, it is replaced. No requests are sent by calling this method.
     * @param name - The name of the subscription. Only used to reference this subscription in
     * useCustomSubscription.
     * @param sub - The subscription information.
     */
    addCustomSubscription(name: string, sub: MSC3575RoomSubscription): void;
    /**
     * Use a custom subscription previously added via addCustomSubscription. No requests are sent
     * by calling this method. Use modifyRoomSubscriptions to resend subscription information.
     * @param roomId - The room to use the subscription in.
     * @param name - The name of the subscription. If this name is unknown, the default subscription
     * will be used.
     */
    useCustomSubscription(roomId: string, name: string): void;
    /**
     * Get the length of the sliding lists.
     * @returns The number of lists in the sync request
     */
    listLength(): number;
    /**
     * Get the room data for a list.
     * @param index - The list index
     * @returns The list data which contains the rooms in this list
     */
    getListData(index: number): {
        joinedCount: number;
        roomIndexToRoomId: Record<number, string>;
    } | null;
    /**
     * Get the full list parameters for a list index. This function is provided for callers to use
     * in conjunction with setList to update fields on an existing list.
     * @param index - The list index to get the list for.
     * @returns A copy of the list or undefined.
     */
    getList(index: number): MSC3575List | null;
    /**
     * Set new ranges for an existing list. Calling this function when _only_ the ranges have changed
     * is more efficient than calling setList(index,list) as this function won't resend sticky params,
     * whereas setList always will.
     * @param index - The list index to modify
     * @param ranges - The new ranges to apply.
     * @returns A promise which resolves to the transaction ID when it has been received down sync
     * (or rejects with the transaction ID if the action was not applied e.g the request was cancelled
     * immediately after sending, in which case the action will be applied in the subsequent request)
     */
    setListRanges(index: number, ranges: number[][]): Promise<string>;
    /**
     * Add or replace a list. Calling this function will interrupt the /sync request to resend new
     * lists.
     * @param index - The index to modify
     * @param list - The new list parameters.
     * @returns A promise which resolves to the transaction ID when it has been received down sync
     * (or rejects with the transaction ID if the action was not applied e.g the request was cancelled
     * immediately after sending, in which case the action will be applied in the subsequent request)
     */
    setList(index: number, list: MSC3575List): Promise<string>;
    /**
     * Get the room subscriptions for the sync API.
     * @returns A copy of the desired room subscriptions.
     */
    getRoomSubscriptions(): Set<string>;
    /**
     * Modify the room subscriptions for the sync API. Calling this function will interrupt the
     * /sync request to resend new subscriptions. If the /sync stream has not started, this will
     * prepare the room subscriptions for when start() is called.
     * @param s - The new desired room subscriptions.
     * @returns A promise which resolves to the transaction ID when it has been received down sync
     * (or rejects with the transaction ID if the action was not applied e.g the request was cancelled
     * immediately after sending, in which case the action will be applied in the subsequent request)
     */
    modifyRoomSubscriptions(s: Set<string>): Promise<string>;
    /**
     * Modify which events to retrieve for room subscriptions. Invalidates all room subscriptions
     * such that they will be sent up afresh.
     * @param rs - The new room subscription fields to fetch.
     * @returns A promise which resolves to the transaction ID when it has been received down sync
     * (or rejects with the transaction ID if the action was not applied e.g the request was cancelled
     * immediately after sending, in which case the action will be applied in the subsequent request)
     */
    modifyRoomSubscriptionInfo(rs: MSC3575RoomSubscription): Promise<string>;
    /**
     * Register an extension to send with the /sync request.
     * @param ext - The extension to register.
     */
    registerExtension(ext: Extension<any, any>): void;
    private getExtensionRequest;
    private onPreExtensionsResponse;
    private onPostExtensionsResponse;
    /**
     * Invoke all attached room data listeners.
     * @param roomId - The room which received some data.
     * @param roomData - The raw sliding sync response JSON.
     */
    private invokeRoomDataListeners;
    /**
     * Invoke all attached lifecycle listeners.
     * @param state - The Lifecycle state
     * @param resp - The raw sync response JSON
     * @param err - Any error that occurred when making the request e.g. network errors.
     */
    private invokeLifecycleListeners;
    private shiftRight;
    private shiftLeft;
    private removeEntry;
    private addEntry;
    private processListOps;
    /**
     * Resend a Sliding Sync request. Used when something has changed in the request. Resolves with
     * the transaction ID of this request on success. Rejects with the transaction ID of this request
     * on failure.
     */
    resend(): Promise<string>;
    private resolveTransactionDefers;
    /**
     * Stop syncing with the server.
     */
    stop(): void;
    /**
     * Re-setup this connection e.g in the event of an expired session.
     */
    private resetup;
    /**
     * Start syncing with the server. Blocks until stopped.
     */
    start(): Promise<void>;
}
export {};
//# sourceMappingURL=sliding-sync.d.ts.map