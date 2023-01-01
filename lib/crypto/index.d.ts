import type { IEventDecryptionResult, IMegolmSessionData } from "../@types/crypto";
import { ToDeviceMessageId } from "../@types/event";
import { IExportedDevice, OlmDevice } from "./OlmDevice";
import { IOlmDevice } from "./algorithms/megolm";
import * as olmlib from "./olmlib";
import { DeviceInfoMap, DeviceList } from "./DeviceList";
import { DeviceInfo } from "./deviceinfo";
import type { DecryptionAlgorithm } from "./algorithms";
import { CrossSigningInfo, DeviceTrustLevel, UserTrustLevel } from "./CrossSigning";
import { ISecretRequest, SecretStorage, SecretStorageKeyObject, SecretStorageKeyTuple } from "./SecretStorage";
import { IAddSecretStorageKeyOpts, ICreateSecretStorageOpts, IEncryptedEventInfo, IImportRoomKeysOpts, IRecoveryKey, ISecretStorageKeyInfo } from "./api";
import { VerificationBase } from "./verification/Base";
import { VerificationRequest } from "./verification/request/VerificationRequest";
import { InRoomRequests } from "./verification/request/InRoomChannel";
import { DehydrationManager } from "./dehydration";
import { BackupManager } from "./backup";
import { IStore } from "../store";
import { Room, RoomEvent } from "../models/room";
import { RoomMemberEvent } from "../models/room-member";
import { MatrixEvent, MatrixEventEvent } from "../models/event";
import { ClientEvent, IKeysUploadResponse, IUploadKeySignaturesResponse, MatrixClient } from "../client";
import type { IRoomEncryption, RoomList } from "./RoomList";
import { ISyncStateData } from "../sync";
import { CryptoStore } from "./store/base";
import { IVerificationChannel } from "./verification/request/Channel";
import { TypedEventEmitter } from "../models/typed-event-emitter";
import { ISyncResponse } from "../sync-accumulator";
import { ISignatures } from "../@types/signed";
import { IMessage } from "./algorithms/olm";
import { CryptoBackend } from "../common-crypto/CryptoBackend";
/**
 * verification method names
 */
export declare const verificationMethods: {
    readonly RECIPROCATE_QR_CODE: string;
    readonly SAS: string;
};
export type VerificationMethod = keyof typeof verificationMethods | string;
export declare function isCryptoAvailable(): boolean;
interface IInitOpts {
    exportedOlmDevice?: IExportedDevice;
    pickleKey?: string;
}
export interface IBootstrapCrossSigningOpts {
    /** Optional. Reset even if keys already exist. */
    setupNewCrossSigning?: boolean;
    /**
     * A function that makes the request requiring auth. Receives the auth data as an object.
     * Can be called multiple times, first with an empty authDict, to obtain the flows.
     */
    authUploadDeviceSigningKeys?(makeRequest: (authData: any) => Promise<{}>): Promise<void>;
}
export interface ICryptoCallbacks {
    getCrossSigningKey?: (keyType: string, pubKey: string) => Promise<Uint8Array | null>;
    saveCrossSigningKeys?: (keys: Record<string, Uint8Array>) => void;
    shouldUpgradeDeviceVerifications?: (users: Record<string, any>) => Promise<string[]>;
    getSecretStorageKey?: (keys: {
        keys: Record<string, ISecretStorageKeyInfo>;
    }, name: string) => Promise<[string, Uint8Array] | null>;
    cacheSecretStorageKey?: (keyId: string, keyInfo: ISecretStorageKeyInfo, key: Uint8Array) => void;
    onSecretRequested?: (userId: string, deviceId: string, requestId: string, secretName: string, deviceTrust: DeviceTrustLevel) => Promise<string>;
    getDehydrationKey?: (keyInfo: ISecretStorageKeyInfo, checkFunc: (key: Uint8Array) => void) => Promise<Uint8Array>;
    getBackupKey?: () => Promise<Uint8Array>;
}
interface IRoomKey {
    room_id: string;
    algorithm: string;
}
/**
 * The parameters of a room key request. The details of the request may
 * vary with the crypto algorithm, but the management and storage layers for
 * outgoing requests expect it to have 'room_id' and 'session_id' properties.
 */
