/**
 * This is an internal module. See {@link MatrixEvent} and {@link RoomEvent} for
 * the public classes.
 */
import { ExtensibleEvent, Optional } from "matrix-events-sdk";
import { VerificationRequest } from "../crypto/verification/request/VerificationRequest";
import { EventType, MsgType, RelationType } from "../@types/event";
import { Crypto } from "../crypto";
import { RoomMember } from "./room-member";
import { Thread, ThreadEvent, EventHandlerMap as ThreadEventHandlerMap } from "./thread";
import { IActionsObject } from "../pushprocessor";
import { MatrixError } from "../http-api";
import { TypedEventEmitter } from "./typed-event-emitter";
import { EventStatus } from "./event-status";
import { CryptoBackend } from "../common-crypto/CryptoBackend";
export { EventStatus } from "./event-status";
export interface IContent {
    [key: string]: any;
    "msgtype"?: MsgType | string;
    "membership"?: string;
    "avatar_url"?: string;
    "displayname"?: string;
    "m.relates_to"?: IEventRelation;
}
type StrippedState = Required<Pick<IEvent, "content" | "state_key" | "type" | "sender">>;
export interface IUnsigned {
    "age"?: number;
    "prev_sender"?: string;
    "prev_content"?: IContent;
    "redacted_because"?: IEvent;
    "transaction_id"?: string;
    "invite_room_state"?: StrippedState[];
    "m.relations"?: Record<RelationType | string, any>;
}
export interface IThreadBundledRelationship {
    latest_event: IEvent;
    count: number;
    current_user_participated?: boolean;
}
export interface IEvent {
    event_id: string;
    type: string;
    content: IContent;
    sender: string;
    room_id?: string;
    origin_server_ts: number;
    txn_id?: string;
    state_key?: string;
    membership?: string;
    unsigned: IUnsigned;
    redacts?: string;
    /**
     * @deprecated in favour of `sender`
     */
    user_id?: string;
    /**
     * @deprecated in favour of `unsigned.prev_content`
     */
    prev_content?: IContent;
    /**
     * @deprecated in favour of `origin_server_ts`
     */
    age?: number;
}
export interface IAggregatedRelation {
    origin_server_ts: number;
    event_id?: string;
    sender?: string;
    type?: string;
    count?: number;
    key?: string;
}
export interface IEventRelation {
    "rel_type"?: RelationType | string;
    "event_id"?: string;
    "is_falling_back"?: boolean;
    "m.in_reply_to"?: {
        event_id?: string;
    };
    "key"?: string;
}
/**
 * When an event is a visibility change event, as per MSC3531,
 * the visibility change implied by the event.
 */
export interface IVisibilityChange {
    /**
     * If `true`, the target event should be made visible.
     * Otherwise, it should be hidden.
     */
    visible: boolean;
    /**
     * The event id affected.
     */
    eventId: string;
    /**
     * Optionally, a human-readable reason explaining why
     * the event was hidden. Ignored if the event was made
     * visible.
     */
    reason: string | null;
}
export interface IClearEvent {
    room_id?: string;
    type: string;
    content: Omit<IContent, "membership" | "avatar_url" | "displayname" | "m.relates_to">;
    unsigned?: IUnsigned;
}
interface IKeyRequestRecipient {
    userId: string;
    deviceId: "*" | string;
}
export interface IDecryptOptions {
    emit?: boolean;
    isRetry?: boolean;
    forceRedecryptIfUntrusted?: boolean;
}
/**
 * Message hiding, as specified by https://github.com/matrix-org/matrix-doc/pull/3531.
 */
export type MessageVisibility = IMessageVisibilityHidden | IMessageVisibilityVisible;
/**
 * Variant of `MessageVisibility` for the case in which the message should be displayed.
 */
export interface IMessageVisibilityVisible {
    readonly visible: true;
}
/**
 * Variant of `MessageVisibility` for the case in which the message should be hidden.
 */
