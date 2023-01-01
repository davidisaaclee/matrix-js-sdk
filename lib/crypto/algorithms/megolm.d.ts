import type { IEventDecryptionResult, IMegolmSessionData } from "../../@types/crypto";
import { DecryptionAlgorithm, DecryptionClassParams, EncryptionAlgorithm, IParams } from "./base";
import { Room } from "../../models/room";
import { DeviceInfo } from "../deviceinfo";
import { IContent, MatrixEvent } from "../../models/event";
import { IMegolmEncryptedContent, IncomingRoomKeyRequest } from "../index";
export declare function isRoomSharedHistory(room: Room): boolean;
export interface IOlmDevice<T = DeviceInfo> {
    userId: string;
    deviceInfo: T;
}
export interface IOutboundGroupSessionKey {
    chain_index: number;
    key: string;
}
/**
 * Megolm encryption implementation
 *
 * @param params - parameters, as per {@link EncryptionAlgorithm}
 */
export declare class MegolmEncryption extends EncryptionAlgorithm {
    private setupPromise;
    private outboundSessions;
    private readonly sessionRotationPeriodMsgs;
    private readonly sessionRotationPeriodMs;
    private encryptionPreparation?;
    protected readonly roomId: string;
    constructor(params: IParams & Required<Pick<IParams, "roomId">>);
    /**
     * @internal
     *
     * @param devicesInRoom - The devices in this room, indexed by user ID
     * @param blocked - The devices that are blocked, indexed by user ID
     * @param singleOlmCreationPhase - Only perform one round of olm
     *     session creation
     *
     * This method updates the setupPromise field of the class by chaining a new
     * call on top of the existing promise, and then catching and discarding any
     * errors that might happen while setting up the outbound group session. This
     * is done to ensure that `setupPromise` always resolves to `null` or the
     * `OutboundSessionInfo`.
     *
     * Using `>>=` to represent the promise chaining operation, it does the
     * following:
     *
     * ```
     * setupPromise = previousSetupPromise >>= setup >>= discardErrors
     * ```
     *
     * The initial value for the `setupPromise` is a promise that resolves to
     * `null`. The forceDiscardSession() resets setupPromise to this initial
     * promise.
     *
     * @returns Promise which resolves to the
     *    OutboundSessionInfo when setup is complete.
     */
    private ensureOutboundSession;
    private prepareSession;
    private shareSession;
    /**
     * @internal
     *
     *
     * @returns session
     */
    private prepareNewSession;
    /**
     * Determines what devices in devicesByUser don't have an olm session as given
     * in devicemap.
     *
     * @internal
     *
     * @param devicemap - the devices that have olm sessions, as returned by
     *     olmlib.ensureOlmSessionsForDevices.
     * @param devicesByUser - a map of user IDs to array of deviceInfo
     * @param noOlmDevices - an array to fill with devices that don't have
     *     olm sessions
     *
     * @returns an array of devices that don't have olm sessions.  If
     *     noOlmDevices is specified, then noOlmDevices will be returned.
     */
    private getDevicesWithoutSessions;
    /**
     * Splits the user device map into multiple chunks to reduce the number of
     * devices we encrypt to per API call.
     *
     * @internal
     *
     * @param devicesByUser - map from userid to list of devices
     *
     * @returns the blocked devices, split into chunks
     */
    private splitDevices;
    /**
     * @internal
     *
     *
     * @param chainIndex - current chain index
     *
     * @param userDeviceMap - mapping from userId to deviceInfo
     *
     * @param payload - fields to include in the encrypted payload
     *
     * @returns Promise which resolves once the key sharing
     *     for the given userDeviceMap is generated and has been sent.
     */
    private encryptAndSendKeysToDevices;
    /**
     * @internal
     *
     *
     * @param userDeviceMap - list of blocked devices to notify
     *
     * @param payload - fields to include in the notification payload
     *
     * @returns Promise which resolves once the notifications
     *     for the given userDeviceMap is generated and has been sent.
     */
    private sendBlockedNotificationsToDevices;
    /**
     * Re-shares a megolm session key with devices if the key has already been
     * sent to them.
     *
     * @param senderKey - The key of the originating device for the session
     * @param sessionId - ID of the outbound session to share
     * @param userId - ID of the user who owns the target device
     * @param device - The target device
     */
    reshareKeyWithDevice(senderKey: string, sessionId: string, userId: string, device: DeviceInfo): Promise<void>;
    /**
     * @internal
     *
     *
     * @param key - the session key as returned by
     *    OlmDevice.getOutboundGroupSessionKey
     *
     * @param payload - the base to-device message payload for sharing keys
     *
     * @param devicesByUser - map from userid to list of devices
     *
     * @param errorDevices - array that will be populated with the devices that we can't get an
     *    olm session for
     *
     * @param otkTimeout - The timeout in milliseconds when requesting
     *     one-time keys for establishing new olm sessions.
     *
     * @param failedServers - An array to fill with remote servers that
     *     failed to respond to one-time-key requests.
     */
    private shareKeyWithDevices;
    private shareKeyWithOlmSessions;
    /**
     * Notify devices that we weren't able to create olm sessions.
     *
     *
     *
     * @param failedDevices - the devices that we were unable to
     *     create olm sessions for, as returned by shareKeyWithDevices
     */
    private notifyFailedOlmDevices;
    /**
     * Notify blocked devices that they have been blocked.
     *
     *
     * @param devicesByUser - map from userid to device ID to blocked data
     */
    private notifyBlockedDevices;
    /**
     * Perform any background tasks that can be done before a message is ready to
     * send, in order to speed up sending of the message.
     *
     * @param room - the room the event is in
     */
    prepareToEncrypt(room: Room): void;
    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    encryptMessage(room: Room, eventType: string, content: IContent): Promise<IMegolmEncryptedContent>;
    private isVerificationEvent;
    /**
     * Forces the current outbound group session to be discarded such
     * that another one will be created next time an event is sent.
     *
     * This should not normally be necessary.
     */
    forceDiscardSession(): void;
    /**
     * Checks the devices we're about to send to and see if any are entirely
     * unknown to the user.  If so, warn the user, and mark them as known to
     * give the user a chance to go verify them before re-sending this message.
     *
     * @param devicesInRoom - `userId -> {deviceId -> object}`
     *   devices we should shared the session with.
     */
    private checkForUnknownDevices;
    /**
     * Remove unknown devices from a set of devices.  The devicesInRoom parameter
     * will be modified.
     *
     * @param devicesInRoom - `userId -> {deviceId -> object}`
     *   devices we should shared the session with.
     */
    private removeUnknownDevices;
    /**
     * Get the list of unblocked devices for all users in the room
     *
     * @param forceDistributeToUnverified - if set to true will include the unverified devices
     * even if setting is set to block them (useful for verification)
     *
     * @returns Promise which resolves to an array whose
     *     first element is a map from userId to deviceId to deviceInfo indicating
     *     the devices that messages should be encrypted to, and whose second
     *     element is a map from userId to deviceId to data indicating the devices
     *     that are in the room but that have been blocked
     */
    private getDevicesInRoom;
}
/**
 * Megolm decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export declare class MegolmDecryption extends DecryptionAlgorithm {
    private pendingEvents;
    private olmlib;
    protected readonly roomId: string;
    constructor(params: DecryptionClassParams<IParams & Required<Pick<IParams, "roomId">>>);
    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    decryptEvent(event: MatrixEvent): Promise<IEventDecryptionResult>;
    private requestKeysForEvent;
    /**
     * Add an event to the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private addEventToPendingList;
    /**
     * Remove an event from the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private removeEventFromPendingList;
    onRoomKeyEvent(event: MatrixEvent): Promise<void>;
    /**
     * @param event - key event
     */
    onRoomKeyWithheldEvent(event: MatrixEvent): Promise<void>;
    hasKeysForKeyRequest(keyRequest: IncomingRoomKeyRequest): Promise<boolean>;
    shareKeysWithDevice(keyRequest: IncomingRoomKeyRequest): void;
    private buildKeyForwardingMessage;
    /**
     * @param untrusted - whether the key should be considered as untrusted
     * @param source - where the key came from
     */
    importRoomKey(session: IMegolmSessionData, { untrusted, source }?: {
        untrusted?: boolean;
        source?: string;
    }): Promise<void>;
    /**
     * Have another go at decrypting events after we receive a key. Resolves once
     * decryption has been re-attempted on all events.
     *
     * @internal
     * @param forceRedecryptIfUntrusted - whether messages that were already
     *     successfully decrypted using untrusted keys should be re-decrypted
     *
     * @returns whether all messages were successfully
     *     decrypted with trusted keys
     */
    private retryDecryption;
    retryDecryptionFromSender(senderKey: string): Promise<boolean>;
    sendSharedHistoryInboundSessions(devicesByUser: Record<string, DeviceInfo[]>): Promise<void>;
}
//# sourceMappingURL=megolm.d.ts.map