import { Optional } from "matrix-events-sdk";
import { MatrixClient, PendingEventOrdering } from "../client";
import { MatrixEvent } from "./event";
import { EventTimeline } from "./event-timeline";
import { EventTimelineSet, EventTimelineSetHandlerMap } from "./event-timeline-set";
import { Room, RoomEvent } from "./room";
import { RoomState } from "./room-state";
import { ServerControlledNamespacedValue } from "../NamespacedValue";
import { ReadReceipt } from "./read-receipt";
export declare enum ThreadEvent {
    New = "Thread.new",
    Update = "Thread.update",
    NewReply = "Thread.newReply",
    ViewThread = "Thread.viewThread",
    Delete = "Thread.delete"
}
type EmittedEvents = Exclude<ThreadEvent, ThreadEvent.New> | RoomEvent.Timeline | RoomEvent.TimelineReset;
export type EventHandlerMap = {
    [ThreadEvent.Update]: (thread: Thread) => void;
    [ThreadEvent.NewReply]: (thread: Thread, event: MatrixEvent) => void;
    [ThreadEvent.ViewThread]: () => void;
    [ThreadEvent.Delete]: (thread: Thread) => void;
} & EventTimelineSetHandlerMap;
interface IThreadOpts {
    room: Room;
    client: MatrixClient;
    pendingEventOrdering?: PendingEventOrdering;
    receipts?: {
        event: MatrixEvent;
        synthetic: boolean;
    }[];
}
export declare enum FeatureSupport {
    None = 0,
    Experimental = 1,
    Stable = 2
}
export declare function determineFeatureSupport(stable: boolean, unstable: boolean): FeatureSupport;
/**
 * @experimental
 */
export declare class Thread extends ReadReceipt<EmittedEvents, EventHandlerMap> {
    readonly id: string;
    rootEvent: MatrixEvent | undefined;
    static hasServerSideSupport: FeatureSupport;
    static hasServerSideListSupport: FeatureSupport;
    static hasServerSideFwdPaginationSupport: FeatureSupport;
    /**
     * A reference to all the events ID at the bottom of the threads
     */
    readonly timelineSet: EventTimelineSet;
    timeline: MatrixEvent[];
    private _currentUserParticipated;
    private reEmitter;
    private lastEvent;
    private replyCount;
    private lastPendingEvent;
    private pendingReplyCount;
    readonly room: Room;
    readonly client: MatrixClient;
    private readonly pendingEventOrdering;
    initialEventsFetched: boolean;
    /**
     * An array of events to add to the timeline once the thread has been initialised
     * with server suppport.
     */
    replayEvents: MatrixEvent[] | null;
    constructor(id: string, rootEvent: MatrixEvent | undefined, opts: IThreadOpts);
    private fetchRootEvent;
    static setServerSideSupport(status: FeatureSupport): void;
    static setServerSideListSupport(status: FeatureSupport): void;
    static setServerSideFwdPaginationSupport(status: FeatureSupport): void;
    private onBeforeRedaction;
    private onRedaction;
    private onTimelineEvent;
    private onLocalEcho;
    private onEcho;
    get roomState(): RoomState;
    private addEventToTimeline;
    addEvents(events: MatrixEvent[], toStartOfTimeline: boolean): void;
    /**
     * Add an event to the thread and updates
     * the tail/root references if needed
     * Will fire "Thread.update"
     * @param event - The event to add
     * @param toStartOfTimeline - whether the event is being added
     * to the start (and not the end) of the timeline.
     * @param emit - whether to emit the Update event if the thread was updated or not.
     */
    addEvent(event: MatrixEvent, toStartOfTimeline: boolean, emit?: boolean): Promise<void>;
    processEvent(event: Optional<MatrixEvent>): Promise<void>;
    /**
     * Processes the receipts that were caught during initial sync
     * When clients become aware of a thread, they try to retrieve those read receipts
     * and apply them to the current thread
     * @param receipts - A collection of the receipts cached from initial sync
     */
    private processReceipts;
    private getRootEventBundledRelationship;
    private processRootEvent;
    private updatePendingReplyCount;
    private updateThreadMetadata;
    private fetchEditsWhereNeeded;
    setEventMetadata(event: Optional<MatrixEvent>): void;
    clearEventMetadata(event: Optional<MatrixEvent>): void;
    /**
     * Finds an event by ID in the current thread
     */
    findEventById(eventId: string): MatrixEvent | undefined;
    /**
     * Return last reply to the thread, if known.
     */
    lastReply(matches?: (ev: MatrixEvent) => boolean): MatrixEvent | null;
    get roomId(): string;
    /**
     * The number of messages in the thread
     * Only count rel_type=m.thread as we want to
     * exclude annotations from that number
     */
    get length(): number;
    /**
     * A getter for the last event of the thread.
     * This might be a synthesized event, if so, it will not emit any events to listeners.
     */
    get replyToEvent(): Optional<MatrixEvent>;
    get events(): MatrixEvent[];
    has(eventId: string): boolean;
    get hasCurrentUserParticipated(): boolean;
    get liveTimeline(): EventTimeline;
    getUnfilteredTimelineSet(): EventTimelineSet;
    addReceipt(event: MatrixEvent, synthetic: boolean): void;
    hasUserReadEvent(userId: string, eventId: string): boolean;
}
export declare const FILTER_RELATED_BY_SENDERS: ServerControlledNamespacedValue<"related_by_senders", "io.element.relation_senders">;
export declare const FILTER_RELATED_BY_REL_TYPES: ServerControlledNamespacedValue<"related_by_rel_types", "io.element.relation_types">;
export declare const THREAD_RELATION_TYPE: ServerControlledNamespacedValue<"m.thread", "io.element.thread">;
export declare enum ThreadFilterType {
    "My" = 0,
    "All" = 1
}
export declare function threadFilterTypeToFilter(type: ThreadFilterType | null): "all" | "participated";
export {};
//# sourceMappingURL=thread.d.ts.map