export interface IMessageVisibilityHidden {
    readonly visible: false;
    /**
     * Optionally, a human-readable reason to show to the user indicating why the
     * message has been hidden (e.g. "Message Pending Moderation").
     */
    readonly reason: string | null;
}
export declare enum MatrixEventEvent {
    Decrypted = "Event.decrypted",
    BeforeRedaction = "Event.beforeRedaction",
    VisibilityChange = "Event.visibilityChange",
    LocalEventIdReplaced = "Event.localEventIdReplaced",
    Status = "Event.status",
    Replaced = "Event.replaced",
    RelationsCreated = "Event.relationsCreated"
}
export type MatrixEventEmittedEvents = MatrixEventEvent | ThreadEvent.Update;
export type MatrixEventHandlerMap = {
    /**
     * Fires when an event is decrypted
     *
     * @param event - The matrix event which has been decrypted
     * @param err - The error that occurred during decryption, or `undefined` if no error occurred.
     */
    [MatrixEventEvent.Decrypted]: (event: MatrixEvent, err?: Error) => void;
    [MatrixEventEvent.BeforeRedaction]: (event: MatrixEvent, redactionEvent: MatrixEvent) => void;
    [MatrixEventEvent.VisibilityChange]: (event: MatrixEvent, visible: boolean) => void;
    [MatrixEventEvent.LocalEventIdReplaced]: (event: MatrixEvent) => void;
    [MatrixEventEvent.Status]: (event: MatrixEvent, status: EventStatus | null) => void;
    [MatrixEventEvent.Replaced]: (event: MatrixEvent) => void;
    [MatrixEventEvent.RelationsCreated]: (relationType: string, eventType: string) => void;
} & Pick<ThreadEventHandlerMap, ThreadEvent.Update>;
export declare class MatrixEvent extends TypedEventEmitter<MatrixEventEmittedEvents, MatrixEventHandlerMap> {
    event: Partial<IEvent>;
    private pushActions;
    private _replacingEvent;
    private _localRedactionEvent;
    private _isCancelled;
    private clearEvent?;
    private visibility;
    private _hasCachedExtEv;
    private _cachedExtEv;
    private senderCurve25519Key;
    private claimedEd25519Key;
    private forwardingCurve25519KeyChain;
    private untrusted;
    private decryptionPromise;
    private retryDecryption;
    private txnId?;
    /**
     * @experimental
     * A reference to the thread this event belongs to
     */
    private thread?;
    private threadId?;
    localTimestamp: number;
    /**
     * The room member who sent this event, or null e.g.
     * this is a presence event. This is only guaranteed to be set for events that
     * appear in a timeline, ie. do not guarantee that it will be set on state
     * events.
     * @privateRemarks
     * Should be read-only
     */
    sender: RoomMember | null;
    /**
     * The room member who is the target of this event, e.g.
     * the invitee, the person being banned, etc.
     * @privateRemarks
     * Should be read-only
     */
    target: RoomMember | null;
    /**
     * The sending status of the event.
     * @privateRemarks
     * Should be read-only
     */
    status: EventStatus | null;
    /**
     * most recent error associated with sending the event, if any
     * @privateRemarks
     * Should be read-only
     */
    error: MatrixError | null;
    /**
     * True if this event is 'forward looking', meaning
     * that getDirectionalContent() will return event.content and not event.prev_content.
     * Only state events may be backwards looking
     * Default: true. <strong>This property is experimental and may change.</strong>
     * @privateRemarks
     * Should be read-only
     */
    forwardLooking: boolean;
    verificationRequest?: VerificationRequest;
    private readonly reEmitter;
    /**
     * Construct a Matrix Event object
     *
     * @param event - The raw (possibly encrypted) event. <b>Do not access
     * this property</b> directly unless you absolutely have to. Prefer the getter
     * methods defined on this class. Using the getter methods shields your app
     * from changes to event JSON between Matrix versions.
     */
    constructor(event?: Partial<IEvent>);
    /**
     * Unstable getter to try and get an extensible event. Note that this might
     * return a falsy value if the event could not be parsed as an extensible
     * event.
     *
     * @deprecated Use stable functions where possible.
     */
    get unstableExtensibleEvent(): Optional<ExtensibleEvent>;
    private invalidateExtensibleEvent;
    /**
     * Gets the event as though it would appear unencrypted. If the event is already not
     * encrypted, it is simply returned as-is.
     * @returns The event in wire format.
     */
    getEffectiveEvent(): IEvent;
    /**
     * Get the event_id for this event.
     * @returns The event ID, e.g. <code>$143350589368169JsLZx:localhost
     * </code>
     */
    getId(): string | undefined;
    /**
     * Get the user_id for this event.
     * @returns The user ID, e.g. `@alice:matrix.org`
     */
    getSender(): string | undefined;
    /**
     * Get the (decrypted, if necessary) type of event.
     *
     * @returns The event type, e.g. `m.room.message`
     */
    getType(): EventType | string;
    /**
     * Get the (possibly encrypted) type of the event that will be sent to the
     * homeserver.
     *
     * @returns The event type.
     */
    getWireType(): EventType | string;
    /**
     * Get the room_id for this event. This will return `undefined`
     * for `m.presence` events.
     * @returns The room ID, e.g. <code>!cURbafjkfsMDVwdRDQ:matrix.org
     * </code>
     */
    getRoomId(): string | undefined;
    /**
     * Get the timestamp of this event.
     * @returns The event timestamp, e.g. `1433502692297`
     */
    getTs(): number;
    /**
     * Get the timestamp of this event, as a Date object.
     * @returns The event date, e.g. `new Date(1433502692297)`
     */
    getDate(): Date | null;
    /**
     * Get a string containing details of this event
     *
     * This is intended for logging, to help trace errors. Example output:
     *
     * @example
     * ```
     * id=$HjnOHV646n0SjLDAqFrgIjim7RCpB7cdMXFrekWYAn type=m.room.encrypted
     * sender=@user:example.com room=!room:example.com ts=2022-10-25T17:30:28.404Z
     * ```
     */
    getDetails(): string;
    /**
     * Get the (decrypted, if necessary) event content JSON, even if the event
     * was replaced by another event.
     *
     * @returns The event content JSON, or an empty object.
     */
    getOriginalContent<T = IContent>(): T;
    /**
     * Get the (decrypted, if necessary) event content JSON,
     * or the content from the replacing event, if any.
     * See `makeReplaced`.
     *
     * @returns The event content JSON, or an empty object.
     */
    getContent<T extends IContent = IContent>(): T;
    /**
     * Get the (possibly encrypted) event content JSON that will be sent to the
     * homeserver.
     *
     * @returns The event content JSON, or an empty object.
     */
    getWireContent(): IContent;
    /**
     * @experimental
     * Get the event ID of the thread head
     */
    get threadRootId(): string | undefined;
    /**
     * @experimental
     */
    get isThreadRoot(): boolean;
    get replyEventId(): string | undefined;
    get relationEventId(): string | undefined;
    /**
     * Get the previous event content JSON. This will only return something for
     * state events which exist in the timeline.
     * @returns The previous event content JSON, or an empty object.
     */
    getPrevContent(): IContent;
    /**
     * Get either 'content' or 'prev_content' depending on if this event is
     * 'forward-looking' or not. This can be modified via event.forwardLooking.
     * In practice, this means we get the chronologically earlier content value
     * for this event (this method should surely be called getEarlierContent)
     * <strong>This method is experimental and may change.</strong>
     * @returns event.content if this event is forward-looking, else
     * event.prev_content.
     */
    getDirectionalContent(): IContent;
    /**
     * Get the age of this event. This represents the age of the event when the
     * event arrived at the device, and not the age of the event when this
     * function was called.
     * Can only be returned once the server has echo'ed back
     * @returns The age of this event in milliseconds.
     */
    getAge(): number | undefined;
    /**
     * Get the age of the event when this function was called.
     * This is the 'age' field adjusted according to how long this client has
     * had the event.
     * @returns The age of this event in milliseconds.
     */
    getLocalAge(): number;
    /**
     * Get the event state_key if it has one. This will return <code>undefined
     * </code> for message events.
     * @returns The event's `state_key`.
     */
    getStateKey(): string | undefined;
    /**
     * Check if this event is a state event.
     * @returns True if this is a state event.
     */
    isState(): boolean;
    /**
     * Replace the content of this event with encrypted versions.
     * (This is used when sending an event; it should not be used by applications).
     *
     * @internal
     *
     * @param cryptoType - type of the encrypted event - typically
     * <tt>"m.room.encrypted"</tt>
     *
     * @param cryptoContent - raw 'content' for the encrypted event.
     *
     * @param senderCurve25519Key - curve25519 key to record for the
     *   sender of this event.
     *   See {@link MatrixEvent#getSenderKey}.
     *
     * @param claimedEd25519Key - claimed ed25519 key to record for the
     *   sender if this event.
     *   See {@link MatrixEvent#getClaimedEd25519Key}
     */
    makeEncrypted(cryptoType: string, cryptoContent: object, senderCurve25519Key: string, claimedEd25519Key: string): void;
    /**
     * Check if this event is currently being decrypted.
     *
     * @returns True if this event is currently being decrypted, else false.
     */
    isBeingDecrypted(): boolean;
    getDecryptionPromise(): Promise<void> | null;
    /**
     * Check if this event is an encrypted event which we failed to decrypt
     *
     * (This implies that we might retry decryption at some point in the future)
     *
     * @returns True if this event is an encrypted event which we
     *     couldn't decrypt.
     */
    isDecryptionFailure(): boolean;
    shouldAttemptDecryption(): boolean;
    /**
     * Start the process of trying to decrypt this event.
     *
     * (This is used within the SDK: it isn't intended for use by applications)
     *
     * @internal
     *
     * @param crypto - crypto module
     *
     * @returns promise which resolves (to undefined) when the decryption
     * attempt is completed.
     */
    attemptDecryption(crypto: CryptoBackend, options?: IDecryptOptions): Promise<void>;
    /**
     * Cancel any room key request for this event and resend another.
     *
     * @param crypto - crypto module
     * @param userId - the user who received this event
     *
     * @returns a promise that resolves when the request is queued
     */
    cancelAndResendKeyRequest(crypto: Crypto, userId: string): Promise<void>;
    /**
     * Calculate the recipients for keyshare requests.
     *
     * @param userId - the user who received this event.
     *
     * @returns array of recipients
     */
    getKeyRequestRecipients(userId: string): IKeyRequestRecipient[];
    private decryptionLoop;
    private badEncryptedMessage;
    /**
     * Update the cleartext data on this event.
     *
     * (This is used after decrypting an event; it should not be used by applications).
     *
     * @internal
     *
     * @param decryptionResult - the decryption result, including the plaintext and some key info
     *
     * @remarks
     * Fires {@link MatrixEventEvent.Decrypted}
     */
    private setClearData;
    /**
     * Gets the cleartext content for this event. If the event is not encrypted,
     * or encryption has not been completed, this will return null.
     *
     * @returns The cleartext (decrypted) content for the event
     */
    getClearContent(): IContent | null;
    /**
     * Check if the event is encrypted.
     * @returns True if this event is encrypted.
     */
    isEncrypted(): boolean;
    /**
     * The curve25519 key for the device that we think sent this event
     *
     * For an Olm-encrypted event, this is inferred directly from the DH
     * exchange at the start of the session: the curve25519 key is involved in
     * the DH exchange, so only a device which holds the private part of that
     * key can establish such a session.
     *
     * For a megolm-encrypted event, it is inferred from the Olm message which
     * established the megolm session
     */
    getSenderKey(): string | null;
    /**
     * The additional keys the sender of this encrypted event claims to possess.
     *
     * Just a wrapper for #getClaimedEd25519Key (q.v.)
     */
    getKeysClaimed(): Partial<Record<"ed25519", string>>;
    /**
     * Get the ed25519 the sender of this event claims to own.
     *
     * For Olm messages, this claim is encoded directly in the plaintext of the
     * event itself. For megolm messages, it is implied by the m.room_key event
     * which established the megolm session.
     *
     * Until we download the device list of the sender, it's just a claim: the
     * device list gives a proof that the owner of the curve25519 key used for
     * this event (and returned by #getSenderKey) also owns the ed25519 key by
     * signing the public curve25519 key with the ed25519 key.
     *
     * In general, applications should not use this method directly, but should
     * instead use MatrixClient.getEventSenderDeviceInfo.
     */
    getClaimedEd25519Key(): string | null;
    /**
     * Get the curve25519 keys of the devices which were involved in telling us
     * about the claimedEd25519Key and sender curve25519 key.
     *
     * Normally this will be empty, but in the case of a forwarded megolm
     * session, the sender keys are sent to us by another device (the forwarding
     * device), which we need to trust to do this. In that case, the result will
     * be a list consisting of one entry.
     *
     * If the device that sent us the key (A) got it from another device which
     * it wasn't prepared to vouch for (B), the result will be [A, B]. And so on.
     *
     * @returns base64-encoded curve25519 keys, from oldest to newest.
     */
    getForwardingCurve25519KeyChain(): string[];
    /**
     * Whether the decryption key was obtained from an untrusted source. If so,
     * we cannot verify the authenticity of the message.
     */
    isKeySourceUntrusted(): boolean | undefined;
    getUnsigned(): IUnsigned;
    setUnsigned(unsigned: IUnsigned): void;
    unmarkLocallyRedacted(): boolean;
    markLocallyRedacted(redactionEvent: MatrixEvent): void;
    /**
     * Change the visibility of an event, as per https://github.com/matrix-org/matrix-doc/pull/3531 .
     *
     * @param visibilityChange - event holding a hide/unhide payload, or nothing
     *   if the event is being reset to its original visibility (presumably
     *   by a visibility event being redacted).
     *
     * @remarks
     * Fires {@link MatrixEventEvent.VisibilityChange} if `visibilityEvent`
     *   caused a change in the actual visibility of this event, either by making it
     *   visible (if it was hidden), by making it hidden (if it was visible) or by
     *   changing the reason (if it was hidden).
     */
    applyVisibilityEvent(visibilityChange?: IVisibilityChange): void;
    /**
     * Return instructions to display or hide the message.
     *
     * @returns Instructions determining whether the message
     * should be displayed.
     */
    messageVisibility(): MessageVisibility;
    /**
     * Update the content of an event in the same way it would be by the server
     * if it were redacted before it was sent to us
     *
     * @param redactionEvent - event causing the redaction
     */
    makeRedacted(redactionEvent: MatrixEvent): void;
    /**
     * Check if this event has been redacted
     *
     * @returns True if this event has been redacted
     */
    isRedacted(): boolean;
    /**
     * Check if this event is a redaction of another event
     *
     * @returns True if this event is a redaction
     */
    isRedaction(): boolean;
    /**
     * Return the visibility change caused by this event,
     * as per https://github.com/matrix-org/matrix-doc/pull/3531.
     *
     * @returns If the event is a well-formed visibility change event,
     * an instance of `IVisibilityChange`, otherwise `null`.
     */
    asVisibilityChange(): IVisibilityChange | null;
    /**
     * Check if this event alters the visibility of another event,
     * as per https://github.com/matrix-org/matrix-doc/pull/3531.
     *
     * @returns True if this event alters the visibility
     * of another event.
     */
    isVisibilityEvent(): boolean;
    /**
     * Get the (decrypted, if necessary) redaction event JSON
     * if event was redacted
     *
     * @returns The redaction event JSON, or an empty object
     */
    getRedactionEvent(): IEvent | {} | null;
    /**
     * Get the push actions, if known, for this event
     *
     * @returns push actions
     */
    getPushActions(): IActionsObject | null;
    /**
     * Set the push actions for this event.
     *
     * @param pushActions - push actions
     */
    setPushActions(pushActions: IActionsObject | null): void;
    /**
     * Replace the `event` property and recalculate any properties based on it.
     * @param event - the object to assign to the `event` property
     */
    handleRemoteEcho(event: object): void;
    /**
     * Whether the event is in any phase of sending, send failure, waiting for
     * remote echo, etc.
     */
    isSending(): boolean;
    /**
     * Update the event's sending status and emit an event as well.
     *
     * @param status - The new status
     */
    setStatus(status: EventStatus | null): void;
    replaceLocalEventId(eventId: string): void;
    /**
     * Get whether the event is a relation event, and of a given type if
     * `relType` is passed in. State events cannot be relation events
     *
     * @param relType - if given, checks that the relation is of the
     * given type
     */
    isRelation(relType?: string): boolean;
    /**
     * Get relation info for the event, if any.
     */
    getRelation(): IEventRelation | null;
    /**
     * Set an event that replaces the content of this event, through an m.replace relation.
     *
     * @param newEvent - the event with the replacing content, if any.
     *
     * @remarks
     * Fires {@link MatrixEventEvent.Replaced}
     */
    makeReplaced(newEvent?: MatrixEvent): void;
    /**
     * Returns the status of any associated edit or redaction
     * (not for reactions/annotations as their local echo doesn't affect the original event),
     * or else the status of the event.
     */
    getAssociatedStatus(): EventStatus | null;
    getServerAggregatedRelation<T>(relType: RelationType | string): T | undefined;
    /**
     * Returns the event ID of the event replacing the content of this event, if any.
     */
    replacingEventId(): string | undefined;
    /**
     * Returns the event replacing the content of this event, if any.
     * Replacements are aggregated on the server, so this would only
     * return an event in case it came down the sync, or for local echo of edits.
     */
    replacingEvent(): MatrixEvent | null;
    /**
     * Returns the origin_server_ts of the event replacing the content of this event, if any.
     */
    replacingEventDate(): Date | undefined;
    /**
     * Returns the event that wants to redact this event, but hasn't been sent yet.
     * @returns the event
     */
    localRedactionEvent(): MatrixEvent | null;
    /**
     * For relations and redactions, returns the event_id this event is referring to.
     */
    getAssociatedId(): string | undefined;
    /**
     * Checks if this event is associated with another event. See `getAssociatedId`.
     * @deprecated use hasAssociation instead.
     */
    hasAssocation(): boolean;
    /**
     * Checks if this event is associated with another event. See `getAssociatedId`.
     */
    hasAssociation(): boolean;
    /**
     * Update the related id with a new one.
     *
     * Used to replace a local id with remote one before sending
     * an event with a related id.
     *
     * @param eventId - the new event id
     */
    updateAssociatedId(eventId: string): void;
    /**
     * Flags an event as cancelled due to future conditions. For example, a verification
     * request event in the same sync transaction may be flagged as cancelled to warn
     * listeners that a cancellation event is coming down the same pipe shortly.
     * @param cancelled - Whether the event is to be cancelled or not.
     */
    flagCancelled(cancelled?: boolean): void;
    /**
     * Gets whether or not the event is flagged as cancelled. See flagCancelled() for
     * more information.
     * @returns True if the event is cancelled, false otherwise.
     */
    isCancelled(): boolean;
    /**
     * Get a copy/snapshot of this event. The returned copy will be loosely linked
     * back to this instance, though will have "frozen" event information. Other
     * properties of this MatrixEvent instance will be copied verbatim, which can
     * mean they are in reference to this instance despite being on the copy too.
     * The reference the snapshot uses does not change, however members aside from
     * the underlying event will not be deeply cloned, thus may be mutated internally.
     * For example, the sender profile will be copied over at snapshot time, and
     * the sender profile internally may mutate without notice to the consumer.
     *
     * This is meant to be used to snapshot the event details themselves, not the
     * features (such as sender) surrounding the event.
     * @returns A snapshot of this event.
     */
    toSnapshot(): MatrixEvent;
    /**
     * Determines if this event is equivalent to the given event. This only checks
     * the event object itself, not the other properties of the event. Intended for
     * use with toSnapshot() to identify events changing.
     * @param otherEvent - The other event to check against.
     * @returns True if the events are the same, false otherwise.
     */
    isEquivalentTo(otherEvent: MatrixEvent): boolean;
    /**
     * Summarise the event as JSON. This is currently used by React SDK's view
     * event source feature and Seshat's event indexing, so take care when
     * adjusting the output here.
     *
     * If encrypted, include both the decrypted and encrypted view of the event.
     *
     * This is named `toJSON` for use with `JSON.stringify` which checks objects
     * for functions named `toJSON` and will call them to customise the output
     * if they are defined.
     */
    toJSON(): object;
    setVerificationRequest(request: VerificationRequest): void;
    setTxnId(txnId: string): void;
    getTxnId(): string | undefined;
    /**
     * @experimental
     */
    setThread(thread?: Thread): void;
    /**
     * @experimental
     */
    getThread(): Thread | undefined;
    setThreadId(threadId?: string): void;
}
//# sourceMappingURL=event.d.ts.map