/**
 * This is an internal module. See {@link MatrixClient} for the public class.
 */
import { Optional } from "matrix-events-sdk";
import type { IMegolmSessionData } from "./@types/crypto";
import { ISyncStateData, SyncApi, SyncState } from "./sync";
import { EventStatus, IContent, IDecryptOptions, IEvent, MatrixEvent, MatrixEventEvent, MatrixEventHandlerMap } from "./models/event";
import { CallEvent, CallEventHandlerMap, MatrixCall } from "./webrtc/call";
import { Filter, IFilterDefinition } from "./filter";
import { CallEventHandlerEvent, CallEventHandler, CallEventHandlerEventHandlerMap } from "./webrtc/callEventHandler";
import { GroupCallEventHandlerEvent, GroupCallEventHandlerEventHandlerMap } from "./webrtc/groupCallEventHandler";
import { Direction, EventTimeline } from "./models/event-timeline";
import { IActionsObject, PushProcessor } from "./pushprocessor";
import { AutoDiscoveryAction } from "./autodiscovery";
import { IExportedDevice as IExportedOlmDevice } from "./crypto/OlmDevice";
import { IOlmDevice } from "./crypto/algorithms/megolm";
import { TypedReEmitter } from "./ReEmitter";
import { IRoomEncryption, RoomList } from "./crypto/RoomList";
import { SERVICE_TYPES } from "./service-types";
import { HttpApiEvent, HttpApiEventHandlerMap, Upload, UploadOpts, MatrixError, MatrixHttpApi, IHttpOpts, FileType, UploadResponse, IRequestOpts } from "./http-api";
import { Crypto, CryptoEvent, CryptoEventHandlerMap, ICryptoCallbacks, IBootstrapCrossSigningOpts, ICheckOwnCrossSigningTrustOpts, VerificationMethod } from "./crypto";
import { DeviceInfo, IDevice } from "./crypto/deviceinfo";
import { User, UserEvent, UserEventHandlerMap } from "./models/user";
import { IDehydratedDevice, IDehydratedDeviceKeyInfo, IDeviceKeys, IOneTimeKey } from "./crypto/dehydration";
import { IKeyBackupInfo, IKeyBackupPrepareOpts, IKeyBackupRestoreOpts, IKeyBackupRestoreResult } from "./crypto/keybackup";
import { IIdentityServerProvider } from "./@types/IIdentityServerProvider";
import { MatrixScheduler } from "./scheduler";
import { BeaconEvent, BeaconEventHandlerMap } from "./models/beacon";
import { IAuthData, IAuthDict } from "./interactive-auth";
import { IMinimalEvent, IRoomEvent, IStateEvent } from "./sync-accumulator";
import { CrossSigningKey, IAddSecretStorageKeyOpts, ICreateSecretStorageOpts, IEncryptedEventInfo, IImportRoomKeysOpts, IRecoveryKey, ISecretStorageKeyInfo } from "./crypto/api";
import { EventTimelineSet } from "./models/event-timeline-set";
import { VerificationRequest } from "./crypto/verification/request/VerificationRequest";
import { VerificationBase as Verification } from "./crypto/verification/Base";
import { CrossSigningInfo, DeviceTrustLevel, ICacheCallbacks, UserTrustLevel } from "./crypto/CrossSigning";
import { Room, RoomEvent, RoomEventHandlerMap, RoomNameState } from "./models/room";
import { RoomMemberEvent, RoomMemberEventHandlerMap } from "./models/room-member";
import { RoomStateEvent, RoomStateEventHandlerMap } from "./models/room-state";
import { IAddThreePidOnlyBody, IBindThreePidBody, ICreateRoomOpts, IEventSearchOpts, IGuestAccessOpts, IJoinRoomOpts, IPaginateOpts, IPresenceOpts, IRedactOpts, IRelationsRequestOpts, IRelationsResponse, IRoomDirectoryOptions, ISearchOpts, ISendEventResponse, ITagsResponse, IStatusResponse } from "./@types/requests";
import { EventType, RelationType, RoomType } from "./@types/event";
import { IdServerUnbindResult, IImageInfo, Preset, Visibility } from "./@types/partials";
import { EventMapper, MapperOpts } from "./event-mapper";
import { IKeyBackup, IKeyBackupCheck, IPreparedKeyBackupVersion, TrustInfo } from "./crypto/backup";
import { MSC3089TreeSpace } from "./models/MSC3089TreeSpace";
import { ISignatures } from "./@types/signed";
import { IStore } from "./store";
import { ISecretRequest } from "./crypto/SecretStorage";
import { IEventWithRoomId, ISearchRequestBody, ISearchResponse, ISearchResults, IStateEventWithRoomId } from "./@types/search";
import { ISynapseAdminDeactivateResponse, ISynapseAdminWhoisResponse } from "./@types/synapse";
import { IHierarchyRoom } from "./@types/spaces";
import { IPusher, IPusherRequest, IPushRule, IPushRules, PushRuleAction, PushRuleKind, RuleId } from "./@types/PushRules";
import { IThreepid } from "./@types/threepids";
import { CryptoStore, OutgoingRoomKeyRequest } from "./crypto/store/base";
import { GroupCall, IGroupCallDataChannelOptions, GroupCallIntent, GroupCallType } from "./webrtc/groupCall";
import { MediaHandler } from "./webrtc/mediaHandler";
import { GroupCallEventHandler } from "./webrtc/groupCallEventHandler";
import { LoginTokenPostResponse, ILoginFlowsResponse, IRefreshTokenResponse, SSOAction } from "./@types/auth";
import { TypedEventEmitter } from "./models/typed-event-emitter";
import { ReceiptType } from "./@types/read_receipts";
import { MSC3575SlidingSyncRequest, MSC3575SlidingSyncResponse, SlidingSync } from "./sliding-sync";
import { SlidingSyncSdk } from "./sliding-sync-sdk";
import { FeatureSupport, ThreadFilterType } from "./models/thread";
import { MBeaconInfoEventContent } from "./@types/beacon";
import { UnstableValue } from "./NamespacedValue";
import { ToDeviceBatch } from "./models/ToDeviceMessage";
import { IgnoredInvites } from "./models/invites-ignorer";
import { UIAResponse } from "./@types/uia";
import { LocalNotificationSettings } from "./@types/local_notifications";
import { Feature, ServerSupport } from "./feature";
export type Store = IStore;
export type ResetTimelineCallback = (roomId: string) => boolean;
export declare const CRYPTO_ENABLED: boolean;
export declare const UNSTABLE_MSC3852_LAST_SEEN_UA: UnstableValue<"last_seen_user_agent", "org.matrix.msc3852.last_seen_user_agent">;
interface IExportedDevice {
    olmDevice: IExportedOlmDevice;
    userId: string;
    deviceId: string;
}
export interface IKeysUploadResponse {
    one_time_key_counts: {
        [algorithm: string]: number;
    };
}
export interface ICreateClientOpts {
    baseUrl: string;
    idBaseUrl?: string;
    /**
     * The data store used for sync data from the homeserver. If not specified,
     * this client will not store any HTTP responses. The `createClient` helper
     * will create a default store if needed.
     */
    store?: Store;
    /**
     * A store to be used for end-to-end crypto session data. If not specified,
     * end-to-end crypto will be disabled. The `createClient` helper will create
     * a default store if needed. Calls the factory supplied to
     * {@link setCryptoStoreFactory} if unspecified; or if no factory has been
     * specified, uses a default implementation (indexeddb in the browser,
     * in-memory otherwise).
     */
    cryptoStore?: CryptoStore;
    /**
     * The scheduler to use. If not
     * specified, this client will not retry requests on failure. This client
     * will supply its own processing function to
     * {@link MatrixScheduler#setProcessFunction}.
     */
    scheduler?: MatrixScheduler;
    /**
     * The function to invoke for HTTP requests.
     * Most supported environments have a global `fetch` registered to which this will fall back.
     */
    fetchFn?: typeof global.fetch;
    userId?: string;
    /**
     * A unique identifier for this device; used for tracking things like crypto
     * keys and access tokens. If not specified, end-to-end encryption will be
     * disabled.
     */
    deviceId?: string;
    accessToken?: string;
    /**
     * Identity server provider to retrieve the user's access token when accessing
     * the identity server. See also https://github.com/vector-im/element-web/issues/10615
     * which seeks to replace the previous approach of manual access tokens params
     * with this callback throughout the SDK.
     */
    identityServer?: IIdentityServerProvider;
    /**
     * The default maximum amount of
     * time to wait before timing out HTTP requests. If not specified, there is no timeout.
     */
    localTimeoutMs?: number;
    /**
     * Set to true to use
     * Authorization header instead of query param to send the access token to the server.
     *
     * Default false.
     */
    useAuthorizationHeader?: boolean;
    /**
     * Set to true to enable
     * improved timeline support, see {@link MatrixClient#getEventTimeline}.
     * It is disabled by default for compatibility with older clients - in particular to
     * maintain support for back-paginating the live timeline after a '/sync'
     * result with a gap.
     */
    timelineSupport?: boolean;
    /**
     * Extra query parameters to append
     * to all requests with this client. Useful for application services which require
     * `?user_id=`.
     */
    queryParams?: Record<string, string>;
    /**
     * Device data exported with
     * "exportDevice" method that must be imported to recreate this device.
     * Should only be useful for devices with end-to-end crypto enabled.
     * If provided, deviceId and userId should **NOT** be provided at the top
     * level (they are present in the exported data).
     */
    deviceToImport?: IExportedDevice;
    /**
     * Key used to pickle olm objects or other sensitive data.
     */
    pickleKey?: string;
    verificationMethods?: Array<VerificationMethod>;
    /**
     * Whether relaying calls through a TURN server should be forced. Default false.
     */
    forceTURN?: boolean;
    /**
     * Up to this many ICE candidates will be gathered when an incoming call arrives.
     * Gathering does not send data to the caller, but will communicate with the configured TURN
     * server. Default 0.
     */
    iceCandidatePoolSize?: number;
    /**
     * True to advertise support for call transfers to other parties on Matrix calls. Default false.
     */
    supportsCallTransfer?: boolean;
    /**
     * Whether to allow a fallback ICE server should be used for negotiating a
     * WebRTC connection if the homeserver doesn't provide any servers. Defaults to false.
     */
    fallbackICEServerAllowed?: boolean;
    /**
     * If true, to-device signalling for group calls will be encrypted
     * with Olm. Default: true.
     */
    useE2eForGroupCall?: boolean;
    cryptoCallbacks?: ICryptoCallbacks;
    /**
     * Method to generate room names for empty rooms and rooms names based on membership.
     * Defaults to a built-in English handler with basic pluralisation.
     */
    roomNameGenerator?: (roomId: string, state: RoomNameState) => string | null;
}
export interface IMatrixClientCreateOpts extends ICreateClientOpts {
    /**
     * Whether to allow sending messages to encrypted rooms when encryption
     * is not available internally within this SDK. This is useful if you are using an external
     * E2E proxy, for example. Defaults to false.
     */
    usingExternalCrypto?: boolean;
}
export declare enum PendingEventOrdering {
    Chronological = "chronological",
    Detached = "detached"
}
export interface IStartClientOpts {
    /**
     * The event `limit=` to apply to initial sync. Default: 8.
     */
    initialSyncLimit?: number;
    /**
     * True to put `archived=true</code> on the <code>/initialSync` request. Default: false.
     */
    includeArchivedRooms?: boolean;
    /**
     * True to do /profile requests on every invite event if the displayname/avatar_url is not known for this user ID. Default: false.
     */
    resolveInvitesToProfiles?: boolean;
    /**
     * Controls where pending messages appear in a room's timeline. If "<b>chronological</b>", messages will
     * appear in the timeline when the call to `sendEvent` was made. If "<b>detached</b>",
     * pending messages will appear in a separate list, accessbile via {@link Room#getPendingEvents}.
     * Default: "chronological".
     */
    pendingEventOrdering?: PendingEventOrdering;
    /**
     * The number of milliseconds to wait on /sync. Default: 30000 (30 seconds).
     */
    pollTimeout?: number;
    /**
     * The filter to apply to /sync calls.
     */
    filter?: Filter;
    /**
     * True to perform syncing without automatically updating presence.
     */
    disablePresence?: boolean;
    /**
     * True to not load all membership events during initial sync but fetch them when needed by calling
     * `loadOutOfBandMembers` This will override the filter option at this moment.
     */
    lazyLoadMembers?: boolean;
    /**
     * The number of seconds between polls to /.well-known/matrix/client, undefined to disable.
     * This should be in the order of hours. Default: undefined.
     */
    clientWellKnownPollPeriod?: number;
    /**
     * @experimental
     */
    experimentalThreadSupport?: boolean;
    /**
     * @experimental
     */
    slidingSync?: SlidingSync;
}
export interface IStoredClientOpts extends IStartClientOpts {
    crypto?: Crypto;
    /**
     * A function which is called
     * with a room ID and returns a boolean. It should return 'true' if the SDK can
     * SAFELY remove events from this room. It may not be safe to remove events if
     * there are other references to the timelines for this room.
     */
    canResetEntireTimeline: ResetTimelineCallback;
}
export declare enum RoomVersionStability {
    Stable = "stable",
    Unstable = "unstable"
}
export interface IRoomVersionsCapability {
    default: string;
    available: Record<string, RoomVersionStability>;
}
export interface ICapability {
    enabled: boolean;
}
export interface IChangePasswordCapability extends ICapability {
}
export interface IThreadsCapability extends ICapability {
}
interface ICapabilities {
    [key: string]: any;
    "m.change_password"?: IChangePasswordCapability;
    "m.room_versions"?: IRoomVersionsCapability;
    "io.element.thread"?: IThreadsCapability;
}
export interface ICrossSigningKey {
    keys: {
        [algorithm: string]: string;
    };
    signatures?: ISignatures;
    usage: string[];
    user_id: string;
}
declare enum CrossSigningKeyType {
    MasterKey = "master_key",
    SelfSigningKey = "self_signing_key",
    UserSigningKey = "user_signing_key"
}
export type CrossSigningKeys = Record<CrossSigningKeyType, ICrossSigningKey>;
export interface ISignedKey {
    keys: Record<string, string>;
    signatures: ISignatures;
    user_id: string;
    algorithms: string[];
    device_id: string;
}
export type KeySignatures = Record<string, Record<string, ICrossSigningKey | ISignedKey>>;
export interface IUploadKeySignaturesResponse {
    failures: Record<string, Record<string, {
        errcode: string;
        error: string;
    }>>;
}
export interface IPreviewUrlResponse {
    [key: string]: undefined | string | number;
    "og:title": string;
    "og:type": string;
    "og:url": string;
    "og:image"?: string;
    "og:image:type"?: string;
    "og:image:height"?: number;
    "og:image:width"?: number;
    "og:description"?: string;
    "matrix:image:size"?: number;
}
export interface ITurnServerResponse {
    uris: string[];
    username: string;
    password: string;
    ttl: number;
}
export interface ITurnServer {
    urls: string[];
    username: string;
    credential: string;
}
export interface IServerVersions {
    versions: string[];
    unstable_features: Record<string, boolean>;
}
export declare const M_AUTHENTICATION: UnstableValue<"m.authentication", "org.matrix.msc2965.authentication">;
export interface IClientWellKnown {
    [key: string]: any;
    "m.homeserver"?: IWellKnownConfig;
    "m.identity_server"?: IWellKnownConfig;
    [M_AUTHENTICATION.name]?: IDelegatedAuthConfig;
}
export interface IWellKnownConfig {
    raw?: IClientWellKnown;
    action?: AutoDiscoveryAction;
    reason?: string;
    error?: Error | string;
    base_url?: string | null;
}
export interface IDelegatedAuthConfig {
    /** The OIDC Provider/issuer the client should use */
    issuer: string;
    /** The optional URL of the web UI where the user can manage their account */
    account?: string;
}
interface IMediaConfig {
    [key: string]: any;
    "m.upload.size"?: number;
}
interface ITagMetadata {
    [key: string]: any;
    order: number;
}
interface IMessagesResponse {
    start?: string;
    end?: string;
    chunk: IRoomEvent[];
    state?: IStateEvent[];
}
export interface IRequestTokenResponse {
    sid: string;
    submit_url?: string;
}
export interface IRequestMsisdnTokenResponse extends IRequestTokenResponse {
    msisdn: string;
    success: boolean;
    intl_fmt: string;
}
export interface IUploadKeysRequest {
    "device_keys"?: Required<IDeviceKeys>;
    "one_time_keys"?: Record<string, IOneTimeKey>;
    "org.matrix.msc2732.fallback_keys"?: Record<string, IOneTimeKey>;
}
export interface IQueryKeysRequest {
    device_keys: {
        [userId: string]: string[];
    };
    timeout?: number;
    token?: string;
}
export interface IClaimKeysRequest {
    one_time_keys: {
        [userId: string]: {
            [deviceId: string]: string;
        };
    };
    timeout?: number;
}
export interface IOpenIDToken {
    access_token: string;
    token_type: "Bearer" | string;
    matrix_server_name: string;
    expires_in: number;
}
interface IRoomInitialSyncResponse {
    room_id: string;
    membership: "invite" | "join" | "leave" | "ban";
    messages?: {
        start?: string;
        end?: string;
        chunk: IEventWithRoomId[];
    };
    state?: IStateEventWithRoomId[];
    visibility: Visibility;
    account_data?: IMinimalEvent[];
    presence: Partial<IEvent>;
}
interface IJoinedRoomsResponse {
    joined_rooms: string[];
}
interface IJoinedMembersResponse {
    joined: {
        [userId: string]: {
            display_name: string;
            avatar_url: string;
        };
    };
}
export interface IRegisterRequestParams {
    auth?: IAuthData;
    username?: string;
    password?: string;
    refresh_token?: boolean;
    guest_access_token?: string;
    x_show_msisdn?: boolean;
    bind_msisdn?: boolean;
    bind_email?: boolean;
    inhibit_login?: boolean;
    initial_device_display_name?: string;
}
export interface IPublicRoomsChunkRoom {
    room_id: string;
    name?: string;
    avatar_url?: string;
    topic?: string;
    canonical_alias?: string;
    aliases?: string[];
    world_readable: boolean;
    guest_can_join: boolean;
    num_joined_members: number;
    room_type?: RoomType | string;
}
interface IPublicRoomsResponse {
    chunk: IPublicRoomsChunkRoom[];
    next_batch?: string;
    prev_batch?: string;
    total_room_count_estimate?: number;
}
interface IUserDirectoryResponse {
    results: {
        user_id: string;
        display_name?: string;
        avatar_url?: string;
    }[];
    limited: boolean;
}
export interface IMyDevice {
    "device_id": string;
    "display_name"?: string;
    "last_seen_ip"?: string;
    "last_seen_ts"?: number;
    "last_seen_user_agent"?: string;
    "org.matrix.msc3852.last_seen_user_agent"?: string;
}
export interface Keys {
    keys: {
        [keyId: string]: string;
    };
    usage: string[];
    user_id: string;
}
export interface SigningKeys extends Keys {
    signatures: ISignatures;
}
export interface DeviceKeys {
    [deviceId: string]: IDeviceKeys & {
        unsigned?: {
            device_display_name: string;
        };
    };
}
export interface IDownloadKeyResult {
    failures: {
        [serverName: string]: object;
    };
    device_keys: {
        [userId: string]: DeviceKeys;
    };
    master_keys?: {
        [userId: string]: Keys;
    };
    self_signing_keys?: {
        [userId: string]: SigningKeys;
    };
    user_signing_keys?: {
        [userId: string]: SigningKeys;
    };
}
export interface IClaimOTKsResult {
    failures: {
        [serverName: string]: object;
    };
    one_time_keys: {
        [userId: string]: {
            [deviceId: string]: {
                [keyId: string]: {
                    key: string;
                    signatures: ISignatures;
                };
            };
        };
    };
}
export interface IFieldType {
    regexp: string;
    placeholder: string;
}
export interface IInstance {
    desc: string;
    icon?: string;
    fields: object;
    network_id: string;
    instance_id: string;
}
export interface IProtocol {
    user_fields: string[];
    location_fields: string[];
    icon: string;
    field_types: Record<string, IFieldType>;
    instances: IInstance[];
}
interface IThirdPartyLocation {
    alias: string;
    protocol: string;
    fields: object;
}
interface IThirdPartyUser {
    userid: string;
    protocol: string;
    fields: object;
}
interface IRoomSummary extends Omit<IPublicRoomsChunkRoom, "canonical_alias" | "aliases"> {
    room_type?: RoomType;
    membership?: string;
    is_encrypted: boolean;
}
interface IRoomHierarchy {
    rooms: IHierarchyRoom[];
    next_batch?: string;
}
interface ITimestampToEventResponse {
    event_id: string;
    origin_server_ts: string;
}
interface IWhoamiResponse {
    user_id: string;
    device_id?: string;
}
export declare enum ClientEvent {
    Sync = "sync",
    Event = "event",
    ToDeviceEvent = "toDeviceEvent",
    AccountData = "accountData",
    Room = "Room",
    DeleteRoom = "deleteRoom",
    SyncUnexpectedError = "sync.unexpectedError",
    ClientWellKnown = "WellKnown.client",
    ReceivedVoipEvent = "received_voip_event",
    TurnServers = "turnServers",
    TurnServersError = "turnServers.error"
}
type RoomEvents = RoomEvent.Name | RoomEvent.Redaction | RoomEvent.RedactionCancelled | RoomEvent.Receipt | RoomEvent.Tags | RoomEvent.LocalEchoUpdated | RoomEvent.HistoryImportedWithinTimeline | RoomEvent.AccountData | RoomEvent.MyMembership | RoomEvent.Timeline | RoomEvent.TimelineReset;
type RoomStateEvents = RoomStateEvent.Events | RoomStateEvent.Members | RoomStateEvent.NewMember | RoomStateEvent.Update | RoomStateEvent.Marker;
type CryptoEvents = CryptoEvent.KeySignatureUploadFailure | CryptoEvent.KeyBackupStatus | CryptoEvent.KeyBackupFailed | CryptoEvent.KeyBackupSessionsRemaining | CryptoEvent.RoomKeyRequest | CryptoEvent.RoomKeyRequestCancellation | CryptoEvent.VerificationRequest | CryptoEvent.DeviceVerificationChanged | CryptoEvent.UserTrustStatusChanged | CryptoEvent.KeysChanged | CryptoEvent.Warning | CryptoEvent.DevicesUpdated | CryptoEvent.WillUpdateDevices;
type MatrixEventEvents = MatrixEventEvent.Decrypted | MatrixEventEvent.Replaced | MatrixEventEvent.VisibilityChange;
type RoomMemberEvents = RoomMemberEvent.Name | RoomMemberEvent.Typing | RoomMemberEvent.PowerLevel | RoomMemberEvent.Membership;
type UserEvents = UserEvent.AvatarUrl | UserEvent.DisplayName | UserEvent.Presence | UserEvent.CurrentlyActive | UserEvent.LastPresenceTs;
export type EmittedEvents = ClientEvent | RoomEvents | RoomStateEvents | CryptoEvents | MatrixEventEvents | RoomMemberEvents | UserEvents | CallEvent | CallEventHandlerEvent.Incoming | GroupCallEventHandlerEvent.Incoming | GroupCallEventHandlerEvent.Outgoing | GroupCallEventHandlerEvent.Ended | GroupCallEventHandlerEvent.Participants | HttpApiEvent.SessionLoggedOut | HttpApiEvent.NoConsent | BeaconEvent;
export type ClientEventHandlerMap = {
    /**
     * Fires whenever the SDK's syncing state is updated. The state can be one of:
     * <ul>
     *
     * <li>PREPARED: The client has synced with the server at least once and is
     * ready for methods to be called on it. This will be immediately followed by
     * a state of SYNCING. <i>This is the equivalent of "syncComplete" in the
     * previous API.</i></li>
     *
     * <li>CATCHUP: The client has detected the connection to the server might be
     * available again and will now try to do a sync again. As this sync might take
     * a long time (depending how long ago was last synced, and general server
     * performance) the client is put in this mode so the UI can reflect trying
     * to catch up with the server after losing connection.</li>
     *
     * <li>SYNCING : The client is currently polling for new events from the server.
     * This will be called <i>after</i> processing latest events from a sync.</li>
     *
     * <li>ERROR : The client has had a problem syncing with the server. If this is
     * called <i>before</i> PREPARED then there was a problem performing the initial
     * sync. If this is called <i>after</i> PREPARED then there was a problem polling
     * the server for updates. This may be called multiple times even if the state is
     * already ERROR. <i>This is the equivalent of "syncError" in the previous
     * API.</i></li>
     *
     * <li>RECONNECTING: The sync connection has dropped, but not (yet) in a way that
     * should be considered erroneous.
     * </li>
     *
     * <li>STOPPED: The client has stopped syncing with server due to stopClient
     * being called.
     * </li>
     * </ul>
     * State transition diagram:
     * ```
     *                                          +---->STOPPED
     *                                          |
     *              +----->PREPARED -------> SYNCING <--+
     *              |                        ^  |  ^    |
     *              |      CATCHUP ----------+  |  |    |
     *              |        ^                  V  |    |
     *   null ------+        |  +------- RECONNECTING   |
     *              |        V  V                       |
     *              +------->ERROR ---------------------+
     *
     * NB: 'null' will never be emitted by this event.
     *
     * ```
     * Transitions:
     * <ul>
     *
     * <li>`null -> PREPARED` : Occurs when the initial sync is completed
     * first time. This involves setting up filters and obtaining push rules.
     *
     * <li>`null -> ERROR` : Occurs when the initial sync failed first time.
     *
     * <li>`ERROR -> PREPARED` : Occurs when the initial sync succeeds
     * after previously failing.
     *
     * <li>`PREPARED -> SYNCING` : Occurs immediately after transitioning
     * to PREPARED. Starts listening for live updates rather than catching up.
     *
     * <li>`SYNCING -> RECONNECTING` : Occurs when the live update fails.
     *
     * <li>`RECONNECTING -> RECONNECTING` : Can occur if the update calls
     * continue to fail, but the keepalive calls (to /versions) succeed.
     *
     * <li>`RECONNECTING -> ERROR` : Occurs when the keepalive call also fails
     *
     * <li>`ERROR -> SYNCING` : Occurs when the client has performed a
     * live update after having previously failed.
     *
     * <li>`ERROR -> ERROR` : Occurs when the client has failed to keepalive
     * for a second time or more.</li>
     *
     * <li>`SYNCING -> SYNCING` : Occurs when the client has performed a live
     * update. This is called <i>after</i> processing.</li>
     *
     * <li>`* -> STOPPED` : Occurs once the client has stopped syncing or
     * trying to sync after stopClient has been called.</li>
     * </ul>
     *
     * @param state - An enum representing the syncing state. One of "PREPARED",
     * "SYNCING", "ERROR", "STOPPED".
     *
     * @param prevState - An enum representing the previous syncing state.
     * One of "PREPARED", "SYNCING", "ERROR", "STOPPED" <b>or null</b>.
     *
     * @param data - Data about this transition.
     *
     * @example
     * ```
     * matrixClient.on("sync", function(state, prevState, data) {
     *   switch (state) {
     *     case "ERROR":
     *       // update UI to say "Connection Lost"
     *       break;
     *     case "SYNCING":
     *       // update UI to remove any "Connection Lost" message
     *       break;
     *     case "PREPARED":
     *       // the client instance is ready to be queried.
     *       var rooms = matrixClient.getRooms();
     *       break;
     *   }
     * });
     * ```
     */
    [ClientEvent.Sync]: (state: SyncState, lastState: SyncState | null, data?: ISyncStateData) => void;
    /**
     * Fires whenever the SDK receives a new event.
     * <p>
     * This is only fired for live events received via /sync - it is not fired for
     * events received over context, search, or pagination APIs.
     *
     * @param event - The matrix event which caused this event to fire.
     * @example
     * ```
     * matrixClient.on("event", function(event){
     *   var sender = event.getSender();
     * });
     * ```
     */
    [ClientEvent.Event]: (event: MatrixEvent) => void;
    /**
     * Fires whenever the SDK receives a new to-device event.
     * @param event - The matrix event which caused this event to fire.
     * @example
     * ```
     * matrixClient.on("toDeviceEvent", function(event){
     *   var sender = event.getSender();
     * });
     * ```
     */
    [ClientEvent.ToDeviceEvent]: (event: MatrixEvent) => void;
    /**
     * Fires whenever new user-scoped account_data is added.
     * @param event - The event describing the account_data just added
     * @param event - The previous account data, if known.
     * @example
     * ```
     * matrixClient.on("accountData", function(event, oldEvent){
     *   myAccountData[event.type] = event.content;
     * });
     * ```
     */
    [ClientEvent.AccountData]: (event: MatrixEvent, lastEvent?: MatrixEvent) => void;
    /**
     * Fires whenever a new Room is added. This will fire when you are invited to a
     * room, as well as when you join a room. <strong>This event is experimental and
     * may change.</strong>
     * @param room - The newly created, fully populated room.
     * @example
     * ```
     * matrixClient.on("Room", function(room){
     *   var roomId = room.roomId;
     * });
     * ```
     */
    [ClientEvent.Room]: (room: Room) => void;
    /**
     * Fires whenever a Room is removed. This will fire when you forget a room.
     * <strong>This event is experimental and may change.</strong>
     * @param roomId - The deleted room ID.
     * @example
     * ```
     * matrixClient.on("deleteRoom", function(roomId){
     *   // update UI from getRooms()
     * });
     * ```
     */
    [ClientEvent.DeleteRoom]: (roomId: string) => void;
    [ClientEvent.SyncUnexpectedError]: (error: Error) => void;
    /**
     * Fires when the client .well-known info is fetched.
     *
     * @param data - The JSON object returned by the server
     */
    [ClientEvent.ClientWellKnown]: (data: IClientWellKnown) => void;
    [ClientEvent.ReceivedVoipEvent]: (event: MatrixEvent) => void;
    [ClientEvent.TurnServers]: (servers: ITurnServer[]) => void;
    [ClientEvent.TurnServersError]: (error: Error, fatal: boolean) => void;
} & RoomEventHandlerMap & RoomStateEventHandlerMap & CryptoEventHandlerMap & MatrixEventHandlerMap & RoomMemberEventHandlerMap & UserEventHandlerMap & CallEventHandlerEventHandlerMap & GroupCallEventHandlerEventHandlerMap & CallEventHandlerMap & HttpApiEventHandlerMap & BeaconEventHandlerMap;
/**
 * Represents a Matrix Client. Only directly construct this if you want to use
 * custom modules. Normally, {@link createClient} should be used
 * as it specifies 'sensible' defaults for these modules.
 */
