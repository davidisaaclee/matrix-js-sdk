import { CachedReceipt, Receipt, ReceiptType, WrappedReceipt } from "../@types/read_receipts";
import { ListenerMap, TypedEventEmitter } from "./typed-event-emitter";
import { MatrixEvent } from "./event";
import { EventTimelineSet } from "./event-timeline-set";
export declare function synthesizeReceipt(userId: string, event: MatrixEvent, receiptType: ReceiptType): MatrixEvent;
export declare abstract class ReadReceipt<Events extends string, Arguments extends ListenerMap<Events>, SuperclassArguments extends ListenerMap<any> = Arguments> extends TypedEventEmitter<Events, Arguments, SuperclassArguments> {
    private receipts;
    private receiptCacheByEventId;
    abstract getUnfilteredTimelineSet(): EventTimelineSet;
    abstract timeline: MatrixEvent[];
    /**
     * Gets the latest receipt for a given user in the room
     * @param userId - The id of the user for which we want the receipt
     * @param ignoreSynthesized - Whether to ignore synthesized receipts or not
     * @param receiptType - Optional. The type of the receipt we want to get
     * @returns the latest receipts of the chosen type for the chosen user
     */
    getReadReceiptForUserId(userId: string, ignoreSynthesized?: boolean, receiptType?: ReceiptType): WrappedReceipt | null;
    /**
     * Get the ID of the event that a given user has read up to, or null if we
     * have received no read receipts from them.
     * @param userId - The user ID to get read receipt event ID for
     * @param ignoreSynthesized - If true, return only receipts that have been
     *                                    sent by the server, not implicit ones generated
     *                                    by the JS SDK.
     * @returns ID of the latest event that the given user has read, or null.
     */
    getEventReadUpTo(userId: string, ignoreSynthesized?: boolean): string | null;
    addReceiptToStructure(eventId: string, receiptType: ReceiptType, userId: string, receipt: Receipt, synthetic: boolean): void;
    /**
     * Get a list of receipts for the given event.
     * @param event - the event to get receipts for
     * @returns A list of receipts with a userId, type and data keys or
     * an empty list.
     */
    getReceiptsForEvent(event: MatrixEvent): CachedReceipt[];
    abstract addReceipt(event: MatrixEvent, synthetic: boolean): void;
    /**
     * Add a temporary local-echo receipt to the room to reflect in the
     * client the fact that we've sent one.
     * @param userId - The user ID if the receipt sender
     * @param e - The event that is to be acknowledged
     * @param receiptType - The type of receipt
     */
    addLocalEchoReceipt(userId: string, e: MatrixEvent, receiptType: ReceiptType): void;
    /**
     * Get a list of user IDs who have <b>read up to</b> the given event.
     * @param event - the event to get read receipts for.
     * @returns A list of user IDs.
     */
    getUsersReadUpTo(event: MatrixEvent): string[];
    /**
     * Determines if the given user has read a particular event ID with the known
     * history of the room. This is not a definitive check as it relies only on
     * what is available to the room at the time of execution.
     * @param userId - The user ID to check the read state of.
     * @param eventId - The event ID to check if the user read.
     * @returns True if the user has read the event, false otherwise.
     */
    hasUserReadEvent(userId: string, eventId: string): boolean;
}
//# sourceMappingURL=read-receipt.d.ts.map