import { EventTimelineSet, DuplicateStrategy, IAddLiveEventOptions, EventTimelineSetHandlerMap } from "./event-timeline-set";
import { EventTimeline } from "./event-timeline";
import { MatrixEvent, MatrixEventEvent, MatrixEventHandlerMap } from "./event";
import { EventStatus } from "./event-status";
import { RoomMember } from "./room-member";
import { IRoomSummary, RoomSummary } from "./room-summary";
import { TypedReEmitter } from "../ReEmitter";
import { EventType, RoomType } from "../@types/event";
import { MatrixClient, PendingEventOrdering } from "../client";
import { GuestAccess, HistoryVisibility, JoinRule, ResizeMethod } from "../@types/partials";
import { Filter } from "../filter";
import { RoomState, RoomStateEvent, RoomStateEventHandlerMap } from "./room-state";
import { BeaconEvent, BeaconEventHandlerMap } from "./beacon";
import { Thread, ThreadEvent, EventHandlerMap as ThreadHandlerMap } from "./thread";
import { RelationsContainer } from "./relations-container";
import { ReadReceipt } from "./read-receipt";
export declare const KNOWN_SAFE_ROOM_VERSION = "9";
interface IOpts {
    /**
     * Controls where pending messages appear in a room's timeline.
     * If "<b>chronological</b>", messages will appear in the timeline when the call to `sendEvent` was made.
     * If "<b>detached</b>", pending messages will appear in a separate list,
     * accessible via {@link Room#getPendingEvents}.
     * Default: "chronological".
     */
    pendingEventOrdering?: PendingEventOrdering;
    /**
     * Set to true to enable improved timeline support.
     */
    timelineSupport?: boolean;
    lazyLoadMembers?: boolean;
}
export interface IRecommendedVersion {
    version: string;
    needsUpgrade: boolean;
    urgent: boolean;
}
export type NotificationCount = Partial<Record<NotificationCountType, number>>;
export declare enum NotificationCountType {
    Highlight = "highlight",
    Total = "total"
}
export interface ICreateFilterOpts {
    prepopulateTimeline?: boolean;
    useSyncEvents?: boolean;
    pendingEvents?: boolean;
}
export declare enum RoomEvent {
    MyMembership = "Room.myMembership",
    Tags = "Room.tags",
    AccountData = "Room.accountData",
    Receipt = "Room.receipt",
    Name = "Room.name",
    Redaction = "Room.redaction",
    RedactionCancelled = "Room.redactionCancelled",
    LocalEchoUpdated = "Room.localEchoUpdated",
    Timeline = "Room.timeline",
    TimelineReset = "Room.timelineReset",
    TimelineRefresh = "Room.TimelineRefresh",
    OldStateUpdated = "Room.OldStateUpdated",
    CurrentStateUpdated = "Room.CurrentStateUpdated",
    HistoryImportedWithinTimeline = "Room.historyImportedWithinTimeline",
    UnreadNotifications = "Room.UnreadNotifications"
}
export type RoomEmittedEvents = RoomEvent | RoomStateEvent.Events | RoomStateEvent.Members | RoomStateEvent.NewMember | RoomStateEvent.Update | RoomStateEvent.Marker | ThreadEvent.New | ThreadEvent.Update | ThreadEvent.NewReply | ThreadEvent.Delete | MatrixEventEvent.BeforeRedaction | BeaconEvent.New | BeaconEvent.Update | BeaconEvent.Destroy | BeaconEvent.LivenessChange;
export type RoomEventHandlerMap = {
    /**
     * Fires when the logged in user's membership in the room is updated.
     *
     * @param room - The room in which the membership has been updated
     * @param membership - The new membership value
     * @param prevMembership - The previous membership value
     */
    [RoomEvent.MyMembership]: (room: Room, membership: string, prevMembership?: string) => void;
    /**
     * Fires whenever a room's tags are updated.
     * @param event - The tags event
     * @param room - The room whose Room.tags was updated.
     * @example
     * ```
     * matrixClient.on("Room.tags", function(event, room){
     *   var newTags = event.getContent().tags;
     *   if (newTags["favourite"]) showStar(room);
     * });
     * ```
     */
    [RoomEvent.Tags]: (event: MatrixEvent, room: Room) => void;
    /**
     * Fires whenever a room's account_data is updated.
     * @param event - The account_data event
     * @param room - The room whose account_data was updated.
     * @param prevEvent - The event being replaced by
     * the new account data, if known.
     * @example
     * ```
     * matrixClient.on("Room.accountData", function(event, room, oldEvent){
     *   if (event.getType() === "m.room.colorscheme") {
     *       applyColorScheme(event.getContents());
     *   }
     * });
     * ```
     */
    [RoomEvent.AccountData]: (event: MatrixEvent, room: Room, lastEvent?: MatrixEvent) => void;
    /**
     * Fires whenever a receipt is received for a room
     * @param event - The receipt event
     * @param room - The room whose receipts was updated.
     * @example
     * ```
     * matrixClient.on("Room.receipt", function(event, room){
     *   var receiptContent = event.getContent();
     * });
     * ```
     */
    [RoomEvent.Receipt]: (event: MatrixEvent, room: Room) => void;
    /**
     * Fires whenever the name of a room is updated.
     * @param room - The room whose Room.name was updated.
     * @example
     * ```
     * matrixClient.on("Room.name", function(room){
     *   var newName = room.name;
     * });
     * ```
     */
    [RoomEvent.Name]: (room: Room) => void;
    /**
     * Fires when an event we had previously received is redacted.
     *
     * (Note this is *not* fired when the redaction happens before we receive the
     * event).
     *
     * @param event - The matrix redaction event
     * @param room - The room containing the redacted event
     */
    [RoomEvent.Redaction]: (event: MatrixEvent, room: Room) => void;
    /**
     * Fires when an event that was previously redacted isn't anymore.
     * This happens when the redaction couldn't be sent and
     * was subsequently cancelled by the user. Redactions have a local echo
     * which is undone in this scenario.
     *
     * @param event - The matrix redaction event that was cancelled.
     * @param room - The room containing the unredacted event
     */
    [RoomEvent.RedactionCancelled]: (event: MatrixEvent, room: Room) => void;
    /**
     * Fires when the status of a transmitted event is updated.
     *
     * <p>When an event is first transmitted, a temporary copy of the event is
     * inserted into the timeline, with a temporary event id, and a status of
     * 'SENDING'.
     *
     * <p>Once the echo comes back from the server, the content of the event
     * (MatrixEvent.event) is replaced by the complete event from the homeserver,
     * thus updating its event id, as well as server-generated fields such as the
     * timestamp. Its status is set to null.
     *
     * <p>Once the /send request completes, if the remote echo has not already
     * arrived, the event is updated with a new event id and the status is set to
     * 'SENT'. The server-generated fields are of course not updated yet.
     *
     * <p>If the /send fails, In this case, the event's status is set to
     * 'NOT_SENT'. If it is later resent, the process starts again, setting the
     * status to 'SENDING'. Alternatively, the message may be cancelled, which
     * removes the event from the room, and sets the status to 'CANCELLED'.
     *
     * <p>This event is raised to reflect each of the transitions above.
     *
     * @param event - The matrix event which has been updated
     *
     * @param room - The room containing the redacted event
     *
     * @param oldEventId - The previous event id (the temporary event id,
     *    except when updating a successfully-sent event when its echo arrives)
     *
     * @param oldStatus - The previous event status.
     */
    [RoomEvent.LocalEchoUpdated]: (event: MatrixEvent, room: Room, oldEventId?: string, oldStatus?: EventStatus | null) => void;
    [RoomEvent.OldStateUpdated]: (room: Room, previousRoomState: RoomState, roomState: RoomState) => void;
    [RoomEvent.CurrentStateUpdated]: (room: Room, previousRoomState: RoomState, roomState: RoomState) => void;
    [RoomEvent.HistoryImportedWithinTimeline]: (markerEvent: MatrixEvent, room: Room) => void;
    [RoomEvent.UnreadNotifications]: (unreadNotifications?: NotificationCount, threadId?: string) => void;
    [RoomEvent.TimelineRefresh]: (room: Room, eventTimelineSet: EventTimelineSet) => void;
    [ThreadEvent.New]: (thread: Thread, toStartOfTimeline: boolean) => void;
} & Pick<ThreadHandlerMap, ThreadEvent.Update | ThreadEvent.NewReply | ThreadEvent.Delete> & EventTimelineSetHandlerMap & Pick<MatrixEventHandlerMap, MatrixEventEvent.BeforeRedaction> & Pick<RoomStateEventHandlerMap, RoomStateEvent.Events | RoomStateEvent.Members | RoomStateEvent.NewMember | RoomStateEvent.Update | RoomStateEvent.Marker | BeaconEvent.New> & Pick<BeaconEventHandlerMap, BeaconEvent.Update | BeaconEvent.Destroy | BeaconEvent.LivenessChange>;
export declare class Room extends ReadReceipt<RoomEmittedEvents, RoomEventHandlerMap> {
    readonly roomId: string;
    readonly client: MatrixClient;
    readonly myUserId: string;
    private readonly opts;
    readonly reEmitter: TypedReEmitter<RoomEmittedEvents, RoomEventHandlerMap>;
    private txnToEvent;
    private notificationCounts;
    private readonly threadNotifications;
    readonly cachedThreadReadReceipts: Map<string, {
        event: MatrixEvent;
        synthetic: boolean;
    }[]>;
    private readonly timelineSets;
    readonly threadsTimelineSets: EventTimelineSet[];
    private readonly filteredTimelineSets;
    private timelineNeedsRefresh;
    private readonly pendingEventList?;
    private blacklistUnverifiedDevices?;
    private selfMembership?;
    private summaryHeroes;
    private getTypeWarning;
    private getVersionWarning;
    private membersPromise?;
    /**
     * The human-readable display name for this room.
     */
    name: string;
    /**
     * The un-homoglyphed name for this room.
     */
    normalizedName: string;
    /**
     * Dict of room tags; the keys are the tag name and the values
     * are any metadata associated with the tag - e.g. `{ "fav" : { order: 1 } }`
     */
    tags: Record<string, Record<string, any>>;
    /**
     * accountData Dict of per-room account_data events; the keys are the
     * event type and the values are the events.
     */
    accountData: Record<string, MatrixEvent>;
    /**
     * The room summary.
     */
    summary: RoomSummary | null;
    /**
     * The live event timeline for this room, with the oldest event at index 0.
     * Present for backwards compatibility - prefer getLiveTimeline().getEvents()
     */
    timeline: MatrixEvent[];
    /**
     * oldState The state of the room at the time of the oldest
     * event in the live timeline. Present for backwards compatibility -
     * prefer getLiveTimeline().getState(EventTimeline.BACKWARDS).
     */
    oldState: RoomState;
    /**
     * currentState The state of the room at the time of the
     * newest event in the timeline. Present for backwards compatibility -
     * prefer getLiveTimeline().getState(EventTimeline.FORWARDS).
     */
    currentState: RoomState;
    readonly relations: RelationsContainer;
    /**
     * @experimental
     */
    private threads;
    lastThread?: Thread;
    /**
     * A mapping of eventId to all visibility changes to apply
     * to the event, by chronological order, as per
     * https://github.com/matrix-org/matrix-doc/pull/3531
     *
     * # Invariants
     *
     * - within each list, all events are classed by
     *   chronological order;
     * - all events are events such that
     *  `asVisibilityEvent()` returns a non-null `IVisibilityChange`;
     * - within each list with key `eventId`, all events
     *   are in relation to `eventId`.
     *
     * @experimental
     */
    private visibilityEvents;
    /**
     * Construct a new Room.
     *
     * <p>For a room, we store an ordered sequence of timelines, which may or may not
     * be continuous. Each timeline lists a series of events, as well as tracking
     * the room state at the start and the end of the timeline. It also tracks
     * forward and backward pagination tokens, as well as containing links to the
     * next timeline in the sequence.
     *
     * <p>There is one special timeline - the 'live' timeline, which represents the
     * timeline to which events are being added in real-time as they are received
     * from the /sync API. Note that you should not retain references to this
     * timeline - even if it is the current timeline right now, it may not remain
     * so if the server gives us a timeline gap in /sync.
     *
     * <p>In order that we can find events from their ids later, we also maintain a
     * map from event_id to timeline and index.
     *
     * @param roomId - Required. The ID of this room.
     * @param client - Required. The client, used to lazy load members.
     * @param myUserId - Required. The ID of the syncing user.
     * @param opts - Configuration options
     */
    constructor(roomId: string, client: MatrixClient, myUserId: string, opts?: IOpts);
    private threadTimelineSetsPromise;
    createThreadsTimelineSets(): Promise<[EventTimelineSet, EventTimelineSet] | null>;
    /**
     * Bulk decrypt critical events in a room
     *
     * Critical events represents the minimal set of events to decrypt
     * for a typical UI to function properly
     *
     * - Last event of every room (to generate likely message preview)
     * - All events up to the read receipt (to calculate an accurate notification count)
     *
     * @returns Signals when all events have been decrypted
     */
    decryptCriticalEvents(): Promise<void>;
    /**
     * Bulk decrypt events in a room
     *
     * @returns Signals when all events have been decrypted
     */
    decryptAllEvents(): Promise<void>;
    /**
     * Gets the creator of the room
     * @returns The creator of the room, or null if it could not be determined
     */
    getCreator(): string | null;
    /**
     * Gets the version of the room
     * @returns The version of the room, or null if it could not be determined
     */
    getVersion(): string;
    /**
     * Determines whether this room needs to be upgraded to a new version
     * @returns What version the room should be upgraded to, or null if
     *     the room does not require upgrading at this time.
     * @deprecated Use #getRecommendedVersion() instead
     */
    shouldUpgradeToVersion(): string | null;
    /**
     * Determines the recommended room version for the room. This returns an
     * object with 3 properties: `version` as the new version the
     * room should be upgraded to (may be the same as the current version);
     * `needsUpgrade` to indicate if the room actually can be
     * upgraded (ie: does the current version not match?); and `urgent`
     * to indicate if the new version patches a vulnerability in a previous
     * version.
     * @returns
     * Resolves to the version the room should be upgraded to.
     */
    getRecommendedVersion(): Promise<IRecommendedVersion>;
    private checkVersionAgainstCapability;
    /**
     * Determines whether the given user is permitted to perform a room upgrade
     * @param userId - The ID of the user to test against
     * @returns True if the given user is permitted to upgrade the room
     */
    userMayUpgradeRoom(userId: string): boolean;
    /**
     * Get the list of pending sent events for this room
     *
     * @returns A list of the sent events
     * waiting for remote echo.
     *
     * @throws If `opts.pendingEventOrdering` was not 'detached'
     */
    getPendingEvents(): MatrixEvent[];
    /**
     * Removes a pending event for this room
     *
     * @returns True if an element was removed.
     */
    removePendingEvent(eventId: string): boolean;
    /**
     * Check whether the pending event list contains a given event by ID.
     * If pending event ordering is not "detached" then this returns false.
     *
     * @param eventId - The event ID to check for.
     */
    hasPendingEvent(eventId: string): boolean;
    /**
     * Get a specific event from the pending event list, if configured, null otherwise.
     *
     * @param eventId - The event ID to check for.
     */
    getPendingEvent(eventId: string): MatrixEvent | null;
    /**
     * Get the live unfiltered timeline for this room.
     *
     * @returns live timeline
     */
    getLiveTimeline(): EventTimeline;
    /**
     * Get the timestamp of the last message in the room
     *
     * @returns the timestamp of the last message in the room
     */
    getLastActiveTimestamp(): number;
    /**
     * @returns the membership type (join | leave | invite) for the logged in user
     */
    getMyMembership(): string;
    /**
     * If this room is a DM we're invited to,
     * try to find out who invited us
     * @returns user id of the inviter
     */
    getDMInviter(): string | undefined;
    /**
     * Assuming this room is a DM room, tries to guess with which user.
     * @returns user id of the other member (could be syncing user)
     */
    guessDMUserId(): string;
    getAvatarFallbackMember(): RoomMember | undefined;
    /**
     * Sets the membership this room was received as during sync
     * @param membership - join | leave | invite
     */
    updateMyMembership(membership: string): void;
    private loadMembersFromServer;
    private loadMembers;
    /**
     * Check if loading of out-of-band-members has completed
     *
     * @returns true if the full membership list of this room has been loaded (including if lazy-loading is disabled).
     *    False if the load is not started or is in progress.
     */
    membersLoaded(): boolean;
    /**
     * Preloads the member list in case lazy loading
     * of memberships is in use. Can be called multiple times,
     * it will only preload once.
     * @returns when preloading is done and
     * accessing the members on the room will take
     * all members in the room into account
     */
    loadMembersIfNeeded(): Promise<boolean>;
    /**
     * Removes the lazily loaded members from storage if needed
     */
    clearLoadedMembersIfNeeded(): Promise<void>;
    /**
     * called when sync receives this room in the leave section
     * to do cleanup after leaving a room. Possibly called multiple times.
     */
    private cleanupAfterLeaving;
    /**
     * Empty out the current live timeline and re-request it. This is used when
     * historical messages are imported into the room via MSC2716 `/batch_send`
     * because the client may already have that section of the timeline loaded.
     * We need to force the client to throw away their current timeline so that
     * when they back paginate over the area again with the historical messages
     * in between, it grabs the newly imported messages. We can listen for
     * `UNSTABLE_MSC2716_MARKER`, in order to tell when historical messages are ready
     * to be discovered in the room and the timeline needs a refresh. The SDK
     * emits a `RoomEvent.HistoryImportedWithinTimeline` event when we detect a
     * valid marker and can check the needs refresh status via
     * `room.getTimelineNeedsRefresh()`.
     */
    refreshLiveTimeline(): Promise<void>;
    /**
     * Reset the live timeline of all timelineSets, and start new ones.
     *
     * <p>This is used when /sync returns a 'limited' timeline.
     *
     * @param backPaginationToken -   token for back-paginating the new timeline
     * @param forwardPaginationToken - token for forward-paginating the old live timeline,
     * if absent or null, all timelines are reset, removing old ones (including the previous live
     * timeline which would otherwise be unable to paginate forwards without this token).
     * Removing just the old live timeline whilst preserving previous ones is not supported.
     */
    resetLiveTimeline(backPaginationToken?: string | null, forwardPaginationToken?: string | null): void;
    /**
     * Fix up this.timeline, this.oldState and this.currentState
     *
     * @internal
     */
    private fixUpLegacyTimelineFields;
    /**
     * Returns whether there are any devices in the room that are unverified
     *
     * Note: Callers should first check if crypto is enabled on this device. If it is
     * disabled, then we aren't tracking room devices at all, so we can't answer this, and an
     * error will be thrown.
     *
     * @returns the result
     */
    hasUnverifiedDevices(): Promise<boolean>;
    /**
     * Return the timeline sets for this room.
     * @returns array of timeline sets for this room
     */
    getTimelineSets(): EventTimelineSet[];
    /**
     * Helper to return the main unfiltered timeline set for this room
     * @returns room's unfiltered timeline set
     */
    getUnfilteredTimelineSet(): EventTimelineSet;
    /**
     * Get the timeline which contains the given event from the unfiltered set, if any
     *
     * @param eventId -  event ID to look for
     * @returns timeline containing
     * the given event, or null if unknown
     */
    getTimelineForEvent(eventId: string): EventTimeline | null;
    /**
     * Add a new timeline to this room's unfiltered timeline set
     *
     * @returns newly-created timeline
     */
    addTimeline(): EventTimeline;
    /**
     * Whether the timeline needs to be refreshed in order to pull in new
     * historical messages that were imported.
     * @param value - The value to set
     */
    setTimelineNeedsRefresh(value: boolean): void;
    /**
     * Whether the timeline needs to be refreshed in order to pull in new
     * historical messages that were imported.
     * @returns .
     */
    getTimelineNeedsRefresh(): boolean;
    /**
     * Get an event which is stored in our unfiltered timeline set, or in a thread
     *
     * @param eventId - event ID to look for
     * @returns the given event, or undefined if unknown
     */
    findEventById(eventId: string): MatrixEvent | undefined;
    /**
     * Get one of the notification counts for this room
     * @param type - The type of notification count to get. default: 'total'
     * @returns The notification count, or undefined if there is no count
     *                  for this type.
     */
    getUnreadNotificationCount(type?: NotificationCountType): number;
    /**
     * Get the notification for the event context (room or thread timeline)
     */
    getUnreadCountForEventContext(type: NotificationCountType | undefined, event: MatrixEvent): number;
    /**
     * Get one of the notification counts for this room
     * @param type - The type of notification count to get. default: 'total'
     * @returns The notification count, or undefined if there is no count
     *                  for this type.
     */
    getRoomUnreadNotificationCount(type?: NotificationCountType): number;
    /**
     * @experimental
     * Get one of the notification counts for a thread
     * @param threadId - the root event ID
     * @param type - The type of notification count to get. default: 'total'
     * @returns The notification count, or undefined if there is no count
     *          for this type.
     */
    getThreadUnreadNotificationCount(threadId: string, type?: NotificationCountType): number;
    /**
     * @experimental
     * Checks if the current room has unread thread notifications
     * @returns
     */
    hasThreadUnreadNotification(): boolean;
    /**
     * @experimental
     * Swet one of the notification count for a thread
     * @param threadId - the root event ID
     * @param type - The type of notification count to get. default: 'total'
     * @returns
     */
    setThreadUnreadNotificationCount(threadId: string, type: NotificationCountType, count: number): void;
    /**
     * @experimental
     * @returns the notification count type for all the threads in the room
     */
    get threadsAggregateNotificationType(): NotificationCountType | null;
    /**
     * @experimental
     * Resets the thread notifications for this room
     */
    resetThreadUnreadNotificationCount(notificationsToKeep?: string[]): void;
    /**
     * Set one of the notification counts for this room
     * @param type - The type of notification count to set.
     * @param count - The new count
     */
    setUnreadNotificationCount(type: NotificationCountType, count: number): void;
    setSummary(summary: IRoomSummary): void;
    /**
     * Whether to send encrypted messages to devices within this room.
     * @param value - true to blacklist unverified devices, null
     * to use the global value for this room.
     */
    setBlacklistUnverifiedDevices(value: boolean): void;
    /**
     * Whether to send encrypted messages to devices within this room.
     * @returns true if blacklisting unverified devices, null
     * if the global value should be used for this room.
     */
    getBlacklistUnverifiedDevices(): boolean | null;
    /**
     * Get the avatar URL for a room if one was set.
     * @param baseUrl - The homeserver base URL. See
     * {@link MatrixClient#getHomeserverUrl}.
     * @param width - The desired width of the thumbnail.
     * @param height - The desired height of the thumbnail.
     * @param resizeMethod - The thumbnail resize method to use, either
     * "crop" or "scale".
     * @param allowDefault - True to allow an identicon for this room if an
     * avatar URL wasn't explicitly set. Default: true. (Deprecated)
     * @returns the avatar URL or null.
     */
    getAvatarUrl(baseUrl: string, width: number, height: number, resizeMethod: ResizeMethod, allowDefault?: boolean): string | null;
    /**
     * Get the mxc avatar url for the room, if one was set.
     * @returns the mxc avatar url or falsy
     */
    getMxcAvatarUrl(): string | null;
    /**
     * Get this room's canonical alias
     * The alias returned by this function may not necessarily
     * still point to this room.
     * @returns The room's canonical alias, or null if there is none
     */
    getCanonicalAlias(): string | null;
    /**
     * Get this room's alternative aliases
     * @returns The room's alternative aliases, or an empty array
     */
    getAltAliases(): string[];
    /**
     * Add events to a timeline
     *
     * <p>Will fire "Room.timeline" for each event added.
     *
     * @param events - A list of events to add.
     *
     * @param toStartOfTimeline -   True to add these events to the start
     * (oldest) instead of the end (newest) of the timeline. If true, the oldest
     * event will be the <b>last</b> element of 'events'.
     *
     * @param timeline -   timeline to
     *    add events to.
     *
     * @param paginationToken -   token for the next batch of events
     *
     * @remarks
     * Fires {@link RoomEvent.Timeline}
     */
    addEventsToTimeline(events: MatrixEvent[], toStartOfTimeline: boolean, timeline: EventTimeline, paginationToken?: string): void;
    /**
     * @experimental
     */
    getThread(eventId: string): Thread | null;
    /**
     * @experimental
     */
    getThreads(): Thread[];
    /**
     * Get a member from the current room state.
     * @param userId - The user ID of the member.
     * @returns The member or `null`.
     */
    getMember(userId: string): RoomMember | null;
    /**
     * Get all currently loaded members from the current
     * room state.
     * @returns Room members
     */
    getMembers(): RoomMember[];
    /**
     * Get a list of members whose membership state is "join".
     * @returns A list of currently joined members.
     */
    getJoinedMembers(): RoomMember[];
    /**
     * Returns the number of joined members in this room
     * This method caches the result.
     * This is a wrapper around the method of the same name in roomState, returning
     * its result for the room's current state.
     * @returns The number of members in this room whose membership is 'join'
     */
    getJoinedMemberCount(): number;
    /**
     * Returns the number of invited members in this room
     * @returns The number of members in this room whose membership is 'invite'
     */
    getInvitedMemberCount(): number;
    /**
     * Returns the number of invited + joined members in this room
     * @returns The number of members in this room whose membership is 'invite' or 'join'
     */
    getInvitedAndJoinedMemberCount(): number;
    /**
     * Get a list of members with given membership state.
     * @param membership - The membership state.
     * @returns A list of members with the given membership state.
     */
    getMembersWithMembership(membership: string): RoomMember[];
    /**
     * Get a list of members we should be encrypting for in this room
     * @returns A list of members who
     * we should encrypt messages for in this room.
     */
    getEncryptionTargetMembers(): Promise<RoomMember[]>;
    /**
     * Determine whether we should encrypt messages for invited users in this room
     * @returns if we should encrypt messages for invited users
     */
    shouldEncryptForInvitedMembers(): boolean;
    /**
     * Get the default room name (i.e. what a given user would see if the
     * room had no m.room.name)
     * @param userId - The userId from whose perspective we want
     * to calculate the default name
     * @returns The default room name
     */
    getDefaultRoomName(userId: string): string;
    /**
     * Check if the given user_id has the given membership state.
     * @param userId - The user ID to check.
     * @param membership - The membership e.g. `'join'`
     * @returns True if this user_id has the given membership state.
     */
    hasMembershipState(userId: string, membership: string): boolean;
    /**
     * Add a timelineSet for this room with the given filter
     * @param filter - The filter to be applied to this timelineSet
     * @param opts - Configuration options
     * @returns The timelineSet
     */
    getOrCreateFilteredTimelineSet(filter: Filter, { prepopulateTimeline, useSyncEvents, pendingEvents }?: ICreateFilterOpts): EventTimelineSet;
    private getThreadListFilter;
    private createThreadTimelineSet;
    private threadsReady;
    /**
     * Takes the given thread root events and creates threads for them.
     */
    processThreadRoots(events: MatrixEvent[], toStartOfTimeline: boolean): void;
    /**
     * Fetch the bare minimum of room threads required for the thread list to work reliably.
     * With server support that means fetching one page.
     * Without server support that means fetching as much at once as the server allows us to.
     */
    fetchRoomThreads(): Promise<void>;
    /**
     * Fetch a single page of threadlist messages for the specific thread filter
     * @internal
     */
    private fetchRoomThreadList;
    private onThreadNewReply;
    private onThreadDelete;
    /**
     * Forget the timelineSet for this room with the given filter
     *
     * @param filter - the filter whose timelineSet is to be forgotten
     */
    removeFilteredTimelineSet(filter: Filter): void;
    eventShouldLiveIn(event: MatrixEvent, events?: MatrixEvent[], roots?: Set<string>): {
        shouldLiveInRoom: boolean;
        shouldLiveInThread: boolean;
        threadId?: string;
    };
    findThreadForEvent(event?: MatrixEvent): Thread | null;
    private addThreadedEvents;
    /**
     * Adds events to a thread's timeline. Will fire "Thread.update"
     * @experimental
     */
    processThreadedEvents(events: MatrixEvent[], toStartOfTimeline: boolean): void;
    private updateThreadRootEvents;
    private updateThreadRootEvent;
    createThread(threadId: string, rootEvent: MatrixEvent | undefined, events: MatrixEvent[] | undefined, toStartOfTimeline: boolean): Thread;
    private applyRedaction;
    private processLiveEvent;
    /**
     * Add an event to the end of this room's live timelines. Will fire
     * "Room.timeline".
     *
     * @param event - Event to be added
     * @param addLiveEventOptions - addLiveEvent options
     * @internal
     *
     * @remarks
     * Fires {@link RoomEvent.Timeline}
     */
    private addLiveEvent;
    /**
     * Add a pending outgoing event to this room.
     *
     * <p>The event is added to either the pendingEventList, or the live timeline,
     * depending on the setting of opts.pendingEventOrdering.
     *
     * <p>This is an internal method, intended for use by MatrixClient.
     *
     * @param event - The event to add.
     *
     * @param txnId - Transaction id for this outgoing event
     *
     * @throws if the event doesn't have status SENDING, or we aren't given a
     * unique transaction id.
     *
     * @remarks
     * Fires {@link RoomEvent.LocalEchoUpdated}
     */
    addPendingEvent(event: MatrixEvent, txnId: string): void;
    /**
     * Persists all pending events to local storage
     *
     * If the current room is encrypted only encrypted events will be persisted
     * all messages that are not yet encrypted will be discarded
     *
     * This is because the flow of EVENT_STATUS transition is
     * `queued => sending => encrypting => sending => sent`
     *
     * Steps 3 and 4 are skipped for unencrypted room.
     * It is better to discard an unencrypted message rather than persisting
     * it locally for everyone to read
     */
    private savePendingEvents;
    /**
     * Used to aggregate the local echo for a relation, and also
     * for re-applying a relation after it's redaction has been cancelled,
     * as the local echo for the redaction of the relation would have
     * un-aggregated the relation. Note that this is different from regular messages,
     * which are just kept detached for their local echo.
     *
     * Also note that live events are aggregated in the live EventTimelineSet.
     * @param event - the relation event that needs to be aggregated.
     */
    private aggregateNonLiveRelation;
    getEventForTxnId(txnId: string): MatrixEvent;
    /**
     * Deal with the echo of a message we sent.
     *
     * <p>We move the event to the live timeline if it isn't there already, and
     * update it.
     *
     * @param remoteEvent -   The event received from
     *    /sync
     * @param localEvent -    The local echo, which
     *    should be either in the pendingEventList or the timeline.
     *
     * @internal
     *
     * @remarks
     * Fires {@link RoomEvent.LocalEchoUpdated}
     */
    handleRemoteEcho(remoteEvent: MatrixEvent, localEvent: MatrixEvent): void;
    /**
     * Update the status / event id on a pending event, to reflect its transmission
     * progress.
     *
     * <p>This is an internal method.
     *
     * @param event -      local echo event
     * @param newStatus -  status to assign
     * @param newEventId -      new event id to assign. Ignored unless newStatus == EventStatus.SENT.
     *
     * @remarks
     * Fires {@link RoomEvent.LocalEchoUpdated}
     */
    updatePendingEvent(event: MatrixEvent, newStatus: EventStatus, newEventId?: string): void;
    private revertRedactionLocalEcho;
    /**
     * Add some events to this room. This can include state events, message
     * events and typing notifications. These events are treated as "live" so
     * they will go to the end of the timeline.
     *
     * @param events - A list of events to add.
     * @param addLiveEventOptions - addLiveEvent options
     * @throws If `duplicateStrategy` is not falsey, 'replace' or 'ignore'.
     */
    addLiveEvents(events: MatrixEvent[], addLiveEventOptions?: IAddLiveEventOptions): void;
    /**
     * @deprecated In favor of the overload with `IAddLiveEventOptions`
     */
    addLiveEvents(events: MatrixEvent[], duplicateStrategy?: DuplicateStrategy, fromCache?: boolean): void;
    partitionThreadedEvents(events: MatrixEvent[]): [timelineEvents: MatrixEvent[], threadedEvents: MatrixEvent[]];
    /**
     * Given some events, find the IDs of all the thread roots that are referred to by them.
     */
    private findThreadRoots;
    /**
     * Add a receipt event to the room.
     * @param event - The m.receipt event.
     * @param synthetic - True if this event is implicit.
     */
    addReceipt(event: MatrixEvent, synthetic?: boolean): void;
    /**
     * Adds/handles ephemeral events such as typing notifications and read receipts.
     * @param events - A list of events to process
     */
    addEphemeralEvents(events: MatrixEvent[]): void;
    /**
     * Removes events from this room.
     * @param eventIds - A list of eventIds to remove.
     */
    removeEvents(eventIds: string[]): void;
    /**
     * Removes a single event from this room.
     *
     * @param eventId -  The id of the event to remove
     *
     * @returns true if the event was removed from any of the room's timeline sets
     */
    removeEvent(eventId: string): boolean;
    /**
     * Recalculate various aspects of the room, including the room name and
     * room summary. Call this any time the room's current state is modified.
     * May fire "Room.name" if the room name is updated.
     *
     * @remarks
     * Fires {@link RoomEvent.Name}
     */
    recalculate(): void;
    /**
     * Update the room-tag event for the room.  The previous one is overwritten.
     * @param event - the m.tag event
     */
    addTags(event: MatrixEvent): void;
    /**
     * Update the account_data events for this room, overwriting events of the same type.
     * @param events - an array of account_data events to add
     */
    addAccountData(events: MatrixEvent[]): void;
    /**
     * Access account_data event of given event type for this room
     * @param type - the type of account_data event to be accessed
     * @returns the account_data event in question
     */
    getAccountData(type: EventType | string): MatrixEvent | undefined;
    /**
     * Returns whether the syncing user has permission to send a message in the room
     * @returns true if the user should be permitted to send
     *                   message events into the room.
     */
    maySendMessage(): boolean;
    /**
     * Returns whether the given user has permissions to issue an invite for this room.
     * @param userId - the ID of the Matrix user to check permissions for
     * @returns true if the user should be permitted to issue invites for this room.
     */
    canInvite(userId: string): boolean;
    /**
     * Returns the join rule based on the m.room.join_rule state event, defaulting to `invite`.
     * @returns the join_rule applied to this room
     */
    getJoinRule(): JoinRule;
    /**
     * Returns the history visibility based on the m.room.history_visibility state event, defaulting to `shared`.
     * @returns the history_visibility applied to this room
     */
    getHistoryVisibility(): HistoryVisibility;
    /**
     * Returns the history visibility based on the m.room.history_visibility state event, defaulting to `shared`.
     * @returns the history_visibility applied to this room
     */
    getGuestAccess(): GuestAccess;
    /**
     * Returns the type of the room from the `m.room.create` event content or undefined if none is set
     * @returns the type of the room.
     */
    getType(): RoomType | string | undefined;
    /**
     * Returns whether the room is a space-room as defined by MSC1772.
     * @returns true if the room's type is RoomType.Space
     */
    isSpaceRoom(): boolean;
    /**
     * Returns whether the room is a call-room as defined by MSC3417.
     * @returns true if the room's type is RoomType.UnstableCall
     */
    isCallRoom(): boolean;
    /**
     * Returns whether the room is a video room.
     * @returns true if the room's type is RoomType.ElementVideo
     */
    isElementVideoRoom(): boolean;
    private roomNameGenerator;
    /**
     * This is an internal method. Calculates the name of the room from the current
     * room state.
     * @param userId - The client's user ID. Used to filter room members
     * correctly.
     * @param ignoreRoomNameEvent - Return the implicit room name that we'd see if there
     * was no m.room.name event.
     * @returns The calculated room name.
     */
    private calculateRoomName;
    /**
     * When we receive a new visibility change event:
     *
     * - store this visibility change alongside the timeline, in case we
     *   later need to apply it to an event that we haven't received yet;
     * - if we have already received the event whose visibility has changed,
     *   patch it to reflect the visibility change and inform listeners.
     */
    private applyNewVisibilityEvent;
    private redactVisibilityChangeEvent;
    /**
     * When we receive an event whose visibility has been altered by
     * a (more recent) visibility change event, patch the event in
     * place so that clients now not to display it.
     *
     * @param event - Any matrix event. If this event has at least one a
     * pending visibility change event, apply the latest visibility
     * change event.
     */
    private applyPendingVisibilityEvents;
}
export declare enum RoomNameType {
    EmptyRoom = 0,
    Generated = 1,
    Actual = 2
}
export interface EmptyRoomNameState {
    type: RoomNameType.EmptyRoom;
    oldName?: string;
}
export interface GeneratedRoomNameState {
    type: RoomNameType.Generated;
    subtype?: "Inviting";
    names: string[];
    count: number;
}
export interface ActualRoomNameState {
    type: RoomNameType.Actual;
    name: string;
}
export type RoomNameState = EmptyRoomNameState | GeneratedRoomNameState | ActualRoomNameState;
export {};
//# sourceMappingURL=room.d.ts.map