export declare class MatrixClient extends TypedEventEmitter<EmittedEvents, ClientEventHandlerMap> {
    static readonly RESTORE_BACKUP_ERROR_BAD_KEY = "RESTORE_BACKUP_ERROR_BAD_KEY";
    reEmitter: TypedReEmitter<EmittedEvents, ClientEventHandlerMap>;
    olmVersion: [number, number, number] | null;
    usingExternalCrypto: boolean;
    store: Store;
    deviceId: string | null;
    credentials: {
        userId: string | null;
    };
    pickleKey?: string;
    scheduler?: MatrixScheduler;
    clientRunning: boolean;
    timelineSupport: boolean;
    urlPreviewCache: {
        [key: string]: Promise<IPreviewUrlResponse>;
    };
    identityServer?: IIdentityServerProvider;
    http: MatrixHttpApi<IHttpOpts & {
        onlyData: true;
    }>;
    crypto?: Crypto;
    private cryptoBackend?;
    cryptoCallbacks: ICryptoCallbacks;
    callEventHandler?: CallEventHandler;
    groupCallEventHandler?: GroupCallEventHandler;
    supportsCallTransfer: boolean;
    forceTURN: boolean;
    iceCandidatePoolSize: number;
    idBaseUrl?: string;
    baseUrl: string;
    protected canSupportVoip: boolean;
    protected peekSync: SyncApi | null;
    protected isGuestAccount: boolean;
    protected ongoingScrollbacks: {
        [roomId: string]: {
            promise?: Promise<Room>;
            errorTs?: number;
        };
    };
    protected notifTimelineSet: EventTimelineSet | null;
    protected cryptoStore?: CryptoStore;
    protected verificationMethods?: VerificationMethod[];
    protected fallbackICEServerAllowed: boolean;
    protected roomList: RoomList;
    protected syncApi?: SlidingSyncSdk | SyncApi;
    roomNameGenerator?: ICreateClientOpts["roomNameGenerator"];
    pushRules?: IPushRules;
    protected syncLeftRoomsPromise?: Promise<Room[]>;
    protected syncedLeftRooms: boolean;
    protected clientOpts?: IStoredClientOpts;
    protected clientWellKnownIntervalID?: ReturnType<typeof setInterval>;
    protected canResetTimelineCallback?: ResetTimelineCallback;
    canSupport: Map<Feature, ServerSupport>;
    protected pushProcessor: PushProcessor;
    protected serverVersionsPromise?: Promise<IServerVersions>;
    cachedCapabilities?: {
        capabilities: ICapabilities;
        expiration: number;
    };
    protected clientWellKnown?: IClientWellKnown;
    protected clientWellKnownPromise?: Promise<IClientWellKnown>;
    protected turnServers: ITurnServer[];
    protected turnServersExpiry: number;
    protected checkTurnServersIntervalID?: ReturnType<typeof setInterval>;
    protected exportedOlmDeviceToImport?: IExportedOlmDevice;
    protected txnCtr: number;
    protected mediaHandler: MediaHandler;
    protected sessionId: string;
    protected pendingEventEncryption: Map<string, Promise<void>>;
    private useE2eForGroupCall;
    private toDeviceMessageQueue;
    readonly ignoredInvites: IgnoredInvites;
    constructor(opts: IMatrixClientCreateOpts);
    /**
     * High level helper method to begin syncing and poll for new events. To listen for these
     * events, add a listener for {@link ClientEvent.Event}
     * via {@link MatrixClient#on}. Alternatively, listen for specific
     * state change events.
     * @param opts - Options to apply when syncing.
     */
    startClient(opts?: IStartClientOpts): Promise<void>;
    /**
     * High level helper method to stop the client from polling and allow a
     * clean shutdown.
     */
    stopClient(): void;
    /**
     * Try to rehydrate a device if available.  The client must have been
     * initialized with a `cryptoCallback.getDehydrationKey` option, and this
     * function must be called before initCrypto and startClient are called.
     *
     * @returns Promise which resolves to undefined if a device could not be dehydrated, or
     *     to the new device ID if the dehydration was successful.
     * @returns Rejects: with an error response.
     */
    rehydrateDevice(): Promise<string | undefined>;
    /**
     * Get the current dehydrated device, if any
     * @returns A promise of an object containing the dehydrated device
     */
    getDehydratedDevice(): Promise<IDehydratedDevice | undefined>;
    /**
     * Set the dehydration key.  This will also periodically dehydrate devices to
     * the server.
     *
     * @param key - the dehydration key
     * @param keyInfo - Information about the key.  Primarily for
     *     information about how to generate the key from a passphrase.
     * @param deviceDisplayName - The device display name for the
     *     dehydrated device.
     * @returns A promise that resolves when the dehydrated device is stored.
     */
    setDehydrationKey(key: Uint8Array, keyInfo: IDehydratedDeviceKeyInfo, deviceDisplayName?: string): Promise<void>;
    /**
     * Creates a new dehydrated device (without queuing periodic dehydration)
     * @param key - the dehydration key
     * @param keyInfo - Information about the key.  Primarily for
     *     information about how to generate the key from a passphrase.
     * @param deviceDisplayName - The device display name for the
     *     dehydrated device.
     * @returns the device id of the newly created dehydrated device
     */
    createDehydratedDevice(key: Uint8Array, keyInfo: IDehydratedDeviceKeyInfo, deviceDisplayName?: string): Promise<string | undefined>;
    exportDevice(): Promise<IExportedDevice | undefined>;
    /**
     * Clear any data out of the persistent stores used by the client.
     *
     * @returns Promise which resolves when the stores have been cleared.
     */
    clearStores(): Promise<void>;
    /**
     * Get the user-id of the logged-in user
     *
     * @returns MXID for the logged-in user, or null if not logged in
     */
    getUserId(): string | null;
    /**
     * Get the user-id of the logged-in user
     *
     * @returns MXID for the logged-in user
     * @throws Error if not logged in
     */
    getSafeUserId(): string;
    /**
     * Get the domain for this client's MXID
     * @returns Domain of this MXID
     */
    getDomain(): string | null;
    /**
     * Get the local part of the current user ID e.g. "foo" in "\@foo:bar".
     * @returns The user ID localpart or null.
     */
    getUserIdLocalpart(): string | null;
    /**
     * Get the device ID of this client
     * @returns device ID
     */
    getDeviceId(): string | null;
    /**
     * Get the session ID of this client
     * @returns session ID
     */
    getSessionId(): string;
    /**
     * Check if the runtime environment supports VoIP calling.
     * @returns True if VoIP is supported.
     */
    supportsVoip(): boolean;
    /**
     * @returns
     */
    getMediaHandler(): MediaHandler;
    /**
     * Set whether VoIP calls are forced to use only TURN
     * candidates. This is the same as the forceTURN option
     * when creating the client.
     * @param force - True to force use of TURN servers
     */
    setForceTURN(force: boolean): void;
    /**
     * Set whether to advertise transfer support to other parties on Matrix calls.
     * @param support - True to advertise the 'm.call.transferee' capability
     */
    setSupportsCallTransfer(support: boolean): void;
    /**
     * Returns true if to-device signalling for group calls will be encrypted with Olm.
     * If false, it will be sent unencrypted.
     * @returns boolean Whether group call signalling will be encrypted
     */
    getUseE2eForGroupCall(): boolean;
    /**
     * Creates a new call.
     * The place*Call methods on the returned call can be used to actually place a call
     *
     * @param roomId - The room the call is to be placed in.
     * @returns the call or null if the browser doesn't support calling.
     */
    createCall(roomId: string): MatrixCall | null;
    /**
     * Creates a new group call and sends the associated state event
     * to alert other members that the room now has a group call.
     *
     * @param roomId - The room the call is to be placed in.
     */
    createGroupCall(roomId: string, type: GroupCallType, isPtt: boolean, intent: GroupCallIntent, dataChannelsEnabled?: boolean, dataChannelOptions?: IGroupCallDataChannelOptions): Promise<GroupCall>;
    /**
     * Wait until an initial state for the given room has been processed by the
     * client and the client is aware of any ongoing group calls. Awaiting on
     * the promise returned by this method before calling getGroupCallForRoom()
     * avoids races where getGroupCallForRoom is called before the state for that
     * room has been processed. It does not, however, fix other races, eg. two
     * clients both creating a group call at the same time.
     * @param roomId - The room ID to wait for
     * @returns A promise that resolves once existing group calls in the room
     *          have been processed.
     */
    waitUntilRoomReadyForGroupCalls(roomId: string): Promise<void>;
    /**
     * Get an existing group call for the provided room.
     * @returns The group call or null if it doesn't already exist.
     */
    getGroupCallForRoom(roomId: string): GroupCall | null;
    /**
     * Get the current sync state.
     * @returns the sync state, which may be null.
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
    /**
     * Whether the initial sync has completed.
     * @returns True if at least one sync has happened.
     */
    isInitialSyncComplete(): boolean;
    /**
     * Return whether the client is configured for a guest account.
     * @returns True if this is a guest access_token (or no token is supplied).
     */
    isGuest(): boolean;
    /**
     * Set whether this client is a guest account. <b>This method is experimental
     * and may change without warning.</b>
     * @param guest - True if this is a guest account.
     */
    setGuest(guest: boolean): void;
    /**
     * Return the provided scheduler, if any.
     * @returns The scheduler or undefined
     */
    getScheduler(): MatrixScheduler | undefined;
    /**
     * Retry a backed off syncing request immediately. This should only be used when
     * the user <b>explicitly</b> attempts to retry their lost connection.
     * Will also retry any outbound to-device messages currently in the queue to be sent
     * (retries of regular outgoing events are handled separately, per-event).
     * @returns True if this resulted in a request being retried.
     */
    retryImmediately(): boolean;
    /**
     * Return the global notification EventTimelineSet, if any
     *
     * @returns the globl notification EventTimelineSet
     */
    getNotifTimelineSet(): EventTimelineSet | null;
    /**
     * Set the global notification EventTimelineSet
     *
     */
    setNotifTimelineSet(set: EventTimelineSet): void;
    /**
     * Gets the capabilities of the homeserver. Always returns an object of
     * capability keys and their options, which may be empty.
     * @param fresh - True to ignore any cached values.
     * @returns Promise which resolves to the capabilities of the homeserver
     * @returns Rejects: with an error response.
     */
    getCapabilities(fresh?: boolean): Promise<ICapabilities>;
    /**
     * Initialise support for end-to-end encryption in this client, using libolm.
     *
     * You should call this method after creating the matrixclient, but *before*
     * calling `startClient`, if you want to support end-to-end encryption.
     *
     * It will return a Promise which will resolve when the crypto layer has been
     * successfully initialised.
     */
    initCrypto(): Promise<void>;
    /**
     * Initialise support for end-to-end encryption in this client, using the rust matrix-sdk-crypto.
     *
     * An alternative to {@link initCrypto}.
     *
     * *WARNING*: this API is very experimental, should not be used in production, and may change without notice!
     *    Eventually it will be deprecated and `initCrypto` will do the same thing.
     *
     * @experimental
     *
     * @returns a Promise which will resolve when the crypto layer has been
     *    successfully initialised.
     */
    initRustCrypto(): Promise<void>;
    /**
     * Is end-to-end crypto enabled for this client.
     * @returns True if end-to-end is enabled.
     */
    isCryptoEnabled(): boolean;
    /**
     * Get the Ed25519 key for this device
     *
     * @returns base64-encoded ed25519 key. Null if crypto is
     *    disabled.
     */
    getDeviceEd25519Key(): string | null;
    /**
     * Get the Curve25519 key for this device
     *
     * @returns base64-encoded curve25519 key. Null if crypto is
     *    disabled.
     */
    getDeviceCurve25519Key(): string | null;
    /**
     * @deprecated Does nothing.
     */
    uploadKeys(): Promise<void>;
    /**
     * Download the keys for a list of users and stores the keys in the session
     * store.
     * @param userIds - The users to fetch.
     * @param forceDownload - Always download the keys even if cached.
     *
     * @returns A promise which resolves to a map userId-\>deviceId-\>{@link DeviceInfo}
     */
    downloadKeys(userIds: string[], forceDownload?: boolean): Promise<Record<string, Record<string, IDevice>>>;
    /**
     * Get the stored device keys for a user id
     *
     * @param userId - the user to list keys for.
     *
     * @returns list of devices
     */
    getStoredDevicesForUser(userId: string): DeviceInfo[];
    /**
     * Get the stored device key for a user id and device id
     *
     * @param userId - the user to list keys for.
     * @param deviceId - unique identifier for the device
     *
     * @returns device or null
     */
    getStoredDevice(userId: string, deviceId: string): DeviceInfo | null;
    /**
     * Mark the given device as verified
     *
     * @param userId - owner of the device
     * @param deviceId - unique identifier for the device or user's
     * cross-signing public key ID.
     *
     * @param verified - whether to mark the device as verified. defaults
     *   to 'true'.
     *
     * @returns
     *
     * @remarks
     * Fires {@link CryptoEvent#DeviceVerificationChanged}
     */
    setDeviceVerified(userId: string, deviceId: string, verified?: boolean): Promise<void>;
    /**
     * Mark the given device as blocked/unblocked
     *
     * @param userId - owner of the device
     * @param deviceId - unique identifier for the device or user's
     * cross-signing public key ID.
     *
     * @param blocked - whether to mark the device as blocked. defaults
     *   to 'true'.
     *
     * @returns
     *
     * @remarks
     * Fires {@link CryptoEvent.DeviceVerificationChanged}
     */
    setDeviceBlocked(userId: string, deviceId: string, blocked?: boolean): Promise<void>;
    /**
     * Mark the given device as known/unknown
     *
     * @param userId - owner of the device
     * @param deviceId - unique identifier for the device or user's
     * cross-signing public key ID.
     *
     * @param known - whether to mark the device as known. defaults
     *   to 'true'.
     *
     * @returns
     *
     * @remarks
     * Fires {@link CryptoEvent#DeviceVerificationChanged}
     */
    setDeviceKnown(userId: string, deviceId: string, known?: boolean): Promise<void>;
    private setDeviceVerification;
    /**
     * Request a key verification from another user, using a DM.
     *
     * @param userId - the user to request verification with
     * @param roomId - the room to use for verification
     *
     * @returns resolves to a VerificationRequest
     *    when the request has been sent to the other party.
     */
    requestVerificationDM(userId: string, roomId: string): Promise<VerificationRequest>;
    /**
     * Finds a DM verification request that is already in progress for the given room id
     *
     * @param roomId - the room to use for verification
     *
     * @returns the VerificationRequest that is in progress, if any
     */
    findVerificationRequestDMInProgress(roomId: string): VerificationRequest | undefined;
    /**
     * Returns all to-device verification requests that are already in progress for the given user id
     *
     * @param userId - the ID of the user to query
     *
     * @returns the VerificationRequests that are in progress
     */
    getVerificationRequestsToDeviceInProgress(userId: string): VerificationRequest[];
    /**
     * Request a key verification from another user.
     *
     * @param userId - the user to request verification with
     * @param devices - array of device IDs to send requests to.  Defaults to
     *    all devices owned by the user
     *
     * @returns resolves to a VerificationRequest
     *    when the request has been sent to the other party.
     */
    requestVerification(userId: string, devices?: string[]): Promise<VerificationRequest>;
    /**
     * Begin a key verification.
     *
     * @param method - the verification method to use
     * @param userId - the user to verify keys with
     * @param deviceId - the device to verify
     *
     * @returns a verification object
     * @deprecated Use `requestVerification` instead.
     */
    beginKeyVerification(method: string, userId: string, deviceId: string): Verification<any, any>;
    checkSecretStorageKey(key: Uint8Array, info: ISecretStorageKeyInfo): Promise<boolean>;
    /**
     * Set the global override for whether the client should ever send encrypted
     * messages to unverified devices.  This provides the default for rooms which
     * do not specify a value.
     *
     * @param value - whether to blacklist all unverified devices by default
     */
    setGlobalBlacklistUnverifiedDevices(value: boolean): boolean;
    /**
     * @returns whether to blacklist all unverified devices by default
     */
    getGlobalBlacklistUnverifiedDevices(): boolean;
    /**
     * Set whether sendMessage in a room with unknown and unverified devices
     * should throw an error and not send them message. This has 'Global' for
     * symmetry with setGlobalBlacklistUnverifiedDevices but there is currently
     * no room-level equivalent for this setting.
     *
     * This API is currently UNSTABLE and may change or be removed without notice.
     *
     * @param value - whether error on unknown devices
     */
    setGlobalErrorOnUnknownDevices(value: boolean): void;
    /**
     * @returns whether to error on unknown devices
     *
     * This API is currently UNSTABLE and may change or be removed without notice.
     */
    getGlobalErrorOnUnknownDevices(): boolean;
    /**
     * Get the user's cross-signing key ID.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param type - The type of key to get the ID of.  One of
     *     "master", "self_signing", or "user_signing".  Defaults to "master".
     *
     * @returns the key ID
     */
    getCrossSigningId(type?: CrossSigningKey | string): string | null;
    /**
     * Get the cross signing information for a given user.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param userId - the user ID to get the cross-signing info for.
     *
     * @returns the cross signing information for the user.
     */
    getStoredCrossSigningForUser(userId: string): CrossSigningInfo | null;
    /**
     * Check whether a given user is trusted.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param userId - The ID of the user to check.
     *
     * @returns
     */
    checkUserTrust(userId: string): UserTrustLevel;
    /**
     * Check whether a given device is trusted.
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param userId - The ID of the user whose devices is to be checked.
     * @param deviceId - The ID of the device to check
     */
    checkDeviceTrust(userId: string, deviceId: string): DeviceTrustLevel;
    /**
     * Check whether one of our own devices is cross-signed by our
     * user's stored keys, regardless of whether we trust those keys yet.
     *
     * @param deviceId - The ID of the device to check
     *
     * @returns true if the device is cross-signed
     */
    checkIfOwnDeviceCrossSigned(deviceId: string): boolean;
    /**
     * Check the copy of our cross-signing key that we have in the device list and
     * see if we can get the private key. If so, mark it as trusted.
     * @param opts - ICheckOwnCrossSigningTrustOpts object
     */
    checkOwnCrossSigningTrust(opts?: ICheckOwnCrossSigningTrustOpts): Promise<void>;
    /**
     * Checks that a given cross-signing private key matches a given public key.
     * This can be used by the getCrossSigningKey callback to verify that the
     * private key it is about to supply is the one that was requested.
     * @param privateKey - The private key
     * @param expectedPublicKey - The public key
     * @returns true if the key matches, otherwise false
     */
    checkCrossSigningPrivateKey(privateKey: Uint8Array, expectedPublicKey: string): boolean;
    legacyDeviceVerification(userId: string, deviceId: string, method: VerificationMethod): Promise<VerificationRequest>;
    /**
     * Perform any background tasks that can be done before a message is ready to
     * send, in order to speed up sending of the message.
     * @param room - the room the event is in
     */
    prepareToEncrypt(room: Room): void;
    /**
     * Checks if the user has previously published cross-signing keys
     *
     * This means downloading the devicelist for the user and checking if the list includes
     * the cross-signing pseudo-device.
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
     * @returns True if cross-signing is ready to be used on this device
     */
    isCrossSigningReady(): Promise<boolean>;
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
     */
    bootstrapCrossSigning(opts: IBootstrapCrossSigningOpts): Promise<void>;
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
     *
     * @param val - True to trust cross-signed devices
     */
    setCryptoTrustCrossSignedDevices(val: boolean): void;
    /**
     * Counts the number of end to end session keys that are waiting to be backed up
     * @returns Promise which resolves to the number of sessions requiring backup
     */
    countSessionsNeedingBackup(): Promise<number>;
    /**
     * Get information about the encryption of an event
     *
     * @param event - event to be checked
     * @returns The event information.
     */
    getEventEncryptionInfo(event: MatrixEvent): IEncryptedEventInfo;
    /**
     * Create a recovery key from a user-supplied passphrase.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
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
     */
    bootstrapSecretStorage(opts: ICreateSecretStorageOpts): Promise<void>;
    /**
     * Add a key for encrypting secrets.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param algorithm - the algorithm used by the key
     * @param opts - the options for the algorithm.  The properties used
     *     depend on the algorithm given.
     * @param keyName - the name of the key.  If not given, a random name will be generated.
     *
     * @returns An object with:
     *     keyId: the ID of the key
     *     keyInfo: details about the key (iv, mac, passphrase)
     */
    addSecretStorageKey(algorithm: string, opts: IAddSecretStorageKeyOpts, keyName?: string): Promise<{
        keyId: string;
        keyInfo: ISecretStorageKeyInfo;
    }>;
    /**
     * Check whether we have a key with a given ID.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param keyId - The ID of the key to check
     *     for. Defaults to the default key ID if not provided.
     * @returns Whether we have the key.
     */
    hasSecretStorageKey(keyId?: string): Promise<boolean>;
    /**
     * Store an encrypted secret on the server.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param name - The name of the secret
     * @param secret - The secret contents.
     * @param keys - The IDs of the keys to use to encrypt the secret or null/undefined
     *     to use the default (will throw if no default key is set).
     */
    storeSecret(name: string, secret: string, keys?: string[]): Promise<void>;
    /**
     * Get a secret from storage.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param name - the name of the secret
     *
     * @returns the contents of the secret
     */
    getSecret(name: string): Promise<string | undefined>;
    /**
     * Check if a secret is stored on the server.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param name - the name of the secret
     * @returns map of key name to key info the secret is encrypted
     *     with, or null if it is not present or not encrypted with a trusted
     *     key
     */
    isSecretStored(name: string): Promise<Record<string, ISecretStorageKeyInfo> | null>;
    /**
     * Request a secret from another device.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param name - the name of the secret to request
     * @param devices - the devices to request the secret from
     *
     * @returns the secret request object
     */
    requestSecret(name: string, devices: string[]): ISecretRequest;
    /**
     * Get the current default key ID for encrypting secrets.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @returns The default key ID or null if no default key ID is set
     */
    getDefaultSecretStorageKeyId(): Promise<string | null>;
    /**
     * Set the current default key ID for encrypting secrets.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param keyId - The new default key ID
     */
    setDefaultSecretStorageKeyId(keyId: string): Promise<void>;
    /**
     * Checks that a given secret storage private key matches a given public key.
     * This can be used by the getSecretStorageKey callback to verify that the
     * private key it is about to supply is the one that was requested.
     *
     * The Secure Secret Storage API is currently UNSTABLE and may change without notice.
     *
     * @param privateKey - The private key
     * @param expectedPublicKey - The public key
     * @returns true if the key matches, otherwise false
     */
    checkSecretStoragePrivateKey(privateKey: Uint8Array, expectedPublicKey: string): boolean;
    /**
     * Get e2e information on the device that sent an event
     *
     * @param event - event to be checked
     */
    getEventSenderDeviceInfo(event: MatrixEvent): Promise<DeviceInfo | null>;
    /**
     * Check if the sender of an event is verified
     *
     * @param event - event to be checked
     *
     * @returns true if the sender of this event has been verified using
     * {@link MatrixClient#setDeviceVerified}.
     */
    isEventSenderVerified(event: MatrixEvent): Promise<boolean>;
    /**
     * Get outgoing room key request for this event if there is one.
     * @param event - The event to check for
     *
     * @returns A room key request, or null if there is none
     */
    getOutgoingRoomKeyRequest(event: MatrixEvent): Promise<OutgoingRoomKeyRequest | null>;
    /**
     * Cancel a room key request for this event if one is ongoing and resend the
     * request.
     * @param event - event of which to cancel and resend the room
     *                            key request.
     * @returns A promise that will resolve when the key request is queued
     */
    cancelAndResendEventRoomKeyRequest(event: MatrixEvent): Promise<void>;
    /**
     * Enable end-to-end encryption for a room. This does not modify room state.
     * Any messages sent before the returned promise resolves will be sent unencrypted.
     * @param roomId - The room ID to enable encryption in.
     * @param config - The encryption config for the room.
     * @returns A promise that will resolve when encryption is set up.
     */
    setRoomEncryption(roomId: string, config: IRoomEncryption): Promise<void>;
    /**
     * Whether encryption is enabled for a room.
     * @param roomId - the room id to query.
     * @returns whether encryption is enabled.
     */
    isRoomEncrypted(roomId: string): boolean;
    /**
     * Encrypts and sends a given object via Olm to-device messages to a given
     * set of devices.
     *
     * @param userDeviceMap - mapping from userId to deviceInfo
     *
     * @param payload - fields to include in the encrypted payload
     *
     * @returns Promise which
     *     resolves once the message has been encrypted and sent to the given
     *     userDeviceMap, and returns the `{ contentMap, deviceInfoByDeviceId }`
     *     of the successfully sent messages.
     */
    encryptAndSendToDevices(userDeviceInfoArr: IOlmDevice<DeviceInfo>[], payload: object): Promise<void>;
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
     * Get a list containing all of the room keys
     *
     * This should be encrypted before returning it to the user.
     *
     * @returns a promise which resolves to a list of
     *    session export objects
     */
    exportRoomKeys(): Promise<IMegolmSessionData[]>;
    /**
     * Import a list of room keys previously exported by exportRoomKeys
     *
     * @param keys - a list of session export objects
     *
     * @returns a promise which resolves when the keys have been imported
     */
    importRoomKeys(keys: IMegolmSessionData[], opts?: IImportRoomKeysOpts): Promise<void>;
    /**
     * Force a re-check of the local key backup status against
     * what's on the server.
     *
     * @returns Object with backup info (as returned by
     *     getKeyBackupVersion) in backupInfo and
     *     trust information (as returned by isKeyBackupTrusted)
     *     in trustInfo.
     */
    checkKeyBackup(): Promise<IKeyBackupCheck | null>;
    /**
     * Get information about the current key backup.
     * @returns Information object from API or null
     */
    getKeyBackupVersion(): Promise<IKeyBackupInfo | null>;
    /**
     * @param info - key backup info dict from getKeyBackupVersion()
     */
    isKeyBackupTrusted(info: IKeyBackupInfo): Promise<TrustInfo>;
    /**
     * @returns true if the client is configured to back up keys to
     *     the server, otherwise false. If we haven't completed a successful check
     *     of key backup status yet, returns null.
     */
    getKeyBackupEnabled(): boolean | null;
    /**
     * Enable backing up of keys, using data previously returned from
     * getKeyBackupVersion.
     *
     * @param info - Backup information object as returned by getKeyBackupVersion
     * @returns Promise which resolves when complete.
     */
    enableKeyBackup(info: IKeyBackupInfo): Promise<void>;
    /**
     * Disable backing up of keys.
     */
    disableKeyBackup(): void;
    /**
     * Set up the data required to create a new backup version.  The backup version
     * will not be created and enabled until createKeyBackupVersion is called.
     *
     * @param password - Passphrase string that can be entered by the user
     *     when restoring the backup as an alternative to entering the recovery key.
     *     Optional.
     *
     * @returns Object that can be passed to createKeyBackupVersion and
     *     additionally has a 'recovery_key' member with the user-facing recovery key string.
     */
    prepareKeyBackupVersion(password?: string | Uint8Array | null, opts?: IKeyBackupPrepareOpts): Promise<Pick<IPreparedKeyBackupVersion, "algorithm" | "auth_data" | "recovery_key">>;
    /**
     * Check whether the key backup private key is stored in secret storage.
     * @returns map of key name to key info the secret is
     *     encrypted with, or null if it is not present or not encrypted with a
     *     trusted key
     */
    isKeyBackupKeyStored(): Promise<Record<string, ISecretStorageKeyInfo> | null>;
    /**
     * Create a new key backup version and enable it, using the information return
     * from prepareKeyBackupVersion.
     *
     * @param info - Info object from prepareKeyBackupVersion
     * @returns Object with 'version' param indicating the version created
     */
    createKeyBackupVersion(info: IKeyBackupInfo): Promise<IKeyBackupInfo>;
    deleteKeyBackupVersion(version: string): Promise<void>;
    private makeKeyBackupPath;
    /**
     * Back up session keys to the homeserver.
     * @param roomId - ID of the room that the keys are for Optional.
     * @param sessionId - ID of the session that the keys are for Optional.
     * @param version - backup version Optional.
     * @param data - Object keys to send
     * @returns a promise that will resolve when the keys
     * are uploaded
     */
    sendKeyBackup(roomId: undefined, sessionId: undefined, version: string | undefined, data: IKeyBackup): Promise<void>;
    sendKeyBackup(roomId: string, sessionId: undefined, version: string | undefined, data: IKeyBackup): Promise<void>;
    sendKeyBackup(roomId: string, sessionId: string, version: string | undefined, data: IKeyBackup): Promise<void>;
    /**
     * Marks all group sessions as needing to be backed up and schedules them to
     * upload in the background as soon as possible.
     */
    scheduleAllGroupSessionsForBackup(): Promise<void>;
    /**
     * Marks all group sessions as needing to be backed up without scheduling
     * them to upload in the background.
     * @returns Promise which resolves to the number of sessions requiring a backup.
     */
    flagAllGroupSessionsForBackup(): Promise<number>;
    isValidRecoveryKey(recoveryKey: string): boolean;
    /**
     * Get the raw key for a key backup from the password
     * Used when migrating key backups into SSSS
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param password - Passphrase
     * @param backupInfo - Backup metadata from `checkKeyBackup`
     * @returns key backup key
     */
    keyBackupKeyFromPassword(password: string, backupInfo: IKeyBackupInfo): Promise<Uint8Array>;
    /**
     * Get the raw key for a key backup from the recovery key
     * Used when migrating key backups into SSSS
     *
     * The cross-signing API is currently UNSTABLE and may change without notice.
     *
     * @param recoveryKey - The recovery key
     * @returns key backup key
     */
    keyBackupKeyFromRecoveryKey(recoveryKey: string): Uint8Array;
    /**
     * Restore from an existing key backup via a passphrase.
     *
     * @param password - Passphrase
     * @param targetRoomId - Room ID to target a specific room.
     * Restores all rooms if omitted.
     * @param targetSessionId - Session ID to target a specific session.
     * Restores all sessions if omitted.
     * @param backupInfo - Backup metadata from `checkKeyBackup`
     * @param opts - Optional params such as callbacks
     * @returns Status of restoration with `total` and `imported`
     * key counts.
     */
    restoreKeyBackupWithPassword(password: string, targetRoomId: undefined, targetSessionId: undefined, backupInfo: IKeyBackupInfo, opts: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithPassword(password: string, targetRoomId: string, targetSessionId: undefined, backupInfo: IKeyBackupInfo, opts: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithPassword(password: string, targetRoomId: string, targetSessionId: string, backupInfo: IKeyBackupInfo, opts: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    /**
     * Restore from an existing key backup via a private key stored in secret
     * storage.
     *
     * @param backupInfo - Backup metadata from `checkKeyBackup`
     * @param targetRoomId - Room ID to target a specific room.
     * Restores all rooms if omitted.
     * @param targetSessionId - Session ID to target a specific session.
     * Restores all sessions if omitted.
     * @param opts - Optional params such as callbacks
     * @returns Status of restoration with `total` and `imported`
     * key counts.
     */
    restoreKeyBackupWithSecretStorage(backupInfo: IKeyBackupInfo, targetRoomId?: string, targetSessionId?: string, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    /**
     * Restore from an existing key backup via an encoded recovery key.
     *
     * @param recoveryKey - Encoded recovery key
     * @param targetRoomId - Room ID to target a specific room.
     * Restores all rooms if omitted.
     * @param targetSessionId - Session ID to target a specific session.
     * Restores all sessions if omitted.
     * @param backupInfo - Backup metadata from `checkKeyBackup`
     * @param opts - Optional params such as callbacks

     * @returns Status of restoration with `total` and `imported`
     * key counts.
     */
    restoreKeyBackupWithRecoveryKey(recoveryKey: string, targetRoomId: undefined, targetSessionId: undefined, backupInfo: IKeyBackupInfo, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithRecoveryKey(recoveryKey: string, targetRoomId: string, targetSessionId: undefined, backupInfo: IKeyBackupInfo, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithRecoveryKey(recoveryKey: string, targetRoomId: string, targetSessionId: string, backupInfo: IKeyBackupInfo, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithCache(targetRoomId: undefined, targetSessionId: undefined, backupInfo: IKeyBackupInfo, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithCache(targetRoomId: string, targetSessionId: undefined, backupInfo: IKeyBackupInfo, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    restoreKeyBackupWithCache(targetRoomId: string, targetSessionId: string, backupInfo: IKeyBackupInfo, opts?: IKeyBackupRestoreOpts): Promise<IKeyBackupRestoreResult>;
    private restoreKeyBackup;
    deleteKeysFromBackup(roomId: undefined, sessionId: undefined, version?: string): Promise<void>;
    deleteKeysFromBackup(roomId: string, sessionId: undefined, version?: string): Promise<void>;
    deleteKeysFromBackup(roomId: string, sessionId: string, version?: string): Promise<void>;
    /**
     * Share shared-history decryption keys with the given users.
     *
     * @param roomId - the room for which keys should be shared.
     * @param userIds - a list of users to share with.  The keys will be sent to
     *     all of the user's current devices.
     */
    sendSharedHistoryKeys(roomId: string, userIds: string[]): Promise<void>;
    /**
     * Get the config for the media repository.
     * @returns Promise which resolves with an object containing the config.
     */
    getMediaConfig(): Promise<IMediaConfig>;
    /**
     * Get the room for the given room ID.
     * This function will return a valid room for any room for which a Room event
     * has been emitted. Note in particular that other events, eg. RoomState.members
     * will be emitted for a room before this function will return the given room.
     * @param roomId - The room ID
     * @returns The Room or null if it doesn't exist or there is no data store.
     */
    getRoom(roomId: string | undefined): Room | null;
    /**
     * Retrieve all known rooms.
     * @returns A list of rooms, or an empty list if there is no data store.
     */
    getRooms(): Room[];
    /**
     * Retrieve all rooms that should be displayed to the user
     * This is essentially getRooms() with some rooms filtered out, eg. old versions
     * of rooms that have been replaced or (in future) other rooms that have been
     * marked at the protocol level as not to be displayed to the user.
     * @returns A list of rooms, or an empty list if there is no data store.
     */
    getVisibleRooms(): Room[];
    /**
     * Retrieve a user.
     * @param userId - The user ID to retrieve.
     * @returns A user or null if there is no data store or the user does
     * not exist.
     */
    getUser(userId: string): User | null;
    /**
     * Retrieve all known users.
     * @returns A list of users, or an empty list if there is no data store.
     */
    getUsers(): User[];
    /**
     * Set account data event for the current user.
     * It will retry the request up to 5 times.
     * @param eventType - The event type
     * @param content - the contents object for the event
     * @returns Promise which resolves: an empty object
     * @returns Rejects: with an error response.
     */
    setAccountData(eventType: EventType | string, content: IContent): Promise<{}>;
    /**
     * Get account data event of given type for the current user.
     * @param eventType - The event type
     * @returns The contents of the given account data event
     */
    getAccountData(eventType: string): MatrixEvent | undefined;
    /**
     * Get account data event of given type for the current user. This variant
     * gets account data directly from the homeserver if the local store is not
     * ready, which can be useful very early in startup before the initial sync.
     * @param eventType - The event type
     * @returns Promise which resolves: The contents of the given account data event.
     * @returns Rejects: with an error response.
     */
    getAccountDataFromServer<T extends {
        [k: string]: any;
    }>(eventType: string): Promise<T | null>;
    deleteAccountData(eventType: string): Promise<void>;
    /**
     * Gets the users that are ignored by this client
     * @returns The array of users that are ignored (empty if none)
     */
    getIgnoredUsers(): string[];
    /**
     * Sets the users that the current user should ignore.
     * @param userIds - the user IDs to ignore
     * @returns Promise which resolves: an empty object
     * @returns Rejects: with an error response.
     */
    setIgnoredUsers(userIds: string[]): Promise<{}>;
    /**
     * Gets whether or not a specific user is being ignored by this client.
     * @param userId - the user ID to check
     * @returns true if the user is ignored, false otherwise
     */
    isUserIgnored(userId: string): boolean;
    /**
     * Join a room. If you have already joined the room, this will no-op.
     * @param roomIdOrAlias - The room ID or room alias to join.
     * @param opts - Options when joining the room.
     * @returns Promise which resolves: Room object.
     * @returns Rejects: with an error response.
     */
    joinRoom(roomIdOrAlias: string, opts?: IJoinRoomOpts): Promise<Room>;
    /**
     * Resend an event. Will also retry any to-device messages waiting to be sent.
     * @param event - The event to resend.
     * @param room - Optional. The room the event is in. Will update the
     * timeline entry if provided.
     * @returns Promise which resolves: to an ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    resendEvent(event: MatrixEvent, room: Room): Promise<ISendEventResponse>;
    /**
     * Cancel a queued or unsent event.
     *
     * @param event -   Event to cancel
     * @throws Error if the event is not in QUEUED, NOT_SENT or ENCRYPTING state
     */
    cancelPendingEvent(event: MatrixEvent): void;
    /**
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    setRoomName(roomId: string, name: string): Promise<ISendEventResponse>;
    /**
     * @param htmlTopic - Optional.
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    setRoomTopic(roomId: string, topic: string, htmlTopic?: string): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: to an object keyed by tagId with objects containing a numeric order field.
     * @returns Rejects: with an error response.
     */
    getRoomTags(roomId: string): Promise<ITagsResponse>;
    /**
     * @param tagName - name of room tag to be set
     * @param metadata - associated with that tag to be stored
     * @returns Promise which resolves: to an empty object
     * @returns Rejects: with an error response.
     */
    setRoomTag(roomId: string, tagName: string, metadata: ITagMetadata): Promise<{}>;
    /**
     * @param tagName - name of room tag to be removed
     * @returns Promise which resolves: to an empty object
     * @returns Rejects: with an error response.
     */
    deleteRoomTag(roomId: string, tagName: string): Promise<{}>;
    /**
     * @param eventType - event type to be set
     * @param content - event content
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    setRoomAccountData(roomId: string, eventType: string, content: Record<string, any>): Promise<{}>;
    /**
     * Set a power level to one or multiple users.
     * @returns Promise which resolves: to an ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    setPowerLevel(roomId: string, userId: string | string[], powerLevel: number, event: MatrixEvent): Promise<ISendEventResponse>;
    /**
     * Create an m.beacon_info event
     * @returns
     */
    unstable_createLiveBeacon(roomId: Room["roomId"], beaconInfoContent: MBeaconInfoEventContent): Promise<ISendEventResponse>;
    /**
     * Upsert a live beacon event
     * using a specific m.beacon_info.* event variable type
     * @param roomId - string
     * @returns
     */
    unstable_setLiveBeacon(roomId: string, beaconInfoContent: MBeaconInfoEventContent): Promise<ISendEventResponse>;
    sendEvent(roomId: string, eventType: string, content: IContent, txnId?: string): Promise<ISendEventResponse>;
    sendEvent(roomId: string, threadId: string | null, eventType: string, content: IContent, txnId?: string): Promise<ISendEventResponse>;
    /**
     * @param eventObject - An object with the partial structure of an event, to which event_id, user_id, room_id and origin_server_ts will be added.
     * @param txnId - Optional.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    private sendCompleteEvent;
    /**
     * encrypts the event if necessary; adds the event to the queue, or sends it; marks the event as sent/unsent
     * @returns returns a promise which resolves with the result of the send request
     */
    protected encryptAndSendEvent(room: Room | null, event: MatrixEvent): Promise<ISendEventResponse>;
    private encryptEventIfNeeded;
    /**
     * Returns the eventType that should be used taking encryption into account
     * for a given eventType.
     * @param roomId - the room for the events `eventType` relates to
     * @param eventType - the event type
     * @returns the event type taking encryption into account
     */
    private getEncryptedIfNeededEventType;
    protected updatePendingEventStatus(room: Room | null, event: MatrixEvent, newStatus: EventStatus): void;
    private sendEventHttpRequest;
    /**
     * @param txnId -  transaction id. One will be made up if not supplied.
     * @param opts - Options to pass on, may contain `reason` and `with_relations` (MSC3912)
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     * @throws Error if called with `with_relations` (MSC3912) but the server does not support it.
     *         Callers should check whether the server supports MSC3912 via `MatrixClient.canSupport`.
     */
    redactEvent(roomId: string, eventId: string, txnId?: string | undefined, opts?: IRedactOpts): Promise<ISendEventResponse>;
    redactEvent(roomId: string, threadId: string | null, eventId: string, txnId?: string | undefined, opts?: IRedactOpts): Promise<ISendEventResponse>;
    /**
     * @param txnId - Optional.
     * @returns Promise which resolves: to an ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendMessage(roomId: string, content: IContent, txnId?: string): Promise<ISendEventResponse>;
    sendMessage(roomId: string, threadId: string | null, content: IContent, txnId?: string): Promise<ISendEventResponse>;
    /**
     * @param txnId - Optional.
     * @returns
     * @returns Rejects: with an error response.
     */
    sendTextMessage(roomId: string, body: string, txnId?: string): Promise<ISendEventResponse>;
    sendTextMessage(roomId: string, threadId: string | null, body: string, txnId?: string): Promise<ISendEventResponse>;
    /**
     * @param txnId - Optional.
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendNotice(roomId: string, body: string, txnId?: string): Promise<ISendEventResponse>;
    sendNotice(roomId: string, threadId: string | null, body: string, txnId?: string): Promise<ISendEventResponse>;
    /**
     * @param txnId - Optional.
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendEmoteMessage(roomId: string, body: string, txnId?: string): Promise<ISendEventResponse>;
    sendEmoteMessage(roomId: string, threadId: string | null, body: string, txnId?: string): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendImageMessage(roomId: string, url: string, info?: IImageInfo, text?: string): Promise<ISendEventResponse>;
    sendImageMessage(roomId: string, threadId: string | null, url: string, info?: IImageInfo, text?: string): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendStickerMessage(roomId: string, url: string, info?: IImageInfo, text?: string): Promise<ISendEventResponse>;
    sendStickerMessage(roomId: string, threadId: string | null, url: string, info?: IImageInfo, text?: string): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendHtmlMessage(roomId: string, body: string, htmlBody: string): Promise<ISendEventResponse>;
    sendHtmlMessage(roomId: string, threadId: string | null, body: string, htmlBody: string): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendHtmlNotice(roomId: string, body: string, htmlBody: string): Promise<ISendEventResponse>;
    sendHtmlNotice(roomId: string, threadId: string | null, body: string, htmlBody: string): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: to a ISendEventResponse object
     * @returns Rejects: with an error response.
     */
    sendHtmlEmote(roomId: string, body: string, htmlBody: string): Promise<ISendEventResponse>;
    sendHtmlEmote(roomId: string, threadId: string | null, body: string, htmlBody: string): Promise<ISendEventResponse>;
    /**
     * Send a receipt.
     * @param event - The event being acknowledged
     * @param receiptType - The kind of receipt e.g. "m.read". Other than
     * ReceiptType.Read are experimental!
     * @param body - Additional content to send alongside the receipt.
     * @param unthreaded - An unthreaded receipt will clear room+thread notifications
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    sendReceipt(event: MatrixEvent, receiptType: ReceiptType, body: any, unthreaded?: boolean): Promise<{}>;
    /**
     * Send a read receipt.
     * @param event - The event that has been read.
     * @param receiptType - other than ReceiptType.Read are experimental! Optional.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    sendReadReceipt(event: MatrixEvent | null, receiptType?: ReceiptType, unthreaded?: boolean): Promise<{} | undefined>;
    /**
     * Set a marker to indicate the point in a room before which the user has read every
     * event. This can be retrieved from room account data (the event type is `m.fully_read`)
     * and displayed as a horizontal line in the timeline that is visually distinct to the
     * position of the user's own read receipt.
     * @param roomId - ID of the room that has been read
     * @param rmEventId - ID of the event that has been read
     * @param rrEvent - the event tracked by the read receipt. This is here for
     * convenience because the RR and the RM are commonly updated at the same time as each
     * other. The local echo of this receipt will be done if set. Optional.
     * @param rpEvent - the m.read.private read receipt event for when we don't
     * want other users to see the read receipts. This is experimental. Optional.
     * @returns Promise which resolves: the empty object, `{}`.
     */
    setRoomReadMarkers(roomId: string, rmEventId: string, rrEvent?: MatrixEvent, rpEvent?: MatrixEvent): Promise<{}>;
    /**
     * Get a preview of the given URL as of (roughly) the given point in time,
     * described as an object with OpenGraph keys and associated values.
     * Attributes may be synthesized where actual OG metadata is lacking.
     * Caches results to prevent hammering the server.
     * @param url - The URL to get preview data for
     * @param ts - The preferred point in time that the preview should
     * describe (ms since epoch).  The preview returned will either be the most
     * recent one preceding this timestamp if available, or failing that the next
     * most recent available preview.
     * @returns Promise which resolves: Object of OG metadata.
     * @returns Rejects: with an error response.
     * May return synthesized attributes if the URL lacked OG meta.
     */
    getUrlPreview(url: string, ts: number): Promise<IPreviewUrlResponse>;
    /**
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    sendTyping(roomId: string, isTyping: boolean, timeoutMs: number): Promise<{}>;
    /**
     * Determines the history of room upgrades for a given room, as far as the
     * client can see. Returns an array of Rooms where the first entry is the
     * oldest and the last entry is the newest (likely current) room. If the
     * provided room is not found, this returns an empty list. This works in
     * both directions, looking for older and newer rooms of the given room.
     * @param roomId - The room ID to search from
     * @param verifyLinks - If true, the function will only return rooms
     * which can be proven to be linked. For example, rooms which have a create
     * event pointing to an old room which the client is not aware of or doesn't
     * have a matching tombstone would not be returned.
     * @returns An array of rooms representing the upgrade
     * history.
     */
    getRoomUpgradeHistory(roomId: string, verifyLinks?: boolean): Room[];
    /**
     * @param reason - Optional.
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    invite(roomId: string, userId: string, reason?: string): Promise<{}>;
    /**
     * Invite a user to a room based on their email address.
     * @param roomId - The room to invite the user to.
     * @param email - The email address to invite.
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    inviteByEmail(roomId: string, email: string): Promise<{}>;
    /**
     * Invite a user to a room based on a third-party identifier.
     * @param roomId - The room to invite the user to.
     * @param medium - The medium to invite the user e.g. "email".
     * @param address - The address for the specified medium.
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    inviteByThreePid(roomId: string, medium: string, address: string): Promise<{}>;
    /**
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    leave(roomId: string): Promise<{}>;
    /**
     * Leaves all rooms in the chain of room upgrades based on the given room. By
     * default, this will leave all the previous and upgraded rooms, including the
     * given room. To only leave the given room and any previous rooms, keeping the
     * upgraded (modern) rooms untouched supply `false` to `includeFuture`.
     * @param roomId - The room ID to start leaving at
     * @param includeFuture - If true, the whole chain (past and future) of
     * upgraded rooms will be left.
     * @returns Promise which resolves when completed with an object keyed
     * by room ID and value of the error encountered when leaving or null.
     */
    leaveRoomChain(roomId: string, includeFuture?: boolean): Promise<{
        [roomId: string]: Error | MatrixError | null;
    }>;
    /**
     * @param reason - Optional.
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    ban(roomId: string, userId: string, reason?: string): Promise<{}>;
    /**
     * @param deleteRoom - True to delete the room from the store on success.
     * Default: true.
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    forget(roomId: string, deleteRoom?: boolean): Promise<{}>;
    /**
     * @returns Promise which resolves: Object (currently empty)
     * @returns Rejects: with an error response.
     */
    unban(roomId: string, userId: string): Promise<{}>;
    /**
     * @param reason - Optional.
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    kick(roomId: string, userId: string, reason?: string): Promise<{}>;
    private membershipChange;
    /**
     * Obtain a dict of actions which should be performed for this event according
     * to the push rules for this user.  Caches the dict on the event.
     * @param event - The event to get push actions for.
     * @param forceRecalculate - forces to recalculate actions for an event
     * Useful when an event just got decrypted
     * @returns A dict of actions to perform.
     */
    getPushActionsForEvent(event: MatrixEvent, forceRecalculate?: boolean): IActionsObject | null;
    /**
     * @param info - The kind of info to set (e.g. 'avatar_url')
     * @param data - The JSON object to set.
     * @returns
     * @returns Rejects: with an error response.
     */
    setProfileInfo(info: "avatar_url", data: {
        avatar_url: string;
    }): Promise<{}>;
    setProfileInfo(info: "displayname", data: {
        displayname: string;
    }): Promise<{}>;
    /**
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    setDisplayName(name: string): Promise<{}>;
    /**
     * @returns Promise which resolves: `{}` an empty object.
     * @returns Rejects: with an error response.
     */
    setAvatarUrl(url: string): Promise<{}>;
    /**
     * Turn an MXC URL into an HTTP one. <strong>This method is experimental and
     * may change.</strong>
     * @param mxcUrl - The MXC URL
     * @param width - The desired width of the thumbnail.
     * @param height - The desired height of the thumbnail.
     * @param resizeMethod - The thumbnail resize method to use, either
     * "crop" or "scale".
     * @param allowDirectLinks - If true, return any non-mxc URLs
     * directly. Fetching such URLs will leak information about the user to
     * anyone they share a room with. If false, will return null for such URLs.
     * @returns the avatar URL or null.
     */
    mxcUrlToHttp(mxcUrl: string, width?: number, height?: number, resizeMethod?: string, allowDirectLinks?: boolean): string | null;
    /**
     * @param opts - Options to apply
     * @returns Promise which resolves
     * @returns Rejects: with an error response.
     * @throws If 'presence' isn't a valid presence enum value.
     */
    setPresence(opts: IPresenceOpts): Promise<void>;
    /**
     * @param userId - The user to get presence for
     * @returns Promise which resolves: The presence state for this user.
     * @returns Rejects: with an error response.
     */
    getPresence(userId: string): Promise<IStatusResponse>;
    /**
     * Retrieve older messages from the given room and put them in the timeline.
     *
     * If this is called multiple times whilst a request is ongoing, the <i>same</i>
     * Promise will be returned. If there was a problem requesting scrollback, there
     * will be a small delay before another request can be made (to prevent tight-looping
     * when there is no connection).
     *
     * @param room - The room to get older messages in.
     * @param limit - Optional. The maximum number of previous events to
     * pull in. Default: 30.
     * @returns Promise which resolves: Room. If you are at the beginning
     * of the timeline, `Room.oldState.paginationToken` will be
     * `null`.
     * @returns Rejects: with an error response.
     */
    scrollback(room: Room, limit?: number): Promise<Room>;
    getEventMapper(options?: MapperOpts): EventMapper;
    /**
     * Get an EventTimeline for the given event
     *
     * <p>If the EventTimelineSet object already has the given event in its store, the
     * corresponding timeline will be returned. Otherwise, a /context request is
     * made, and used to construct an EventTimeline.
     * If the event does not belong to this EventTimelineSet then undefined will be returned.
     *
     * @param timelineSet -  The timelineSet to look for the event in, must be bound to a room
     * @param eventId -  The ID of the event to look for
     *
     * @returns Promise which resolves:
     *    {@link EventTimeline} including the given event
     */
    getEventTimeline(timelineSet: EventTimelineSet, eventId: string): Promise<Optional<EventTimeline>>;
    getThreadTimeline(timelineSet: EventTimelineSet, eventId: string): Promise<EventTimeline | undefined>;
    /**
     * Get an EventTimeline for the latest events in the room. This will just
     * call `/messages` to get the latest message in the room, then use
     * `client.getEventTimeline(...)` to construct a new timeline from it.
     *
     * @param timelineSet -  The timelineSet to find or add the timeline to
     *
     * @returns Promise which resolves:
     *    {@link EventTimeline} timeline with the latest events in the room
     */
    getLatestTimeline(timelineSet: EventTimelineSet): Promise<Optional<EventTimeline>>;
    /**
     * Makes a request to /messages with the appropriate lazy loading filter set.
     * XXX: if we do get rid of scrollback (as it's not used at the moment),
     * we could inline this method again in paginateEventTimeline as that would
     * then be the only call-site
     * @param limit - the maximum amount of events the retrieve
     * @param dir - 'f' or 'b'
     * @param timelineFilter - the timeline filter to pass
     */
    createMessagesRequest(roomId: string, fromToken: string | null, limit: number | undefined, dir: Direction, timelineFilter?: Filter): Promise<IMessagesResponse>;
    /**
     * Makes a request to /messages with the appropriate lazy loading filter set.
     * XXX: if we do get rid of scrollback (as it's not used at the moment),
     * we could inline this method again in paginateEventTimeline as that would
     * then be the only call-site
     * @param limit - the maximum amount of events the retrieve
     * @param dir - 'f' or 'b'
     * @param timelineFilter - the timeline filter to pass
     */
    createThreadListMessagesRequest(roomId: string, fromToken: string | null, limit?: number, dir?: Direction, threadListType?: ThreadFilterType | null, timelineFilter?: Filter): Promise<IMessagesResponse>;
    /**
     * Take an EventTimeline, and back/forward-fill results.
     *
     * @param eventTimeline - timeline object to be updated
     *
     * @returns Promise which resolves to a boolean: false if there are no
     *    events and we reached either end of the timeline; else true.
     */
    paginateEventTimeline(eventTimeline: EventTimeline, opts: IPaginateOpts): Promise<boolean>;
    /**
     * Reset the notifTimelineSet entirely, paginating in some historical notifs as
     * a starting point for subsequent pagination.
     */
    resetNotifTimelineSet(): void;
    /**
     * Peek into a room and receive updates about the room. This only works if the
     * history visibility for the room is world_readable.
     * @param roomId - The room to attempt to peek into.
     * @returns Promise which resolves: Room object
     * @returns Rejects: with an error response.
     */
    peekInRoom(roomId: string): Promise<Room>;
    /**
     * Stop any ongoing room peeking.
     */
    stopPeeking(): void;
    /**
     * Set r/w flags for guest access in a room.
     * @param roomId - The room to configure guest access in.
     * @param opts - Options
     * @returns Promise which resolves
     * @returns Rejects: with an error response.
     */
    setGuestAccess(roomId: string, opts: IGuestAccessOpts): Promise<void>;
    /**
     * Requests an email verification token for the purposes of registration.
     * This API requests a token from the homeserver.
     * The doesServerRequireIdServerParam() method can be used to determine if
     * the server requires the id_server parameter to be provided.
     *
     * Parameters and return value are as for requestEmailToken

     * @param email - As requestEmailToken
     * @param clientSecret - As requestEmailToken
     * @param sendAttempt - As requestEmailToken
     * @param nextLink - As requestEmailToken
     * @returns Promise which resolves: As requestEmailToken
     */
    requestRegisterEmailToken(email: string, clientSecret: string, sendAttempt: number, nextLink?: string): Promise<IRequestTokenResponse>;
    /**
     * Requests a text message verification token for the purposes of registration.
     * This API requests a token from the homeserver.
     * The doesServerRequireIdServerParam() method can be used to determine if
     * the server requires the id_server parameter to be provided.
     *
     * @param phoneCountry - The ISO 3166-1 alpha-2 code for the country in which
     *    phoneNumber should be parsed relative to.
     * @param phoneNumber - The phone number, in national or international format
     * @param clientSecret - As requestEmailToken
     * @param sendAttempt - As requestEmailToken
     * @param nextLink - As requestEmailToken
     * @returns Promise which resolves: As requestEmailToken
     */
    requestRegisterMsisdnToken(phoneCountry: string, phoneNumber: string, clientSecret: string, sendAttempt: number, nextLink?: string): Promise<IRequestMsisdnTokenResponse>;
    /**
     * Requests an email verification token for the purposes of adding a
     * third party identifier to an account.
     * This API requests a token from the homeserver.
     * The doesServerRequireIdServerParam() method can be used to determine if
     * the server requires the id_server parameter to be provided.
     * If an account with the given email address already exists and is
     * associated with an account other than the one the user is authed as,
     * it will either send an email to the address informing them of this
     * or return M_THREEPID_IN_USE (which one is up to the homeserver).
     *
     * @param email - As requestEmailToken
     * @param clientSecret - As requestEmailToken
     * @param sendAttempt - As requestEmailToken
     * @param nextLink - As requestEmailToken
     * @returns Promise which resolves: As requestEmailToken
     */
    requestAdd3pidEmailToken(email: string, clientSecret: string, sendAttempt: number, nextLink?: string): Promise<IRequestTokenResponse>;
    /**
     * Requests a text message verification token for the purposes of adding a
     * third party identifier to an account.
     * This API proxies the identity server /validate/email/requestToken API,
     * adding specific behaviour for the addition of phone numbers to an
     * account, as requestAdd3pidEmailToken.
     *
     * @param phoneCountry - As requestRegisterMsisdnToken
     * @param phoneNumber - As requestRegisterMsisdnToken
     * @param clientSecret - As requestEmailToken
     * @param sendAttempt - As requestEmailToken
     * @param nextLink - As requestEmailToken
     * @returns Promise which resolves: As requestEmailToken
     */
    requestAdd3pidMsisdnToken(phoneCountry: string, phoneNumber: string, clientSecret: string, sendAttempt: number, nextLink?: string): Promise<IRequestMsisdnTokenResponse>;
    /**
     * Requests an email verification token for the purposes of resetting
     * the password on an account.
     * This API proxies the identity server /validate/email/requestToken API,
     * adding specific behaviour for the password resetting. Specifically,
     * if no account with the given email address exists, it may either
     * return M_THREEPID_NOT_FOUND or send an email
     * to the address informing them of this (which one is up to the homeserver).
     *
     * requestEmailToken calls the equivalent API directly on the identity server,
     * therefore bypassing the password reset specific logic.
     *
     * @param email - As requestEmailToken
     * @param clientSecret - As requestEmailToken
     * @param sendAttempt - As requestEmailToken
     * @param nextLink - As requestEmailToken
     * @returns Promise which resolves: As requestEmailToken
     */
    requestPasswordEmailToken(email: string, clientSecret: string, sendAttempt: number, nextLink?: string): Promise<IRequestTokenResponse>;
    /**
     * Requests a text message verification token for the purposes of resetting
     * the password on an account.
     * This API proxies the identity server /validate/email/requestToken API,
     * adding specific behaviour for the password resetting, as requestPasswordEmailToken.
     *
     * @param phoneCountry - As requestRegisterMsisdnToken
     * @param phoneNumber - As requestRegisterMsisdnToken
     * @param clientSecret - As requestEmailToken
     * @param sendAttempt - As requestEmailToken
     * @param nextLink - As requestEmailToken
     * @returns Promise which resolves: As requestEmailToken
     */
    requestPasswordMsisdnToken(phoneCountry: string, phoneNumber: string, clientSecret: string, sendAttempt: number, nextLink: string): Promise<IRequestMsisdnTokenResponse>;
    /**
     * Internal utility function for requesting validation tokens from usage-specific
     * requestToken endpoints.
     *
     * @param endpoint - The endpoint to send the request to
     * @param params - Parameters for the POST request
     * @returns Promise which resolves: As requestEmailToken
     */
    private requestTokenFromEndpoint;
    /**
     * Get the room-kind push rule associated with a room.
     * @param scope - "global" or device-specific.
     * @param roomId - the id of the room.
     * @returns the rule or undefined.
     */
    getRoomPushRule(scope: "global" | "device", roomId: string): IPushRule | undefined;
    /**
     * Set a room-kind muting push rule in a room.
     * The operation also updates MatrixClient.pushRules at the end.
     * @param scope - "global" or device-specific.
     * @param roomId - the id of the room.
     * @param mute - the mute state.
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    setRoomMutePushRule(scope: "global" | "device", roomId: string, mute: boolean): Promise<void> | undefined;
    searchMessageText(opts: ISearchOpts): Promise<ISearchResponse>;
    /**
     * Perform a server-side search for room events.
     *
     * The returned promise resolves to an object containing the fields:
     *
     *  * count:       estimate of the number of results
     *  * next_batch:  token for back-pagination; if undefined, there are no more results
     *  * highlights:  a list of words to highlight from the stemming algorithm
     *  * results:     a list of results
     *
     * Each entry in the results list is a SearchResult.
     *
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    searchRoomEvents(opts: IEventSearchOpts): Promise<ISearchResults>;
    /**
     * Take a result from an earlier searchRoomEvents call, and backfill results.
     *
     * @param searchResults -  the results object to be updated
     * @returns Promise which resolves: updated result object
     * @returns Rejects: with an error response.
     */
    backPaginateRoomEventsSearch<T extends ISearchResults>(searchResults: T): Promise<T>;
    /**
     * helper for searchRoomEvents and backPaginateRoomEventsSearch. Processes the
     * response from the API call and updates the searchResults
     *
     * @returns searchResults
     * @internal
     */
    processRoomEventsSearch<T extends ISearchResults>(searchResults: T, response: ISearchResponse): T;
    /**
     * Populate the store with rooms the user has left.
     * @returns Promise which resolves: TODO - Resolved when the rooms have
     * been added to the data store.
     * @returns Rejects: with an error response.
     */
    syncLeftRooms(): Promise<Room[]>;
    /**
     * Create a new filter.
     * @param content - The HTTP body for the request
     * @returns Promise which resolves to a Filter object.
     * @returns Rejects: with an error response.
     */
    createFilter(content: IFilterDefinition): Promise<Filter>;
    /**
     * Retrieve a filter.
     * @param userId - The user ID of the filter owner
     * @param filterId - The filter ID to retrieve
     * @param allowCached - True to allow cached filters to be returned.
     * Default: True.
     * @returns Promise which resolves: a Filter object
     * @returns Rejects: with an error response.
     */
    getFilter(userId: string, filterId: string, allowCached: boolean): Promise<Filter>;
    /**
     * @returns Filter ID
     */
    getOrCreateFilter(filterName: string, filter: Filter): Promise<string>;
    /**
     * Gets a bearer token from the homeserver that the user can
     * present to a third party in order to prove their ownership
     * of the Matrix account they are logged into.
     * @returns Promise which resolves: Token object
     * @returns Rejects: with an error response.
     */
    getOpenIdToken(): Promise<IOpenIDToken>;
    private startCallEventHandler;
    /**
     * @returns Promise which resolves: ITurnServerResponse object
     * @returns Rejects: with an error response.
     */
    turnServer(): Promise<ITurnServerResponse>;
    /**
     * Get the TURN servers for this homeserver.
     * @returns The servers or an empty list.
     */
    getTurnServers(): ITurnServer[];
    /**
     * Get the unix timestamp (in milliseconds) at which the current
     * TURN credentials (from getTurnServers) expire
     * @returns The expiry timestamp in milliseconds
     */
    getTurnServersExpiry(): number;
    get pollingTurnServers(): boolean;
    checkTurnServers(): Promise<boolean | undefined>;
    /**
     * Set whether to allow a fallback ICE server should be used for negotiating a
     * WebRTC connection if the homeserver doesn't provide any servers. Defaults to
     * false.
     *
     */
    setFallbackICEServerAllowed(allow: boolean): void;
    /**
     * Get whether to allow a fallback ICE server should be used for negotiating a
     * WebRTC connection if the homeserver doesn't provide any servers. Defaults to
     * false.
     *
     * @returns
     */
    isFallbackICEServerAllowed(): boolean;
    /**
     * Determines if the current user is an administrator of the Synapse homeserver.
     * Returns false if untrue or the homeserver does not appear to be a Synapse
     * homeserver. <strong>This function is implementation specific and may change
     * as a result.</strong>
     * @returns true if the user appears to be a Synapse administrator.
     */
    isSynapseAdministrator(): Promise<boolean>;
    /**
     * Performs a whois lookup on a user using Synapse's administrator API.
     * <strong>This function is implementation specific and may change as a
     * result.</strong>
     * @param userId - the User ID to look up.
     * @returns the whois response - see Synapse docs for information.
     */
    whoisSynapseUser(userId: string): Promise<ISynapseAdminWhoisResponse>;
    /**
     * Deactivates a user using Synapse's administrator API. <strong>This
     * function is implementation specific and may change as a result.</strong>
     * @param userId - the User ID to deactivate.
     * @returns the deactivate response - see Synapse docs for information.
     */
    deactivateSynapseUser(userId: string): Promise<ISynapseAdminDeactivateResponse>;
    private fetchClientWellKnown;
    getClientWellKnown(): IClientWellKnown | undefined;
    waitForClientWellKnown(): Promise<IClientWellKnown>;
    /**
     * store client options with boolean/string/numeric values
     * to know in the next session what flags the sync data was
     * created with (e.g. lazy loading)
     * @param opts - the complete set of client options
     * @returns for store operation
     */
    storeClientOptions(): Promise<void>;
    /**
     * Gets a set of room IDs in common with another user
     * @param userId - The userId to check.
     * @returns Promise which resolves to a set of rooms
     * @returns Rejects: with an error response.
     */
    _unstable_getSharedRooms(userId: string): Promise<string[]>;
    /**
     * Get the API versions supported by the server, along with any
     * unstable APIs it supports
     * @returns The server /versions response
     */
    getVersions(): Promise<IServerVersions>;
    /**
     * Check if a particular spec version is supported by the server.
     * @param version - The spec version (such as "r0.5.0") to check for.
     * @returns Whether it is supported
     */
    isVersionSupported(version: string): Promise<boolean>;
    /**
     * Query the server to see if it supports members lazy loading
     * @returns true if server supports lazy loading
     */
    doesServerSupportLazyLoading(): Promise<boolean>;
    /**
     * Query the server to see if the `id_server` parameter is required
     * when registering with an 3pid, adding a 3pid or resetting password.
     * @returns true if id_server parameter is required
     */
    doesServerRequireIdServerParam(): Promise<boolean>;
    /**
     * Query the server to see if the `id_access_token` parameter can be safely
     * passed to the homeserver. Some homeservers may trigger errors if they are not
     * prepared for the new parameter.
     * @returns true if id_access_token can be sent
     */
    doesServerAcceptIdentityAccessToken(): Promise<boolean>;
    /**
     * Query the server to see if it supports separate 3PID add and bind functions.
     * This affects the sequence of API calls clients should use for these operations,
     * so it's helpful to be able to check for support.
     * @returns true if separate functions are supported
     */
    doesServerSupportSeparateAddAndBind(): Promise<boolean>;
    /**
     * Query the server to see if it lists support for an unstable feature
     * in the /versions response
     * @param feature - the feature name
     * @returns true if the feature is supported
     */
    doesServerSupportUnstableFeature(feature: string): Promise<boolean>;
    /**
     * Query the server to see if it is forcing encryption to be enabled for
     * a given room preset, based on the /versions response.
     * @param presetName - The name of the preset to check.
     * @returns true if the server is forcing encryption
     * for the preset.
     */
    doesServerForceEncryptionForPreset(presetName: Preset): Promise<boolean>;
    doesServerSupportThread(): Promise<{
        threads: FeatureSupport;
        list: FeatureSupport;
        fwdPagination: FeatureSupport;
    }>;
    /**
     * Query the server to see if it supports the MSC2457 `logout_devices` parameter when setting password
     * @returns true if server supports the `logout_devices` parameter
     */
    doesServerSupportLogoutDevices(): Promise<boolean>;
    /**
     * Get if lazy loading members is being used.
     * @returns Whether or not members are lazy loaded by this client
     */
    hasLazyLoadMembersEnabled(): boolean;
    /**
     * Set a function which is called when /sync returns a 'limited' response.
     * It is called with a room ID and returns a boolean. It should return 'true' if the SDK
     * can SAFELY remove events from this room. It may not be safe to remove events if there
     * are other references to the timelines for this room, e.g because the client is
     * actively viewing events in this room.
     * Default: returns false.
     * @param cb - The callback which will be invoked.
     */
    setCanResetTimelineCallback(cb: ResetTimelineCallback): void;
    /**
     * Get the callback set via `setCanResetTimelineCallback`.
     * @returns The callback or null
     */
    getCanResetTimelineCallback(): ResetTimelineCallback | undefined;
    /**
     * Returns relations for a given event. Handles encryption transparently,
     * with the caveat that the amount of events returned might be 0, even though you get a nextBatch.
     * When the returned promise resolves, all messages should have finished trying to decrypt.
     * @param roomId - the room of the event
     * @param eventId - the id of the event
     * @param relationType - the rel_type of the relations requested
     * @param eventType - the event type of the relations requested
     * @param opts - options with optional values for the request.
     * @returns an object with `events` as `MatrixEvent[]` and optionally `nextBatch` if more relations are available.
     */
    relations(roomId: string, eventId: string, relationType?: RelationType | string | null, eventType?: EventType | string | null, opts?: IRelationsRequestOpts): Promise<{
        originalEvent?: MatrixEvent | null;
        events: MatrixEvent[];
        nextBatch?: string | null;
        prevBatch?: string | null;
    }>;
    /**
     * The app may wish to see if we have a key cached without
     * triggering a user interaction.
     */
    getCrossSigningCacheCallbacks(): ICacheCallbacks | undefined;
    /**
     * Generates a random string suitable for use as a client secret. <strong>This
     * method is experimental and may change.</strong>
     * @returns A new client secret
     */
    generateClientSecret(): string;
    /**
     * Attempts to decrypt an event
     * @param event - The event to decrypt
     * @returns A decryption promise
     */
    decryptEventIfNeeded(event: MatrixEvent, options?: IDecryptOptions): Promise<void>;
    private termsUrlForService;
    /**
     * Get the Homeserver URL of this client
     * @returns Homeserver URL of this client
     */
    getHomeserverUrl(): string;
    /**
     * Get the identity server URL of this client
     * @param stripProto - whether or not to strip the protocol from the URL
     * @returns Identity server URL of this client
     */
    getIdentityServerUrl(stripProto?: boolean): string | undefined;
    /**
     * Set the identity server URL of this client
     * @param url - New identity server URL
     */
    setIdentityServerUrl(url: string): void;
    /**
     * Get the access token associated with this account.
     * @returns The access_token or null
     */
    getAccessToken(): string | null;
    /**
     * Set the access token associated with this account.
     * @param token - The new access token.
     */
    setAccessToken(token: string): void;
    /**
     * @returns true if there is a valid access_token for this client.
     */
    isLoggedIn(): boolean;
    /**
     * Make up a new transaction id
     *
     * @returns a new, unique, transaction id
     */
    makeTxnId(): string;
    /**
     * Check whether a username is available prior to registration. An error response
     * indicates an invalid/unavailable username.
     * @param username - The username to check the availability of.
     * @returns Promise which resolves: to boolean of whether the username is available.
     */
    isUsernameAvailable(username: string): Promise<boolean>;
    /**
     * @param bindThreepids - Set key 'email' to true to bind any email
     *     threepid uses during registration in the identity server. Set 'msisdn' to
     *     true to bind msisdn.
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    register(username: string, password: string, sessionId: string | null, auth: {
        session?: string;
        type: string;
    }, bindThreepids?: boolean | null | {
        email?: boolean;
        msisdn?: boolean;
    }, guestAccessToken?: string, inhibitLogin?: boolean): Promise<IAuthData>;
    /**
     * Register a guest account.
     * This method returns the auth info needed to create a new authenticated client,
     * Remember to call `setGuest(true)` on the (guest-)authenticated client, e.g:
     * ```javascript
     * const tmpClient = await sdk.createClient(MATRIX_INSTANCE);
     * const { user_id, device_id, access_token } = tmpClient.registerGuest();
     * const client = createClient({
     *   baseUrl: MATRIX_INSTANCE,
     *   accessToken: access_token,
     *   userId: user_id,
     *   deviceId: device_id,
     * })
     * client.setGuest(true);
     * ```
     *
     * @param body - JSON HTTP body to provide.
     * @returns Promise which resolves: JSON object that contains:
     *                   `{ user_id, device_id, access_token, home_server }`
     * @returns Rejects: with an error response.
     */
    registerGuest({ body }?: {
        body?: any;
    }): Promise<any>;
    /**
     * @param data - parameters for registration request
     * @param kind - type of user to register. may be "guest"
     * @returns Promise which resolves: to the /register response
     * @returns Rejects: with an error response.
     */
    registerRequest(data: IRegisterRequestParams, kind?: string): Promise<IAuthData>;
    /**
     * Refreshes an access token using a provided refresh token. The refresh token
     * must be valid for the current access token known to the client instance.
     *
     * Note that this function will not cause a logout if the token is deemed
     * unknown by the server - the caller is responsible for managing logout
     * actions on error.
     * @param refreshToken - The refresh token.
     * @returns Promise which resolves to the new token.
     * @returns Rejects with an error response.
     */
    refreshToken(refreshToken: string): Promise<IRefreshTokenResponse>;
    /**
     * @returns Promise which resolves to the available login flows
     * @returns Rejects: with an error response.
     */
    loginFlows(): Promise<ILoginFlowsResponse>;
    /**
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    login(loginType: string, data: any): Promise<any>;
    /**
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    loginWithPassword(user: string, password: string): Promise<any>;
    /**
     * @param relayState - URL Callback after SAML2 Authentication
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    loginWithSAML2(relayState: string): Promise<any>;
    /**
     * @param redirectUrl - The URL to redirect to after the HS
     * authenticates with CAS.
     * @returns The HS URL to hit to begin the CAS login process.
     */
    getCasLoginUrl(redirectUrl: string): string;
    /**
     * @param redirectUrl - The URL to redirect to after the HS
     *     authenticates with the SSO.
     * @param loginType - The type of SSO login we are doing (sso or cas).
     *     Defaults to 'sso'.
     * @param idpId - The ID of the Identity Provider being targeted, optional.
     * @param action - the SSO flow to indicate to the IdP, optional.
     * @returns The HS URL to hit to begin the SSO login process.
     */
    getSsoLoginUrl(redirectUrl: string, loginType?: string, idpId?: string, action?: SSOAction): string;
    /**
     * @param token - Login token previously received from homeserver
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    loginWithToken(token: string): Promise<any>;
    /**
     * Logs out the current session.
     * Obviously, further calls that require authorisation should fail after this
     * method is called. The state of the MatrixClient object is not affected:
     * it is up to the caller to either reset or destroy the MatrixClient after
     * this method succeeds.
     * @param stopClient - whether to stop the client before calling /logout to prevent invalid token errors.
     * @returns Promise which resolves: On success, the empty object `{}`
     */
    logout(stopClient?: boolean): Promise<{}>;
    /**
     * Deactivates the logged-in account.
     * Obviously, further calls that require authorisation should fail after this
     * method is called. The state of the MatrixClient object is not affected:
     * it is up to the caller to either reset or destroy the MatrixClient after
     * this method succeeds.
     * @param auth - Optional. Auth data to supply for User-Interactive auth.
     * @param erase - Optional. If set, send as `erase` attribute in the
     * JSON request body, indicating whether the account should be erased. Defaults
     * to false.
     * @returns Promise which resolves: On success, the empty object
     */
    deactivateAccount(auth?: any, erase?: boolean): Promise<{}>;
    /**
     * Make a request for an `m.login.token` to be issued as per
     * [MSC3882](https://github.com/matrix-org/matrix-spec-proposals/pull/3882).
     * The server may require User-Interactive auth.
     * Note that this is UNSTABLE and subject to breaking changes without notice.
     * @param auth - Optional. Auth data to supply for User-Interactive auth.
     * @returns Promise which resolves: On success, the token response
     * or UIA auth data.
     */
    requestLoginToken(auth?: IAuthData): Promise<UIAResponse<LoginTokenPostResponse>>;
    /**
     * Get the fallback URL to use for unknown interactive-auth stages.
     *
     * @param loginType -     the type of stage being attempted
     * @param authSessionId - the auth session ID provided by the homeserver
     *
     * @returns HS URL to hit to for the fallback interface
     */
    getFallbackAuthUrl(loginType: string, authSessionId: string): string;
    /**
     * Create a new room.
     * @param options - a list of options to pass to the /createRoom API.
     * @returns Promise which resolves: `{room_id: {string}}`
     * @returns Rejects: with an error response.
     */
    createRoom(options: ICreateRoomOpts): Promise<{
        room_id: string;
    }>;
    /**
     * Fetches relations for a given event
     * @param roomId - the room of the event
     * @param eventId - the id of the event
     * @param relationType - the rel_type of the relations requested
     * @param eventType - the event type of the relations requested
     * @param opts - options with optional values for the request.
     * @returns the response, with chunk, prev_batch and, next_batch.
     */
    fetchRelations(roomId: string, eventId: string, relationType?: RelationType | string | null, eventType?: EventType | string | null, opts?: IRelationsRequestOpts): Promise<IRelationsResponse>;
    /**
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    roomState(roomId: string): Promise<IStateEventWithRoomId[]>;
    /**
     * Get an event in a room by its event id.
     *
     * @returns Promise which resolves to an object containing the event.
     * @returns Rejects: with an error response.
     */
    fetchRoomEvent(roomId: string, eventId: string): Promise<Partial<IEvent>>;
    /**
     * @param includeMembership - the membership type to include in the response
     * @param excludeMembership - the membership type to exclude from the response
     * @param atEventId - the id of the event for which moment in the timeline the members should be returned for
     * @returns Promise which resolves: dictionary of userid to profile information
     * @returns Rejects: with an error response.
     */
    members(roomId: string, includeMembership?: string, excludeMembership?: string, atEventId?: string): Promise<{
        [userId: string]: IStateEventWithRoomId[];
    }>;
    /**
     * Upgrades a room to a new protocol version
     * @param newVersion - The target version to upgrade to
     * @returns Promise which resolves: Object with key 'replacement_room'
     * @returns Rejects: with an error response.
     */
    upgradeRoom(roomId: string, newVersion: string): Promise<{
        replacement_room: string;
    }>;
    /**
     * Retrieve a state event.
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    getStateEvent(roomId: string, eventType: string, stateKey: string): Promise<Record<string, any>>;
    /**
     * @param opts - Options for the request function.
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    sendStateEvent(roomId: string, eventType: string, content: any, stateKey?: string, opts?: IRequestOpts): Promise<ISendEventResponse>;
    /**
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    roomInitialSync(roomId: string, limit: number): Promise<IRoomInitialSyncResponse>;
    /**
     * Set a marker to indicate the point in a room before which the user has read every
     * event. This can be retrieved from room account data (the event type is `m.fully_read`)
     * and displayed as a horizontal line in the timeline that is visually distinct to the
     * position of the user's own read receipt.
     * @param roomId - ID of the room that has been read
     * @param rmEventId - ID of the event that has been read
     * @param rrEventId - ID of the event tracked by the read receipt. This is here
     * for convenience because the RR and the RM are commonly updated at the same time as
     * each other. Optional.
     * @param rpEventId - rpEvent the m.read.private read receipt event for when we
     * don't want other users to see the read receipts. This is experimental. Optional.
     * @returns Promise which resolves: the empty object, `{}`.
     */
    setRoomReadMarkersHttpRequest(roomId: string, rmEventId: string, rrEventId?: string, rpEventId?: string): Promise<{}>;
    /**
     * @returns Promise which resolves: A list of the user's current rooms
     * @returns Rejects: with an error response.
     */
    getJoinedRooms(): Promise<IJoinedRoomsResponse>;
    /**
     * Retrieve membership info. for a room.
     * @param roomId - ID of the room to get membership for
     * @returns Promise which resolves: A list of currently joined users
     *                                 and their profile data.
     * @returns Rejects: with an error response.
     */
    getJoinedRoomMembers(roomId: string): Promise<IJoinedMembersResponse>;
    /**
     * @param options - Options for this request
     * @param server - The remote server to query for the room list.
     *                                Optional. If unspecified, get the local home
     *                                server's public room list.
     * @param limit - Maximum number of entries to return
     * @param since - Token to paginate from
     * @returns Promise which resolves: IPublicRoomsResponse
     * @returns Rejects: with an error response.
     */
    publicRooms({ server, limit, since, ...options }?: IRoomDirectoryOptions): Promise<IPublicRoomsResponse>;
    /**
     * Create an alias to room ID mapping.
     * @param alias - The room alias to create.
     * @param roomId - The room ID to link the alias to.
     * @returns Promise which resolves: an empty object `{}`
     * @returns Rejects: with an error response.
     */
    createAlias(alias: string, roomId: string): Promise<{}>;
    /**
     * Delete an alias to room ID mapping. This alias must be on your local server,
     * and you must have sufficient access to do this operation.
     * @param alias - The room alias to delete.
     * @returns Promise which resolves: an empty object `{}`.
     * @returns Rejects: with an error response.
     */
    deleteAlias(alias: string): Promise<{}>;
    /**
     * Gets the local aliases for the room. Note: this includes all local aliases, unlike the
     * curated list from the m.room.canonical_alias state event.
     * @param roomId - The room ID to get local aliases for.
     * @returns Promise which resolves: an object with an `aliases` property, containing an array of local aliases
     * @returns Rejects: with an error response.
     */
    getLocalAliases(roomId: string): Promise<{
        aliases: string[];
    }>;
    /**
     * Get room info for the given alias.
     * @param alias - The room alias to resolve.
     * @returns Promise which resolves: Object with room_id and servers.
     * @returns Rejects: with an error response.
     */
    getRoomIdForAlias(alias: string): Promise<{
        room_id: string;
        servers: string[];
    }>;
    /**
     * @returns Promise which resolves: Object with room_id and servers.
     * @returns Rejects: with an error response.
     */
    resolveRoomAlias(roomAlias: string): Promise<{
        room_id: string;
        servers: string[];
    }>;
    /**
     * Get the visibility of a room in the current HS's room directory
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    getRoomDirectoryVisibility(roomId: string): Promise<{
        visibility: Visibility;
    }>;
    /**
     * Set the visbility of a room in the current HS's room directory
     * @param visibility - "public" to make the room visible
     *                 in the public directory, or "private" to make
     *                 it invisible.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    setRoomDirectoryVisibility(roomId: string, visibility: Visibility): Promise<{}>;
    /**
     * Set the visbility of a room bridged to a 3rd party network in
     * the current HS's room directory.
     * @param networkId - the network ID of the 3rd party
     *                 instance under which this room is published under.
     * @param visibility - "public" to make the room visible
     *                 in the public directory, or "private" to make
     *                 it invisible.
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    setRoomDirectoryVisibilityAppService(networkId: string, roomId: string, visibility: "public" | "private"): Promise<any>;
    /**
     * Query the user directory with a term matching user IDs, display names and domains.
     * @param term - the term with which to search.
     * @param limit - the maximum number of results to return. The server will
     *                 apply a limit if unspecified.
     * @returns Promise which resolves: an array of results.
     */
    searchUserDirectory({ term, limit }: {
        term: string;
        limit?: number;
    }): Promise<IUserDirectoryResponse>;
    /**
     * Upload a file to the media repository on the homeserver.
     *
     * @param file - The object to upload. On a browser, something that
     *   can be sent to XMLHttpRequest.send (typically a File).  Under node.js,
     *   a a Buffer, String or ReadStream.
     *
     * @param opts -  options object
     *
     * @returns Promise which resolves to response object, as
     *    determined by this.opts.onlyData, opts.rawResponse, and
     *    opts.onlyContentUri.  Rejects with an error (usually a MatrixError).
     */
    uploadContent(file: FileType, opts?: UploadOpts): Promise<UploadResponse>;
    /**
     * Cancel a file upload in progress
     * @param upload - The object returned from uploadContent
     * @returns true if canceled, otherwise false
     */
    cancelUpload(upload: Promise<UploadResponse>): boolean;
    /**
     * Get a list of all file uploads in progress
     * @returns Array of objects representing current uploads.
     * Currently in progress is element 0. Keys:
     *  - promise: The promise associated with the upload
     *  - loaded: Number of bytes uploaded
     *  - total: Total number of bytes to upload
     */
    getCurrentUploads(): Upload[];
    /**
     * @param info - The kind of info to retrieve (e.g. 'displayname',
     * 'avatar_url').
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     */
    getProfileInfo(userId: string, info?: string): Promise<{
        avatar_url?: string;
        displayname?: string;
    }>;
    /**
     * @returns Promise which resolves to a list of the user's threepids.
     * @returns Rejects: with an error response.
     */
    getThreePids(): Promise<{
        threepids: IThreepid[];
    }>;
    /**
     * Add a 3PID to your homeserver account and optionally bind it to an identity
     * server as well. An identity server is required as part of the `creds` object.
     *
     * This API is deprecated, and you should instead use `addThreePidOnly`
     * for homeservers that support it.
     *
     * @returns Promise which resolves: on success
     * @returns Rejects: with an error response.
     */
    addThreePid(creds: any, bind: boolean): Promise<any>;
    /**
     * Add a 3PID to your homeserver account. This API does not use an identity
     * server, as the homeserver is expected to handle 3PID ownership validation.
     *
     * You can check whether a homeserver supports this API via
     * `doesServerSupportSeparateAddAndBind`.
     *
     * @param data - A object with 3PID validation data from having called
     * `account/3pid/<medium>/requestToken` on the homeserver.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    addThreePidOnly(data: IAddThreePidOnlyBody): Promise<{}>;
    /**
     * Bind a 3PID for discovery onto an identity server via the homeserver. The
     * identity server handles 3PID ownership validation and the homeserver records
     * the new binding to track where all 3PIDs for the account are bound.
     *
     * You can check whether a homeserver supports this API via
     * `doesServerSupportSeparateAddAndBind`.
     *
     * @param data - A object with 3PID validation data from having called
     * `validate/<medium>/requestToken` on the identity server. It should also
     * contain `id_server` and `id_access_token` fields as well.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    bindThreePid(data: IBindThreePidBody): Promise<{}>;
    /**
     * Unbind a 3PID for discovery on an identity server via the homeserver. The
     * homeserver removes its record of the binding to keep an updated record of
     * where all 3PIDs for the account are bound.
     *
     * @param medium - The threepid medium (eg. 'email')
     * @param address - The threepid address (eg. 'bob\@example.com')
     *        this must be as returned by getThreePids.
     * @returns Promise which resolves: on success
     * @returns Rejects: with an error response.
     */
    unbindThreePid(medium: string, address: string): Promise<{
        id_server_unbind_result: IdServerUnbindResult;
    }>;
    /**
     * @param medium - The threepid medium (eg. 'email')
     * @param address - The threepid address (eg. 'bob\@example.com')
     *        this must be as returned by getThreePids.
     * @returns Promise which resolves: The server response on success
     *     (generally the empty JSON object)
     * @returns Rejects: with an error response.
     */
    deleteThreePid(medium: string, address: string): Promise<{
        id_server_unbind_result: IdServerUnbindResult;
    }>;
    /**
     * Make a request to change your password.
     * @param newPassword - The new desired password.
     * @param logoutDevices - Should all sessions be logged out after the password change. Defaults to true.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    setPassword(authDict: IAuthDict, newPassword: string, logoutDevices?: boolean): Promise<{}>;
    /**
     * Gets all devices recorded for the logged-in user
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    getDevices(): Promise<{
        devices: IMyDevice[];
    }>;
    /**
     * Gets specific device details for the logged-in user
     * @param deviceId -  device to query
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    getDevice(deviceId: string): Promise<IMyDevice>;
    /**
     * Update the given device
     *
     * @param deviceId -  device to update
     * @param body -       body of request
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    setDeviceDetails(deviceId: string, body: {
        display_name: string;
    }): Promise<{}>;
    /**
     * Delete the given device
     *
     * @param deviceId -  device to delete
     * @param auth - Optional. Auth data to supply for User-Interactive auth.
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    deleteDevice(deviceId: string, auth?: IAuthDict): Promise<IAuthData | {}>;
    /**
     * Delete multiple device
     *
     * @param devices - IDs of the devices to delete
     * @param auth - Optional. Auth data to supply for User-Interactive auth.
     * @returns Promise which resolves: result object
     * @returns Rejects: with an error response.
     */
    deleteMultipleDevices(devices: string[], auth?: IAuthDict): Promise<IAuthData | {}>;
    /**
     * Gets all pushers registered for the logged-in user
     *
     * @returns Promise which resolves: Array of objects representing pushers
     * @returns Rejects: with an error response.
     */
    getPushers(): Promise<{
        pushers: IPusher[];
    }>;
    /**
     * Adds a new pusher or updates an existing pusher
     *
     * @param pusher - Object representing a pusher
     * @returns Promise which resolves: Empty json object on success
     * @returns Rejects: with an error response.
     */
    setPusher(pusher: IPusherRequest): Promise<{}>;
    /**
     * Persists local notification settings
     * @returns Promise which resolves: an empty object
     * @returns Rejects: with an error response.
     */
    setLocalNotificationSettings(deviceId: string, notificationSettings: LocalNotificationSettings): Promise<{}>;
    /**
     * Get the push rules for the account from the server.
     * @returns Promise which resolves to the push rules.
     * @returns Rejects: with an error response.
     */
    getPushRules(): Promise<IPushRules>;
    /**
     * @returns Promise which resolves: an empty object `{}`
     * @returns Rejects: with an error response.
     */
    addPushRule(scope: string, kind: PushRuleKind, ruleId: Exclude<string, RuleId>, body: Pick<IPushRule, "actions" | "conditions" | "pattern">): Promise<{}>;
    /**
     * @returns Promise which resolves: an empty object `{}`
     * @returns Rejects: with an error response.
     */
    deletePushRule(scope: string, kind: PushRuleKind, ruleId: Exclude<string, RuleId>): Promise<{}>;
    /**
     * Enable or disable a push notification rule.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    setPushRuleEnabled(scope: string, kind: PushRuleKind, ruleId: RuleId | string, enabled: boolean): Promise<{}>;
    /**
     * Set the actions for a push notification rule.
     * @returns Promise which resolves: to an empty object `{}`
     * @returns Rejects: with an error response.
     */
    setPushRuleActions(scope: string, kind: PushRuleKind, ruleId: RuleId | string, actions: PushRuleAction[]): Promise<{}>;
    /**
     * Perform a server-side search.
     * @param next_batch - the batch token to pass in the query string
     * @param body - the JSON object to pass to the request body.
     * @param abortSignal - optional signal used to cancel the http request.
     * @returns Promise which resolves to the search response object.
     * @returns Rejects: with an error response.
     */
    search({ body, next_batch: nextBatch }: {
        body: ISearchRequestBody;
        next_batch?: string;
    }, abortSignal?: AbortSignal): Promise<ISearchResponse>;
    /**
     * Upload keys
     *
     * @param content -  body of upload request
     *
     * @param opts - this method no longer takes any opts,
     *  used to take opts.device_id but this was not removed from the spec as a redundant parameter
     *
     * @returns Promise which resolves: result object. Rejects: with
     *     an error response ({@link MatrixError}).
     */
    uploadKeysRequest(content: IUploadKeysRequest, opts?: void): Promise<IKeysUploadResponse>;
    uploadKeySignatures(content: KeySignatures): Promise<IUploadKeySignaturesResponse>;
    /**
     * Download device keys
     *
     * @param userIds -  list of users to get keys for
     *
     * @param token - sync token to pass in the query request, to help
     *   the HS give the most recent results
     *
     * @returns Promise which resolves: result object. Rejects: with
     *     an error response ({@link MatrixError}).
     */
    downloadKeysForUsers(userIds: string[], { token }?: {
        token?: string;
    }): Promise<IDownloadKeyResult>;
    /**
     * Claim one-time keys
     *
     * @param devices -  a list of [userId, deviceId] pairs
     *
     * @param keyAlgorithm -  desired key type
     *
     * @param timeout - the time (in milliseconds) to wait for keys from remote
     *     servers
     *
     * @returns Promise which resolves: result object. Rejects: with
     *     an error response ({@link MatrixError}).
     */
    claimOneTimeKeys(devices: [string, string][], keyAlgorithm?: string, timeout?: number): Promise<IClaimOTKsResult>;
    /**
     * Ask the server for a list of users who have changed their device lists
     * between a pair of sync tokens
     *
     *
     * @returns Promise which resolves: result object. Rejects: with
     *     an error response ({@link MatrixError}).
     */
    getKeyChanges(oldToken: string, newToken: string): Promise<{
        changed: string[];
        left: string[];
    }>;
    uploadDeviceSigningKeys(auth?: IAuthData, keys?: CrossSigningKeys): Promise<{}>;
    /**
     * Register with an identity server using the OpenID token from the user's
     * Homeserver, which can be retrieved via
     * {@link MatrixClient#getOpenIdToken}.
     *
     * Note that the `/account/register` endpoint (as well as IS authentication in
     * general) was added as part of the v2 API version.
     *
     * @returns Promise which resolves: with object containing an Identity
     * Server access token.
     * @returns Rejects: with an error response.
     */
    registerWithIdentityServer(hsOpenIdToken: IOpenIDToken): Promise<{
        access_token: string;
        token: string;
    }>;
    /**
     * Requests an email verification token directly from an identity server.
     *
     * This API is used as part of binding an email for discovery on an identity
     * server. The validation data that results should be passed to the
     * `bindThreePid` method to complete the binding process.
     *
     * @param email - The email address to request a token for
     * @param clientSecret - A secret binary string generated by the client.
     *                 It is recommended this be around 16 ASCII characters.
     * @param sendAttempt - If an identity server sees a duplicate request
     *                 with the same sendAttempt, it will not send another email.
     *                 To request another email to be sent, use a larger value for
     *                 the sendAttempt param as was used in the previous request.
     * @param nextLink - Optional If specified, the client will be redirected
     *                 to this link after validation.
     * @param identityAccessToken - The `access_token` field of the identity
     * server `/account/register` response (see {@link registerWithIdentityServer}).
     *
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     * @throws Error if no identity server is set
     */
    requestEmailToken(email: string, clientSecret: string, sendAttempt: number, nextLink: string, identityAccessToken?: string): Promise<any>;
    /**
     * Requests a MSISDN verification token directly from an identity server.
     *
     * This API is used as part of binding a MSISDN for discovery on an identity
     * server. The validation data that results should be passed to the
     * `bindThreePid` method to complete the binding process.
     *
     * @param phoneCountry - The ISO 3166-1 alpha-2 code for the country in
     *                 which phoneNumber should be parsed relative to.
     * @param phoneNumber - The phone number, in national or international
     *                 format
     * @param clientSecret - A secret binary string generated by the client.
     *                 It is recommended this be around 16 ASCII characters.
     * @param sendAttempt - If an identity server sees a duplicate request
     *                 with the same sendAttempt, it will not send another SMS.
     *                 To request another SMS to be sent, use a larger value for
     *                 the sendAttempt param as was used in the previous request.
     * @param nextLink - Optional If specified, the client will be redirected
     *                 to this link after validation.
     * @param identityAccessToken - The `access_token` field of the Identity
     * Server `/account/register` response (see {@link registerWithIdentityServer}).
     *
     * @returns Promise which resolves: TODO
     * @returns Rejects: with an error response.
     * @throws Error if no identity server is set
     */
    requestMsisdnToken(phoneCountry: string, phoneNumber: string, clientSecret: string, sendAttempt: number, nextLink: string, identityAccessToken?: string): Promise<any>;
    /**
     * Submits a MSISDN token to the identity server
     *
     * This is used when submitting the code sent by SMS to a phone number.
     * The identity server has an equivalent API for email but the js-sdk does
     * not expose this, since email is normally validated by the user clicking
     * a link rather than entering a code.
     *
     * @param sid - The sid given in the response to requestToken
     * @param clientSecret - A secret binary string generated by the client.
     *                 This must be the same value submitted in the requestToken call.
     * @param msisdnToken - The MSISDN token, as enetered by the user.
     * @param identityAccessToken - The `access_token` field of the Identity
     * Server `/account/register` response (see {@link registerWithIdentityServer}).
     *
     * @returns Promise which resolves: Object, currently with no parameters.
     * @returns Rejects: with an error response.
     * @throws Error if No identity server is set
     */
    submitMsisdnToken(sid: string, clientSecret: string, msisdnToken: string, identityAccessToken: string): Promise<any>;
    /**
     * Submits a MSISDN token to an arbitrary URL.
     *
     * This is used when submitting the code sent by SMS to a phone number in the
     * newer 3PID flow where the homeserver validates 3PID ownership (as part of
     * `requestAdd3pidMsisdnToken`). The homeserver response may include a
     * `submit_url` to specify where the token should be sent, and this helper can
     * be used to pass the token to this URL.
     *
     * @param url - The URL to submit the token to
     * @param sid - The sid given in the response to requestToken
     * @param clientSecret - A secret binary string generated by the client.
     *                 This must be the same value submitted in the requestToken call.
     * @param msisdnToken - The MSISDN token, as enetered by the user.
     *
     * @returns Promise which resolves: Object, currently with no parameters.
     * @returns Rejects: with an error response.
     */
    submitMsisdnTokenOtherUrl(url: string, sid: string, clientSecret: string, msisdnToken: string): Promise<any>;
    /**
     * Gets the V2 hashing information from the identity server. Primarily useful for
     * lookups.
     * @param identityAccessToken - The access token for the identity server.
     * @returns The hashing information for the identity server.
     */
    getIdentityHashDetails(identityAccessToken: string): Promise<any>;
    /**
     * Performs a hashed lookup of addresses against the identity server. This is
     * only supported on identity servers which have at least the version 2 API.
     * @param addressPairs - An array of 2 element arrays.
     * The first element of each pair is the address, the second is the 3PID medium.
     * Eg: `["email@example.org", "email"]`
     * @param identityAccessToken - The access token for the identity server.
     * @returns A collection of address mappings to
     * found MXIDs. Results where no user could be found will not be listed.
     */
    identityHashedLookup(addressPairs: [string, string][], identityAccessToken: string): Promise<{
        address: string;
        mxid: string;
    }[]>;
    /**
     * Looks up the public Matrix ID mapping for a given 3rd party
     * identifier from the identity server
     *
     * @param medium - The medium of the threepid, eg. 'email'
     * @param address - The textual address of the threepid
     * @param identityAccessToken - The `access_token` field of the Identity
     * Server `/account/register` response (see {@link registerWithIdentityServer}).
     *
     * @returns Promise which resolves: A threepid mapping
     *                                 object or the empty object if no mapping
     *                                 exists
     * @returns Rejects: with an error response.
     */
    lookupThreePid(medium: string, address: string, identityAccessToken: string): Promise<any>;
    /**
     * Looks up the public Matrix ID mappings for multiple 3PIDs.
     *
     * @param query - Array of arrays containing
     * [medium, address]
     * @param identityAccessToken - The `access_token` field of the Identity
     * Server `/account/register` response (see {@link registerWithIdentityServer}).
     *
     * @returns Promise which resolves: Lookup results from IS.
     * @returns Rejects: with an error response.
     */
    bulkLookupThreePids(query: [string, string][], identityAccessToken: string): Promise<any>;
    /**
     * Get account info from the identity server. This is useful as a neutral check
     * to verify that other APIs are likely to approve access by testing that the
     * token is valid, terms have been agreed, etc.
     *
     * @param identityAccessToken - The `access_token` field of the Identity
     * Server `/account/register` response (see {@link registerWithIdentityServer}).
     *
     * @returns Promise which resolves: an object with account info.
     * @returns Rejects: with an error response.
     */
    getIdentityAccount(identityAccessToken: string): Promise<any>;
    /**
     * Send an event to a specific list of devices.
     * This is a low-level API that simply wraps the HTTP API
     * call to send to-device messages. We recommend using
     * queueToDevice() which is a higher level API.
     *
     * @param eventType -  type of event to send
     *    content to send. Map from user_id to device_id to content object.
     * @param txnId -     transaction id. One will be made up if not
     *    supplied.
     * @returns Promise which resolves: to an empty object `{}`
     */
    sendToDevice(eventType: string, contentMap: {
        [userId: string]: {
            [deviceId: string]: Record<string, any>;
        };
    }, txnId?: string): Promise<{}>;
    /**
     * Sends events directly to specific devices using Matrix's to-device
     * messaging system. The batch will be split up into appropriately sized
     * batches for sending and stored in the store so they can be retried
     * later if they fail to send. Retries will happen automatically.
     * @param batch - The to-device messages to send
     */
    queueToDevice(batch: ToDeviceBatch): Promise<void>;
    /**
     * Get the third party protocols that can be reached using
     * this HS
     * @returns Promise which resolves to the result object
     */
    getThirdpartyProtocols(): Promise<{
        [protocol: string]: IProtocol;
    }>;
    /**
     * Get information on how a specific place on a third party protocol
     * may be reached.
     * @param protocol - The protocol given in getThirdpartyProtocols()
     * @param params - Protocol-specific parameters, as given in the
     *                        response to getThirdpartyProtocols()
     * @returns Promise which resolves to the result object
     */
    getThirdpartyLocation(protocol: string, params: {
        searchFields?: string[];
    }): Promise<IThirdPartyLocation[]>;
    /**
     * Get information on how a specific user on a third party protocol
     * may be reached.
     * @param protocol - The protocol given in getThirdpartyProtocols()
     * @param params - Protocol-specific parameters, as given in the
     *                        response to getThirdpartyProtocols()
     * @returns Promise which resolves to the result object
     */
    getThirdpartyUser(protocol: string, params: any): Promise<IThirdPartyUser[]>;
    getTerms(serviceType: SERVICE_TYPES, baseUrl: string): Promise<any>;
    agreeToTerms(serviceType: SERVICE_TYPES, baseUrl: string, accessToken: string, termsUrls: string[]): Promise<{}>;
    /**
     * Reports an event as inappropriate to the server, which may then notify the appropriate people.
     * @param roomId - The room in which the event being reported is located.
     * @param eventId - The event to report.
     * @param score - The score to rate this content as where -100 is most offensive and 0 is inoffensive.
     * @param reason - The reason the content is being reported. May be blank.
     * @returns Promise which resolves to an empty object if successful
     */
    reportEvent(roomId: string, eventId: string, score: number, reason: string): Promise<{}>;
    /**
     * Fetches or paginates a room hierarchy as defined by MSC2946.
     * Falls back gracefully to sourcing its data from `getSpaceSummary` if this API is not yet supported by the server.
     * @param roomId - The ID of the space-room to use as the root of the summary.
     * @param limit - The maximum number of rooms to return per page.
     * @param maxDepth - The maximum depth in the tree from the root room to return.
     * @param suggestedOnly - Whether to only return rooms with suggested=true.
     * @param fromToken - The opaque token to paginate a previous request.
     * @returns the response, with next_batch & rooms fields.
     */
    getRoomHierarchy(roomId: string, limit?: number, maxDepth?: number, suggestedOnly?: boolean, fromToken?: string): Promise<IRoomHierarchy>;
    /**
     * Creates a new file tree space with the given name. The client will pick
     * defaults for how it expects to be able to support the remaining API offered
     * by the returned class.
     *
     * Note that this is UNSTABLE and may have breaking changes without notice.
     * @param name - The name of the tree space.
     * @returns Promise which resolves to the created space.
     */
    unstableCreateFileTree(name: string): Promise<MSC3089TreeSpace>;
    /**
     * Gets a reference to a tree space, if the room ID given is a tree space. If the room
     * does not appear to be a tree space then null is returned.
     *
     * Note that this is UNSTABLE and may have breaking changes without notice.
     * @param roomId - The room ID to get a tree space reference for.
     * @returns The tree space, or null if not a tree space.
     */
    unstableGetFileTreeSpace(roomId: string): MSC3089TreeSpace | null;
    /**
     * Perform a single MSC3575 sliding sync request.
     * @param req - The request to make.
     * @param proxyBaseUrl - The base URL for the sliding sync proxy.
     * @param abortSignal - Optional signal to abort request mid-flight.
     * @returns The sliding sync response, or a standard error.
     * @throws on non 2xx status codes with an object with a field "httpStatus":number.
     */
    slidingSync(req: MSC3575SlidingSyncRequest, proxyBaseUrl?: string, abortSignal?: AbortSignal): Promise<MSC3575SlidingSyncResponse>;
    /**
     * @experimental
     */
    supportsExperimentalThreads(): boolean;
    /**
     * Fetches the summary of a room as defined by an initial version of MSC3266 and implemented in Synapse
     * Proposed at https://github.com/matrix-org/matrix-doc/pull/3266
     * @param roomIdOrAlias - The ID or alias of the room to get the summary of.
     * @param via - The list of servers which know about the room if only an ID was provided.
     */
    getRoomSummary(roomIdOrAlias: string, via?: string[]): Promise<IRoomSummary>;
    /**
     * @experimental
     */
    processThreadEvents(room: Room, threadedEvents: MatrixEvent[], toStartOfTimeline: boolean): void;
    /**
     * @experimental
     */
    processThreadRoots(room: Room, threadedEvents: MatrixEvent[], toStartOfTimeline: boolean): void;
    processBeaconEvents(room?: Room, events?: MatrixEvent[]): void;
    /**
     * Fetches information about the user for the configured access token.
     */
    whoami(): Promise<IWhoamiResponse>;
    /**
     * Find the event_id closest to the given timestamp in the given direction.
     * @returns A promise of an object containing the event_id and
     *    origin_server_ts of the closest event to the timestamp in the given
     *    direction
     */
    timestampToEvent(roomId: string, timestamp: number, dir: Direction): Promise<ITimestampToEventResponse>;
}
/**
 * recalculates an accurate notifications count on event decryption.
 * Servers do not have enough knowledge about encrypted events to calculate an
 * accurate notification_count
 */
export declare function fixNotificationCountOnDecryption(cli: MatrixClient, event: MatrixEvent): void;
export {};
//# sourceMappingURL=client.d.ts.map