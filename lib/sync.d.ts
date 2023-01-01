import { Room } from "./models/room";
import { IStoredClientOpts, MatrixClient } from "./client";
import { MatrixEvent } from "./models/event";
export declare enum SyncState {
    /** Emitted after we try to sync more than `FAILED_SYNC_ERROR_THRESHOLD`
     * times and are still failing. Or when we enounter a hard error like the
     * token being invalid. */
    Error = "ERROR",
    /** Emitted after the first sync events are ready (this could even be sync
     * events from the cache) */
    Prepared = "PREPARED",
    /** Emitted when the sync loop is no longer running */
    Stopped = "STOPPED",
    /** Emitted after each sync request happens */
    Syncing = "SYNCING",
    /** Emitted after a connectivity error and we're ready to start syncing again */
    Catchup = "CATCHUP",
    /** Emitted for each time we try reconnecting. Will switch to `Error` after
     * we reach the `FAILED_SYNC_ERROR_THRESHOLD`
     */
    Reconnecting = "RECONNECTING"
}
export interface ISyncStateData {
    /**
     * The matrix error if `state=ERROR`.
     */
    error?: Error;
    /**
     * The 'since' token passed to /sync.
     *    `null` for the first successful sync since this client was
     *    started. Only present if `state=PREPARED` or
     *    `state=SYNCING`.
     */
    oldSyncToken?: string;
    /**
     * The 'next_batch' result from /sync, which
     *    will become the 'since' token for the next call to /sync. Only present if
     *    `state=PREPARED</code> or <code>state=SYNCING`.
     */
    nextSyncToken?: string;
    /**
     * True if we are working our way through a
     *    backlog of events after connecting. Only present if `state=SYNCING`.
     */
    catchingUp?: boolean;
    fromCache?: boolean;
}
export declare class SyncApi {
    private readonly client;
    private readonly opts;
    private _peekRoom;
    private currentSyncRequest?;
    private abortController?;
    private syncState;
    private syncStateData?;
    private catchingUp;
    private running;
    private keepAliveTimer?;
    private connectionReturnedDefer?;
    private notifEvents;
    private failedSyncCount;
    private storeIsInvalid;
    /**
     * Construct an entity which is able to sync with a homeserver.
     * @param client - The matrix client instance to use.
     * @param opts - Config options
     * @internal
     */
    constructor(client: MatrixClient, opts?: Partial<IStoredClientOpts>);
    createRoom(roomId: string): Room;
    /** When we see the marker state change in the room, we know there is some
     * new historical messages imported by MSC2716 `/batch_send` somewhere in
     * the room and we need to throw away the timeline to make sure the
     * historical messages are shown when we paginate `/messages` again.
     * @param room - The room where the marker event was sent
     * @param markerEvent - The new marker event
     * @param setStateOptions - When `timelineWasEmpty` is set
     * as `true`, the given marker event will be ignored
     */
    private onMarkerStateEvent;
    /**
     * Sync rooms the user has left.
     * @returns Resolved when they've been added to the store.
     */
    syncLeftRooms(): Promise<Room[]>;
    /**
     * Peek into a room. This will result in the room in question being synced so it
     * is accessible via getRooms(). Live updates for the room will be provided.
     * @param roomId - The room ID to peek into.
     * @returns A promise which resolves once the room has been added to the
     * store.
     */
    peek(roomId: string): Promise<Room>;
    /**
     * Stop polling for updates in the peeked room. NOPs if there is no room being
     * peeked.
     */
    stopPeeking(): void;
    /**
     * Do a peek room poll.
     * @param token - from= token
     */
    private peekPoll;
    /**
     * Returns the current state of this sync object
     * @see MatrixClient#event:"sync"
     */
    getSyncState(): SyncState | null;
    /**
     * Returns the additional data object associated with
     * the current sync state, or null if there is no
     * such data.
     * Sync errors, if available, are put in the 'error' key of
     * this object.
     */
    getSyncStateData(): ISyncStateData | null;
    recoverFromSyncStartupError(savedSyncPromise: Promise<void> | undefined, error: Error): Promise<void>;
    /**
     * Is the lazy loading option different than in previous session?
     * @param lazyLoadMembers - current options for lazy loading
     * @returns whether or not the option has changed compared to the previous session */
    private wasLazyLoadingToggled;
    private shouldAbortSync;
    private getPushRules;
    private buildDefaultFilter;
    private checkLazyLoadStatus;
    private getFilter;
    private savedSyncPromise?;
    /**
     * Main entry point
     */
    sync(): Promise<void>;
    /**
     * Stops the sync object from syncing.
     */
    stop(): void;
    /**
     * Retry a backed off syncing request immediately. This should only be used when
     * the user <b>explicitly</b> attempts to retry their lost connection.
     * @returns True if this resulted in a request being retried.
     */
    retryImmediately(): boolean;
    /**
     * Process a single set of cached sync data.
     * @param savedSync - a saved sync that was persisted by a store. This
     * should have been acquired via client.store.getSavedSync().
     */
    private syncFromCache;
    /**
     * Invoke me to do /sync calls
     */
    private doSync;
    private doSyncRequest;
    private getSyncParams;
    private onSyncError;
    /**
     * Process data returned from a sync response and propagate it
     * into the model objects
     *
     * @param syncEventData - Object containing sync tokens associated with this sync
     * @param data - The response from /sync
     */
    private processSyncResponse;
    /**
     * Starts polling the connectivity check endpoint
     * @param delay - How long to delay until the first poll.
     *        defaults to a short, randomised interval (to prevent
     *        tight-looping if /versions succeeds but /sync etc. fail).
     * @returns which resolves once the connection returns
     */
    private startKeepAlives;
    /**
     * Make a dummy call to /_matrix/client/versions, to see if the HS is
     * reachable.
     *
     * On failure, schedules a call back to itself. On success, resolves
     * this.connectionReturnedDefer.
     *
     * @param connDidFail - True if a connectivity failure has been detected. Optional.
     */
    private pokeKeepAlive;
    private mapSyncResponseToRoomArray;
    private mapSyncEventsFormat;
    /**
     */
    private resolveInvites;
    /**
     * Injects events into a room's model.
     * @param stateEventList - A list of state events. This is the state
     * at the *START* of the timeline list if it is supplied.
     * @param timelineEventList - A list of timeline events, including threaded. Lower index
     * is earlier in time. Higher index is later.
     * @param fromCache - whether the sync response came from cache
     */
    injectRoomEvents(room: Room, stateEventList: MatrixEvent[], timelineEventList?: MatrixEvent[], fromCache?: boolean): Promise<void>;
    /**
     * Takes a list of timelineEvents and adds and adds to notifEvents
     * as appropriate.
     * This must be called after the room the events belong to has been stored.
     *
     * @param timelineEventList - A list of timeline events. Lower index
     * is earlier in time. Higher index is later.
     */
    private processEventsForNotifs;
    private getGuestFilter;
    /**
     * Sets the sync state and emits an event to say so
     * @param newState - The new state string
     * @param data - Object of additional data to emit in the event
     */
    private updateSyncState;
    /**
     * Event handler for the 'online' event
     * This event is generally unreliable and precise behaviour
     * varies between browsers, so we poll for connectivity too,
     * but this might help us reconnect a little faster.
     */
    private onOnline;
}
export declare function _createAndReEmitRoom(client: MatrixClient, roomId: string, opts: Partial<IStoredClientOpts>): Room;
//# sourceMappingURL=sync.d.ts.map