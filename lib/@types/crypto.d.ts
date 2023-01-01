import type { IClearEvent } from "../models/event";
export type OlmGroupSessionExtraData = {
    untrusted?: boolean;
    sharedHistory?: boolean;
};
/**
 * The result of a (successful) call to {@link Crypto.decryptEvent}
 */
export interface IEventDecryptionResult {
    /**
     * The plaintext payload for the event (typically containing <tt>type</tt> and <tt>content</tt> fields).
     */
    clearEvent: IClearEvent;
    /**
     * List of curve25519 keys involved in telling us about the senderCurve25519Key and claimedEd25519Key.
     * See {@link MatrixEvent#getForwardingCurve25519KeyChain}.
     */
    forwardingCurve25519KeyChain?: string[];
    /**
     * Key owned by the sender of this event.  See {@link MatrixEvent#getSenderKey}.
     */
    senderCurve25519Key?: string;
    /**
     * ed25519 key claimed by the sender of this event. See {@link MatrixEvent#getClaimedEd25519Key}.
     */
    claimedEd25519Key?: string;
    untrusted?: boolean;
}
interface Extensible {
    [key: string]: any;
}
/** The result of a call to {@link MatrixClient.exportRoomKeys} */
export interface IMegolmSessionData extends Extensible {
    /** Sender's Curve25519 device key */
    sender_key: string;
    /** Devices which forwarded this session to us (normally empty). */
    forwarding_curve25519_key_chain: string[];
    /** Other keys the sender claims. */
    sender_claimed_keys: Record<string, string>;
    /** Room this session is used in */
    room_id: string;
    /** Unique id for the session */
    session_id: string;
    /** Base64'ed key data */
    session_key: string;
    algorithm?: string;
    untrusted?: boolean;
}
export {};
//# sourceMappingURL=crypto.d.ts.map