export interface IRoomKeyRequestBody extends IRoomKey {
    session_id: string;
    sender_key: string;
}
export interface ICheckOwnCrossSigningTrustOpts {
    allowPrivateKeyRequests?: boolean;
}
interface IUserOlmSession {
    deviceIdKey: string;
    sessions: {
        sessionId: string;
        hasReceivedMessage: boolean;
    }[];
}
export interface IRoomKeyRequestRecipient {
    userId: string;
    deviceId: string;
}
interface ISignableObject {
    signatures?: ISignatures;
    unsigned?: object;
}
export interface IRequestsMap {
    getRequest(event: MatrixEvent): VerificationRequest | undefined;
    getRequestByChannel(channel: IVerificationChannel): VerificationRequest | undefined;
    setRequest(event: MatrixEvent, request: VerificationRequest): void;
    setRequestByChannel(channel: IVerificationChannel, request: VerificationRequest): void;
}
export interface IOlmEncryptedContent {
    algorithm: typeof olmlib.OLM_ALGORITHM;
    sender_key: string;
    ciphertext: Record<string, IMessage>;
    [ToDeviceMessageId]?: string;
}
export interface IMegolmEncryptedContent {
    algorithm: typeof olmlib.MEGOLM_ALGORITHM;
    sender_key: string;
    session_id: string;
    device_id: string;
    ciphertext: string;
    [ToDeviceMessageId]?: string;
}
export type IEncryptedContent = IOlmEncryptedContent | IMegolmEncryptedContent;
export declare enum CryptoEvent {
    DeviceVerificationChanged = "deviceVerificationChanged",
    UserTrustStatusChanged = "userTrustStatusChanged",
    UserCrossSigningUpdated = "userCrossSigningUpdated",
    RoomKeyRequest = "crypto.roomKeyRequest",
    RoomKeyRequestCancellation = "crypto.roomKeyRequestCancellation",
    KeyBackupStatus = "crypto.keyBackupStatus",
    KeyBackupFailed = "crypto.keyBackupFailed",
    KeyBackupSessionsRemaining = "crypto.keyBackupSessionsRemaining",
    KeySignatureUploadFailure = "crypto.keySignatureUploadFailure",
    VerificationRequest = "crypto.verification.request",
    Warning = "crypto.warning",
    WillUpdateDevices = "crypto.willUpdateDevices",
    DevicesUpdated = "crypto.devicesUpdated",
    KeysChanged = "crossSigning.keysChanged"
}
export type CryptoEventHandlerMap = {
    /**
     * Fires when a device is marked as verified/unverified/blocked/unblocked by
     * {@link MatrixClient#setDeviceVerified|MatrixClient.setDeviceVerified} or
     * {@link MatrixClient#setDeviceBlocked|MatrixClient.setDeviceBlocked}.
     *
     * @param userId - the owner of the verified device
     * @param deviceId - the id of the verified device
     * @param deviceInfo - updated device information
     */
    [CryptoEvent.DeviceVerificationChanged]: (userId: string, deviceId: string, device: DeviceInfo) => void;
    /**
     * Fires when the trust status of a user changes
     * If userId is the userId of the logged-in user, this indicated a change
     * in the trust status of the cross-signing data on the account.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     * @experimental
     *
     * @param userId - the userId of the user in question
     * @param trustLevel - The new trust level of the user
     */
    [CryptoEvent.UserTrustStatusChanged]: (userId: string, trustLevel: UserTrustLevel) => void;
    /**
     * Fires when we receive a room key request
     *
     * @param req - request details
     */
    [CryptoEvent.RoomKeyRequest]: (request: IncomingRoomKeyRequest) => void;
    /**
     * Fires when we receive a room key request cancellation
     */
    [CryptoEvent.RoomKeyRequestCancellation]: (request: IncomingRoomKeyRequestCancellation) => void;
    /**
     * Fires whenever the status of e2e key backup changes, as returned by getKeyBackupEnabled()
     * @param enabled - true if key backup has been enabled, otherwise false
     * @example
     * ```
     * matrixClient.on("crypto.keyBackupStatus", function(enabled){
     *   if (enabled) {
     *     [...]
     *   }
     * });
     * ```
     */
    [CryptoEvent.KeyBackupStatus]: (enabled: boolean) => void;
    [CryptoEvent.KeyBackupFailed]: (errcode: string) => void;
    [CryptoEvent.KeyBackupSessionsRemaining]: (remaining: number) => void;
    [CryptoEvent.KeySignatureUploadFailure]: (failures: IUploadKeySignaturesResponse["failures"], source: "checkOwnCrossSigningTrust" | "afterCrossSigningLocalKeyChange" | "setDeviceVerification", upload: (opts: {
        shouldEmit: boolean;
    }) => Promise<void>) => void;
    /**
     * Fires when a key verification is requested.
     */
    [CryptoEvent.VerificationRequest]: (request: VerificationRequest<any>) => void;
    /**
     * Fires when the app may wish to warn the user about something related
     * the end-to-end crypto.
     *
     * @param type - One of the strings listed above
     */
    [CryptoEvent.Warning]: (type: string) => void;
    /**
     * Fires when the user's cross-signing keys have changed or cross-signing
     * has been enabled/disabled. The client can use getStoredCrossSigningForUser
     * with the user ID of the logged in user to check if cross-signing is
     * enabled on the account. If enabled, it can test whether the current key
     * is trusted using with checkUserTrust with the user ID of the logged
     * in user. The checkOwnCrossSigningTrust function may be used to reconcile
     * the trust in the account key.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     * @experimental
     */
    [CryptoEvent.KeysChanged]: (data: {}) => void;
    /**
     * Fires whenever the stored devices for a user will be updated
     * @param users - A list of user IDs that will be updated
     * @param initialFetch - If true, the store is empty (apart
     *     from our own device) and is being seeded.
     */
    [CryptoEvent.WillUpdateDevices]: (users: string[], initialFetch: boolean) => void;
    /**
     * Fires whenever the stored devices for a user have changed
     * @param users - A list of user IDs that were updated
     * @param initialFetch - If true, the store was empty (apart
     *     from our own device) and has been seeded.
     */
    [CryptoEvent.DevicesUpdated]: (users: string[], initialFetch: boolean) => void;
    [CryptoEvent.UserCrossSigningUpdated]: (userId: string) => void;
};
export declare class Crypto extends TypedEventEmitter<CryptoEvent, CryptoEventHandlerMap> implements CryptoBackend {
    readonly baseApis: MatrixClient;
    readonly userId: string;
    private readonly deviceId;
    private readonly clientStore;
    readonly cryptoStore: CryptoStore;
    private readonly roomList;
    /**
     * @returns The version of Olm.
     */
    static getOlmVersion(): [number, number, number];
    readonly backupManager: BackupManager;
    readonly crossSigningInfo: CrossSigningInfo;
    readonly olmDevice: OlmDevice;
    readonly deviceList: DeviceList;
    readonly dehydrationManager: DehydrationManager;
    readonly secretStorage: SecretStorage;
    private readonly reEmitter;
    private readonly verificationMethods;
    readonly supportedAlgorithms: string[];
    private readonly outgoingRoomKeyRequestManager;
    private readonly toDeviceVerificationRequests;
    readonly inRoomVerificationRequests: InRoomRequests;
    private trustCrossSignedDevices;
    private lastOneTimeKeyCheck;
    private oneTimeKeyCheckInProgress;
    private roomEncryptors;
    private roomDecryptors;
    private deviceKeys;
    globalBlacklistUnverifiedDevices: boolean;
    globalErrorOnUnknownDevices: boolean;
    private receivedRoomKeyRequests;
    private receivedRoomKeyRequestCancellations;
    private processingRoomKeyRequests;
    private lazyLoadMembers;
    private roomDeviceTrackingState;
    private lastNewSessionForced;
    private sendKeyRequestsImmediately;
    private oneTimeKeyCount?;
    private needsNewFallback?;
    private fallbackCleanup?;
    /**
     * Cryptography bits
     *
     * This module is internal to the js-sdk; the public API is via MatrixClient.
     *
     * @internal
     *
     * @param baseApis - base matrix api interface
     *
     * @param userId - The user ID for the local user
     *
     * @param deviceId - The identifier for this device.
     *
     * @param clientStore - the MatrixClient data store.
     *
     * @param cryptoStore - storage for the crypto layer.
     *
     * @param roomList - An initialised RoomList object
     *
     * @param verificationMethods - Array of verification methods to use.
     *    Each element can either be a string from MatrixClient.verificationMethods
     *    or a class that implements a verification method.
     */
    constructor(baseApis: MatrixClient, userId: string, deviceId: string, clientStore: IStore, cryptoStore: CryptoStore, roomList: RoomList, verificationMethods: Array<VerificationMethod | (typeof VerificationBase & {
        NAME: string;
    })>);
    /**
     * Initialise the crypto module so that it is ready for use
     *
     * Returns a promise which resolves once the crypto module is ready for use.
     *
     * @param exportedOlmDevice - (Optional) data from exported device
     *     that must be re-created.
     */
    init({ exportedOlmDevice, pickleKey }?: IInitOpts): Promise<void>;
    /**
     * Whether to trust a others users signatures of their devices.
     * If false, devices will only be considered 'verified' if we have
     * verified that device individually (effectively disabling cross-signing).
     *
     * Default: true
     *
     * @returns True if trusting cross-signed devices
     */
    getCryptoTrustCrossSignedDevices(): boolean;
    /**
     * See getCryptoTrustCrossSignedDevices

     * This may be set before initCrypto() is called to ensure no races occur.
     *
     * @param val - True to trust cross-signed devices
     */
    setCryptoTrustCrossSignedDevices(val: boolean): void;
    /**
     * Create a recovery key from a user-supplied passphrase.
     *
     * @param password - Passphrase string that can be entered by the user
     *     when restoring the backup as an alternative to entering the recovery key.
     *     Optional.
     * @returns Object with public key metadata, encoded private
     *     recovery key which should be disposed of after displaying to the user,
     *     and raw private key to avoid round tripping if needed.
     */
    createRecoveryKeyFromPassphrase(password?: string): Promise<IRecoveryKey>;
    /**
     * Checks if the user has previously published cross-signing keys
     *
     * This means downloading the devicelist for the user and checking if the list includes
     * the cross-signing pseudo-device.
     *
     * @internal
     */
    userHasCrossSigningKeys(): Promise<boolean>;
    /**
     * Checks whether cross signing:
     * - is enabled on this account and trusted by this device
     * - has private keys either cached locally or stored in secret storage
     *
     * If this function returns false, bootstrapCrossSigning() can be used
     * to fix things such that it returns true. That is to say, after
     * bootstrapCrossSigning() completes successfully, this function should
     * return true.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @returns True if cross-signing is ready to be used on this device
     */
    isCrossSigningReady(): Promise<boolean>;
    /**
     * Checks whether secret storage:
     * - is enabled on this account
     * - is storing cross-signing private keys
     * - is storing session backup key (if enabled)
     *
     * If this function returns false, bootstrapSecretStorage() can be used
     * to fix things such that it returns true. That is to say, after
     * bootstrapSecretStorage() completes successfully, this function should
     * return true.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @returns True if secret storage is ready to be used on this device
     */
    isSecretStorageReady(): Promise<boolean>;
    /**
     * Bootstrap cross-signing by creating keys if needed. If everything is already
     * set up, then no changes are made, so this is safe to run to ensure
     * cross-signing is ready for use.
     *
     * This function:
     * - creates new cross-signing keys if they are not found locally cached nor in
     *   secret storage (if it has been setup)
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param authUploadDeviceSigningKeys - Function
     * called to await an interactive auth flow when uploading device signing keys.
     * @param setupNewCrossSigning - Optional. Reset even if keys
     * already exist.
     * Args:
     *     A function that makes the request requiring auth. Receives the
     *     auth data as an object. Can be called multiple times, first with an empty
     *     authDict, to obtain the flows.
     */
    bootstrapCrossSigning({ authUploadDeviceSigningKeys, setupNewCrossSigning, }?: IBootstrapCrossSigningOpts): Promise<void>;
    /**
     * Bootstrap Secure Secret Storage if needed by creating a default key. If everything is
     * already set up, then no changes are made, so this is safe to run to ensure secret
     * storage is ready for use.
     *
     * This function
     * - creates a new Secure Secret Storage key if no default key exists
     *   - if a key backup exists, it is migrated to store the key in the Secret
     *     Storage
     * - creates a backup if none exists, and one is requested
     * - migrates Secure Secret Storage to use the latest algorithm, if an outdated
     *   algorithm is found
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param createSecretStorageKey - Optional. Function
     * called to await a secret storage key creation flow.
     *     Returns a Promise which resolves to an object with public key metadata, encoded private
     *     recovery key which should be disposed of after displaying to the user,
     *     and raw private key to avoid round tripping if needed.
     * @param keyBackupInfo - The current key backup object. If passed,
     * the passphrase and recovery key from this backup will be used.
     * @param setupNewKeyBackup - If true, a new key backup version will be
     * created and the private key stored in the new SSSS store. Ignored if keyBackupInfo
     * is supplied.
     * @param setupNewSecretStorage - Optional. Reset even if keys already exist.
     * @param getKeyBackupPassphrase - Optional. Function called to get the user's
     *     current key backup passphrase. Should return a promise that resolves with a Buffer
     *     containing the key, or rejects if the key cannot be obtained.
     * Returns:
     *     A promise which resolves to key creation data for
     *     SecretStorage#addKey: an object with `passphrase` etc fields.
     */
    bootstrapSecretStorage({ createSecretStorageKey, keyBackupInfo, setupNewKeyBackup, setupNewSecretStorage, getKeyBackupPassphrase, }?: ICreateSecretStorageOpts): Promise<void>;
    addSecretStorageKey(algorithm: string, opts: IAddSecretStorageKeyOpts, keyID?: string): Promise<SecretStorageKeyObject>;
    hasSecretStorageKey(keyID?: string): Promise<boolean>;
    getSecretStorageKey(keyID?: string): Promise<SecretStorageKeyTuple | null>;
    storeSecret(name: string, secret: string, keys?: string[]): Promise<void>;
    getSecret(name: string): Promise<string | undefined>;
    isSecretStored(name: string): Promise<Record<string, ISecretStorageKeyInfo> | null>;
    requestSecret(name: string, devices: string[]): ISecretRequest;
    getDefaultSecretStorageKeyId(): Promise<string | null>;
    setDefaultSecretStorageKeyId(k: string): Promise<void>;
    checkSecretStorageKey(key: Uint8Array, info: ISecretStorageKeyInfo): Promise<boolean>;
    /**
     * Checks that a given secret storage private key matches a given public key.
     * This can be used by the getSecretStorageKey callback to verify that the
     * private key it is about to supply is the one that was requested.
     *
     * @param privateKey - The private key
     * @param expectedPublicKey - The public key
     * @returns true if the key matches, otherwise false
     */
    checkSecretStoragePrivateKey(privateKey: Uint8Array, expectedPublicKey: string): boolean;
    /**
     * Fetches the backup private key, if cached
     * @returns the key, if any, or null
     */
    getSessionBackupPrivateKey(): Promise<Uint8Array | null>;
    /**
     * Stores the session backup key to the cache
     * @param key - the private key
     * @returns a promise so you can catch failures
     */
    storeSessionBackupPrivateKey(key: ArrayLike<number>): Promise<void>;
    /**
     * Checks that a given cross-signing private key matches a given public key.
     * This can be used by the getCrossSigningKey callback to verify that the
     * private key it is about to supply is the one that was requested.
     *
     * @param privateKey - The private key
     * @param expectedPublicKey - The public key
     * @returns true if the key matches, otherwise false
     */
    checkCrossSigningPrivateKey(privateKey: Uint8Array, expectedPublicKey: string): boolean;
    /**
     * Run various follow-up actions after cross-signing keys have changed locally
     * (either by resetting the keys for the account or by getting them from secret
     * storage), such as signing the current device, upgrading device
     * verifications, etc.
     */
    private afterCrossSigningLocalKeyChange;
    /**
     * Check if a user's cross-signing key is a candidate for upgrading from device
     * verification.
     *
     * @param userId - the user whose cross-signing information is to be checked
     * @param crossSigningInfo - the cross-signing information to check
     */
    private checkForDeviceVerificationUpgrade;
    /**
     * Check if the cross-signing key is signed by a verified device.
     *
     * @param userId - the user ID whose key is being checked
     * @param key - the key that is being checked
     * @param devices - the user's devices.  Should be a map from device ID
     *     to device info
     */
    private checkForValidDeviceSignature;
    /**
     * Get the user's cross-signing key ID.
     *
     * @param type - The type of key to get the ID of.  One of
     *     "master", "self_signing", or "user_signing".  Defaults to "master".
     *
     * @returns the key ID
     */
    getCrossSigningId(type: string): string | null;
    /**
     * Get the cross signing information for a given user.
     *
     * @param userId - the user ID to get the cross-signing info for.
     *
     * @returns the cross signing information for the user.
     */
    getStoredCrossSigningForUser(userId: string): CrossSigningInfo | null;
    /**
     * Check whether a given user is trusted.
     *
     * @param userId - The ID of the user to check.
     *
     * @returns
     */
    checkUserTrust(userId: string): UserTrustLevel;
    /**
     * Check whether a given device is trusted.
     *
     * @param userId - The ID of the user whose devices is to be checked.
     * @param deviceId - The ID of the device to check
     *
     * @returns
     */
    checkDeviceTrust(userId: string, deviceId: string): DeviceTrustLevel;
    /**
     * Check whether a given deviceinfo is trusted.
     *
     * @param userId - The ID of the user whose devices is to be checked.
     * @param device - The device info object to check
     *
     * @returns
     */
    checkDeviceInfoTrust(userId: string, device?: DeviceInfo): DeviceTrustLevel;
    /**
     * Check whether one of our own devices is cross-signed by our
     * user's stored keys, regardless of whether we trust those keys yet.
     *
     * @param deviceId - The ID of the device to check
     *
     * @returns true if the device is cross-signed
     */
    checkIfOwnDeviceCrossSigned(deviceId: string): boolean;
    private onDeviceListUserCrossSigningUpdated;
    /**
     * Check the copy of our cross-signing key that we have in the device list and
     * see if we can get the private key. If so, mark it as trusted.
     */
    checkOwnCrossSigningTrust({ allowPrivateKeyRequests, }?: ICheckOwnCrossSigningTrustOpts): Promise<void>;
    /**
     * Store a set of keys as our own, trusted, cross-signing keys.
     *
     * @param keys - The new trusted set of keys
     */
    private storeTrustedSelfKeys;
    /**
     * Check if the master key is signed by a verified device, and if so, prompt
     * the application to mark it as verified.
     *
     * @param userId - the user ID whose key should be checked
     */
    private checkDeviceVerifications;
    /**
     */
    enableLazyLoading(): void;
    /**
     * Tell the crypto module to register for MatrixClient events which it needs to
     * listen for
     *
     * @param eventEmitter - event source where we can register
     *    for event notifications
     */
    registerEventHandlers(eventEmitter: TypedEventEmitter<RoomMemberEvent.Membership | ClientEvent.ToDeviceEvent | RoomEvent.Timeline | MatrixEventEvent.Decrypted, any>): void;
    /**
     * @deprecated this does nothing and will be removed in a future version
     */
    start(): void;
    /** Stop background processes related to crypto */
    stop(): void;
    /**
     * Get the Ed25519 key for this device
     *
     * @returns base64-encoded ed25519 key.
     */
    getDeviceEd25519Key(): string | null;
    /**
     * Get the Curve25519 key for this device
     *
     * @returns base64-encoded curve25519 key.
     */
    getDeviceCurve25519Key(): string | null;
    /**
     * Set the global override for whether the client should ever send encrypted
     * messages to unverified devices.  This provides the default for rooms which
     * do not specify a value.
     *
     * @param value - whether to blacklist all unverified devices by default
     *
     * @deprecated For external code, use {@link MatrixClient#setGlobalBlacklistUnverifiedDevices}. For
     *   internal code, set {@link MatrixClient#globalBlacklistUnverifiedDevices} directly.
     */
    setGlobalBlacklistUnverifiedDevices(value: boolean): void;
    /**
     * @returns whether to blacklist all unverified devices by default
     *
     * @deprecated For external code, use {@link MatrixClient#getGlobalBlacklistUnverifiedDevices}. For
     *   internal code, reference {@link MatrixClient#globalBlacklistUnverifiedDevices} directly.
     */
    getGlobalBlacklistUnverifiedDevices(): boolean;
    /**
     * Upload the device keys to the homeserver.
     * @returns A promise that will resolve when the keys are uploaded.
     */
    uploadDeviceKeys(): Promise<IKeysUploadResponse>;
    /**
     * Stores the current one_time_key count which will be handled later (in a call of
     * onSyncCompleted). The count is e.g. coming from a /sync response.
     *
     * @param currentCount - The current count of one_time_keys to be stored
     */
    updateOneTimeKeyCount(currentCount: number): void;
    setNeedsNewFallback(needsNewFallback: boolean): void;
    getNeedsNewFallback(): boolean;
    private maybeUploadOneTimeKeys;
    private uploadOneTimeKeys;
    /**
     * Download the keys for a list of users and stores the keys in the session
     * store.
     * @param userIds - The users to fetch.
     * @param forceDownload - Always download the keys even if cached.
     *
     * @returns A promise which resolves to a map `userId->deviceId->{@link DeviceInfo}`.
     */
    downloadKeys(userIds: string[], forceDownload?: boolean): Promise<DeviceInfoMap>;
    /**
     * Get the stored device keys for a user id
     *
     * @param userId - the user to list keys for.
     *
     * @returns list of devices, or null if we haven't
     * managed to get a list of devices for this user yet.
     */
    getStoredDevicesForUser(userId: string): Array<DeviceInfo> | null;
    /**
     * Get the stored keys for a single device
     *
     *
     * @returns device, or undefined
     * if we don't know about this device
     */
    getStoredDevice(userId: string, deviceId: string): DeviceInfo | undefined;
    /**
     * Save the device list, if necessary
     *
     * @param delay - Time in ms before which the save actually happens.
     *     By default, the save is delayed for a short period in order to batch
     *     multiple writes, but this behaviour can be disabled by passing 0.
     *
     * @returns true if the data was saved, false if
     *     it was not (eg. because no changes were pending). The promise
     *     will only resolve once the data is saved, so may take some time
     *     to resolve.
     */
    saveDeviceList(delay: number): Promise<boolean>;
    /**
     * Update the blocked/verified state of the given device
     *
     * @param userId - owner of the device
     * @param deviceId - unique identifier for the device or user's
     * cross-signing public key ID.
     *
     * @param verified - whether to mark the device as verified. Null to
     *     leave unchanged.
     *
     * @param blocked - whether to mark the device as blocked. Null to
     *      leave unchanged.
     *
     * @param known - whether to mark that the user has been made aware of
     *      the existence of this device. Null to leave unchanged
     *
     * @param keys - The list of keys that was present
     * during the device verification. This will be double checked with the list
     * of keys the given device has currently.
     *
     * @returns updated DeviceInfo
     */
    setDeviceVerification(userId: string, deviceId: string, verified?: boolean | null, blocked?: boolean | null, known?: boolean | null, keys?: Record<string, string>): Promise<DeviceInfo | CrossSigningInfo>;
    findVerificationRequestDMInProgress(roomId: string): VerificationRequest | undefined;
    getVerificationRequestsToDeviceInProgress(userId: string): VerificationRequest[];
    requestVerificationDM(userId: string, roomId: string): Promise<VerificationRequest>;
    requestVerification(userId: string, devices?: string[]): Promise<VerificationRequest>;
    private requestVerificationWithChannel;
    beginKeyVerification(method: string, userId: string, deviceId: string, transactionId?: string | null): VerificationBase<any, any>;
    legacyDeviceVerification(userId: string, deviceId: string, method: VerificationMethod): Promise<VerificationRequest>;
    /**
     * Get information on the active olm sessions with a user
     * <p>
     * Returns a map from device id to an object with keys 'deviceIdKey' (the
     * device's curve25519 identity key) and 'sessions' (an array of objects in the
     * same format as that returned by
     * {@link OlmDevice#getSessionInfoForDevice}).
     * <p>
     * This method is provided for debugging purposes.
     *
     * @param userId - id of user to inspect
     */
    getOlmSessionsForUser(userId: string): Promise<Record<string, IUserOlmSession>>;
    /**
     * Get the device which sent an event
     *
     * @param event - event to be checked
     */
    getEventSenderDeviceInfo(event: MatrixEvent): DeviceInfo | null;
    /**
     * Get information about the encryption of an event
     *
     * @param event - event to be checked
     *
     * @returns An object with the fields:
     *    - encrypted: whether the event is encrypted (if not encrypted, some of the
     *      other properties may not be set)
     *    - senderKey: the sender's key
     *    - algorithm: the algorithm used to encrypt the event
     *    - authenticated: whether we can be sure that the owner of the senderKey
     *      sent the event
     *    - sender: the sender's device information, if available
     *    - mismatchedSender: if the event's ed25519 and curve25519 keys don't match
     *      (only meaningful if `sender` is set)
     */
    getEventEncryptionInfo(event: MatrixEvent): IEncryptedEventInfo;
    /**
     * Forces the current outbound group session to be discarded such
     * that another one will be created next time an event is sent.
     *
     * @param roomId - The ID of the room to discard the session for
     *
     * This should not normally be necessary.
     */
    forceDiscardSession(roomId: string): void;
    /**
     * Configure a room to use encryption (ie, save a flag in the cryptoStore).
     *
     * @param roomId - The room ID to enable encryption in.
     *
     * @param config - The encryption config for the room.
     *
     * @param inhibitDeviceQuery - true to suppress device list query for
     *   users in the room (for now). In case lazy loading is enabled,
     *   the device query is always inhibited as the members are not tracked.
     *
     * @deprecated It is normally incorrect to call this method directly. Encryption
     *   is enabled by receiving an `m.room.encryption` event (which we may have sent
     *   previously).
     */
    setRoomEncryption(roomId: string, config: IRoomEncryption, inhibitDeviceQuery?: boolean): Promise<void>;
    /**
     * Set up encryption for a room.
     *
     * This is called when an <tt>m.room.encryption</tt> event is received. It saves a flag
     * for the room in the cryptoStore (if it wasn't already set), sets up an "encryptor" for
     * the room, and enables device-list tracking for the room.
     *
     * It does <em>not</em> initiate a device list query for the room. That is normally
     * done once we finish processing the sync, in onSyncCompleted.
     *
     * @param room - The room to enable encryption in.
     * @param config - The encryption config for the room.
     */
    private setRoomEncryptionImpl;
    /**
     * Make sure we are tracking the device lists for all users in this room.
     *
     * @param roomId - The room ID to start tracking devices in.
     * @returns when all devices for the room have been fetched and marked to track
     * @deprecated there's normally no need to call this function: device list tracking
     *    will be enabled as soon as we have the full membership list.
     */
    trackRoomDevices(roomId: string): Promise<void>;
    /**
     * Make sure we are tracking the device lists for all users in this room.
     *
     * This is normally called when we are about to send an encrypted event, to make sure
     * we have all the devices in the room; but it is also called when processing an
     * m.room.encryption state event (if lazy-loading is disabled), or when members are
     * loaded (if lazy-loading is enabled), to prepare the device list.
     *
     * @param room - Room to enable device-list tracking in
     */
    private trackRoomDevicesImpl;
    /**
     * Try to make sure we have established olm sessions for all known devices for
     * the given users.
     *
     * @param users - list of user ids
     * @param force - If true, force a new Olm session to be created. Default false.
     *
     * @returns resolves once the sessions are complete, to
     *    an Object mapping from userId to deviceId to
     *    {@link OlmSessionResult}
     */
    ensureOlmSessionsForUsers(users: string[], force?: boolean): Promise<Record<string, Record<string, olmlib.IOlmSessionResult>>>;
    /**
     * Get a list containing all of the room keys
     *
     * @returns a list of session export objects
     */
    exportRoomKeys(): Promise<IMegolmSessionData[]>;
    /**
     * Import a list of room keys previously exported by exportRoomKeys
     *
     * @param keys - a list of session export objects
     * @returns a promise which resolves once the keys have been imported
     */
    importRoomKeys(keys: IMegolmSessionData[], opts?: IImportRoomKeysOpts): Promise<void>;
    /**
     * Counts the number of end to end session keys that are waiting to be backed up
     * @returns Promise which resolves to the number of sessions requiring backup
     */
    countSessionsNeedingBackup(): Promise<number>;
    /**
     * Perform any background tasks that can be done before a message is ready to
     * send, in order to speed up sending of the message.
     *
     * @param room - the room the event is in
     */
    prepareToEncrypt(room: Room): void;
    /**
     * Encrypt an event according to the configuration of the room.
     *
     * @param event -  event to be sent
     *
     * @param room - destination room.
     *
     * @returns Promise which resolves when the event has been
     *     encrypted, or null if nothing was needed
     */
    encryptEvent(event: MatrixEvent, room?: Room): Promise<void>;
    /**
     * Decrypt a received event
     *
     *
     * @returns resolves once we have
     *  finished decrypting. Rejects with an `algorithms.DecryptionError` if there
     *  is a problem decrypting the event.
     */
    decryptEvent(event: MatrixEvent): Promise<IEventDecryptionResult>;
    /**
     * Handle the notification from /sync or /keys/changes that device lists have
     * been changed.
     *
     * @param syncData - Object containing sync tokens associated with this sync
     * @param syncDeviceLists - device_lists field from /sync, or response from
     * /keys/changes
     */
    handleDeviceListChanges(syncData: ISyncStateData, syncDeviceLists: Required<ISyncResponse>["device_lists"]): Promise<void>;
    /**
     * Send a request for some room keys, if we have not already done so
     *
     * @param resend - whether to resend the key request if there is
     *    already one
     *
     * @returns a promise that resolves when the key request is queued
     */
    requestRoomKey(requestBody: IRoomKeyRequestBody, recipients: IRoomKeyRequestRecipient[], resend?: boolean): Promise<void>;
    /**
     * Cancel any earlier room key request
     *
     * @param requestBody - parameters to match for cancellation
     */
    cancelRoomKeyRequest(requestBody: IRoomKeyRequestBody): void;
    /**
     * Re-send any outgoing key requests, eg after verification
     * @returns
     */
    cancelAndResendAllOutgoingKeyRequests(): Promise<void>;
    /**
     * handle an m.room.encryption event
     *
     * @param room - in which the event was received
     * @param event - encryption event to be processed
     */
    onCryptoEvent(room: Room, event: MatrixEvent): Promise<void>;
    /**
     * Called before the result of a sync is processed
     *
     * @param syncData -  the data from the 'MatrixClient.sync' event
     */
    onSyncWillProcess(syncData: ISyncStateData): Promise<void>;
    /**
     * handle the completion of a /sync
     *
     * This is called after the processing of each successful /sync response.
     * It is an opportunity to do a batch process on the information received.
     *
     * @param syncData -  the data from the 'MatrixClient.sync' event
     */
    onSyncCompleted(syncData: ISyncStateData): Promise<void>;
    /**
     * Trigger the appropriate invalidations and removes for a given
     * device list
     *
     * @param deviceLists - device_lists field from /sync, or response from
     * /keys/changes
     */
    private evalDeviceListChanges;
    /**
     * Get a list of all the IDs of users we share an e2e room with
     * for which we are tracking devices already
     *
     * @returns List of user IDs
     */
    private getTrackedE2eUsers;
    /**
     * Get a list of the e2e-enabled rooms we are members of,
     * and for which we are already tracking the devices
     *
     * @returns
     */
    private getTrackedE2eRooms;
    /**
     * Encrypts and sends a given object via Olm to-device messages to a given
     * set of devices.
     * @param userDeviceInfoArr - the devices to send to
     * @param payload - fields to include in the encrypted payload
     * @returns Promise which
     *     resolves once the message has been encrypted and sent to the given
     *     userDeviceMap, and returns the `{ contentMap, deviceInfoByDeviceId }`
     *     of the successfully sent messages.
     */
    encryptAndSendToDevices(userDeviceInfoArr: IOlmDevice<DeviceInfo>[], payload: object): Promise<void>;
    private onMembership;
    private onToDeviceEvent;
    /**
     * Handle a key event
     *
     * @internal
     * @param event - key event
     */
    private onRoomKeyEvent;
    /**
     * Handle a key withheld event
     *
     * @internal
     * @param event - key withheld event
     */
    private onRoomKeyWithheldEvent;
    /**
     * Handle a general key verification event.
     *
     * @internal
     * @param event - verification start event
     */
    private onKeyVerificationMessage;
    /**
     * Handle key verification requests sent as timeline events
     *
     * @internal
     * @param event - the timeline event
     * @param room - not used
     * @param atStart - not used
     * @param removed - not used
     * @param whether - this is a live event
     */
    private onTimelineEvent;
    private handleVerificationEvent;
    /**
     * Handle a toDevice event that couldn't be decrypted
     *
     * @internal
     * @param event - undecryptable event
     */
    private onToDeviceBadEncrypted;
    /**
     * Handle a change in the membership state of a member of a room
     *
     * @internal
     * @param event -  event causing the change
     * @param member -  user whose membership changed
     * @param oldMembership -  previous membership
     */
    private onRoomMembership;
    /**
     * Called when we get an m.room_key_request event.
     *
     * @internal
     * @param event - key request event
     */
    private onRoomKeyRequestEvent;
    /**
     * Process any m.room_key_request events which were queued up during the
     * current sync.
     *
     * @internal
     */
    private processReceivedRoomKeyRequests;
    /**
     * Helper for processReceivedRoomKeyRequests
     *
     */
    private processReceivedRoomKeyRequest;
    /**
     * Helper for processReceivedRoomKeyRequests
     *
     */
    private processReceivedRoomKeyRequestCancellation;
    /**
     * Get a decryptor for a given room and algorithm.
     *
     * If we already have a decryptor for the given room and algorithm, return
     * it. Otherwise try to instantiate it.
     *
     * @internal
     *
     * @param roomId -   room id for decryptor. If undefined, a temporary
     * decryptor is instantiated.
     *
     * @param algorithm -  crypto algorithm
     *
     * @throws {@link DecryptionError} if the algorithm is unknown
     */
    getRoomDecryptor(roomId: string | null, algorithm: string): DecryptionAlgorithm;
    /**
     * Get all the room decryptors for a given encryption algorithm.
     *
     * @param algorithm - The encryption algorithm
     *
     * @returns An array of room decryptors
     */
    private getRoomDecryptors;
    /**
     * sign the given object with our ed25519 key
     *
     * @param obj -  Object to which we will add a 'signatures' property
     */
    signObject<T extends ISignableObject & object>(obj: T): Promise<void>;
}
/**
 * Fix up the backup key, that may be in the wrong format due to a bug in a
 * migration step.  Some backup keys were stored as a comma-separated list of
 * integers, rather than a base64-encoded byte array.  If this function is
 * passed a string that looks like a list of integers rather than a base64
 * string, it will attempt to convert it to the right format.
 *
 * @param key - the key to check
 * @returns If the key is in the wrong format, then the fixed
 * key will be returned. Otherwise null will be returned.
 *
 */
export declare function fixBackupKey(key?: string): string | null;
/**
 * Represents a received m.room_key_request event
 */
export declare class IncomingRoomKeyRequest {
    /** user requesting the key */
    readonly userId: string;
    /** device requesting the key */
    readonly deviceId: string;
    /** unique id for the request */
    readonly requestId: string;
    readonly requestBody: IRoomKeyRequestBody;
    /**
     * callback which, when called, will ask
     *    the relevant crypto algorithm implementation to share the keys for
     *    this request.
     */
    share: () => void;
    constructor(event: MatrixEvent);
}
/**
 * Represents a received m.room_key_request cancellation
 */
declare class IncomingRoomKeyRequestCancellation {
    /** user requesting the cancellation */
    readonly userId: string;
    /** device requesting the cancellation */
    readonly deviceId: string;
    /** unique id for the request to be cancelled */
    readonly requestId: string;
    constructor(event: MatrixEvent);
}
export type { IEventDecryptionResult, IMegolmSessionData } from "../@types/crypto";
//# sourceMappingURL=index.d.ts.map