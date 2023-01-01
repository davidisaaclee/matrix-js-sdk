import { MatrixEvent } from "../models/event";
import { RoomMember } from "../models/room-member";
import { MCallAnswer, MCallHangupReject } from "./callEventTypes";
import { CallFeed } from "./callFeed";
import { MatrixClient } from "../client";
import { TypedEventEmitter } from "../models/typed-event-emitter";
import { IScreensharingOpts } from "./mediaHandler";
interface CallOpts {
    roomId?: string;
    invitee?: string;
    client: MatrixClient;
    /**
     * Whether relay through TURN should be forced.
     * @deprecated use opts.forceTURN when creating the matrix client
     * since it's only possible to set this option on outbound calls.
     */
    forceTURN?: boolean;
    turnServers?: Array<TurnServer>;
    opponentDeviceId?: string;
    opponentSessionId?: string;
    groupCallId?: string;
}
interface TurnServer {
    urls: Array<string>;
    username?: string;
    password?: string;
    ttl?: number;
}
interface AssertedIdentity {
    id: string;
    displayName: string;
}
export declare enum CallState {
    Fledgling = "fledgling",
    InviteSent = "invite_sent",
    WaitLocalMedia = "wait_local_media",
    CreateOffer = "create_offer",
    CreateAnswer = "create_answer",
    Connecting = "connecting",
    Connected = "connected",
    Ringing = "ringing",
    Ended = "ended"
}
export declare enum CallType {
    Voice = "voice",
    Video = "video"
}
export declare enum CallDirection {
    Inbound = "inbound",
    Outbound = "outbound"
}
export declare enum CallParty {
    Local = "local",
    Remote = "remote"
}
export declare enum CallEvent {
    Hangup = "hangup",
    State = "state",
    Error = "error",
    Replaced = "replaced",
    LocalHoldUnhold = "local_hold_unhold",
    RemoteHoldUnhold = "remote_hold_unhold",
    HoldUnhold = "hold_unhold",
    FeedsChanged = "feeds_changed",
    AssertedIdentityChanged = "asserted_identity_changed",
    LengthChanged = "length_changed",
    DataChannel = "datachannel",
    SendVoipEvent = "send_voip_event"
}
export declare enum CallErrorCode {
    /** The user chose to end the call */
    UserHangup = "user_hangup",
    /** An error code when the local client failed to create an offer. */
    LocalOfferFailed = "local_offer_failed",
    /**
     * An error code when there is no local mic/camera to use. This may be because
     * the hardware isn't plugged in, or the user has explicitly denied access.
     */
    NoUserMedia = "no_user_media",
    /**
     * Error code used when a call event failed to send
     * because unknown devices were present in the room
     */
    UnknownDevices = "unknown_devices",
    /**
     * Error code used when we fail to send the invite
     * for some reason other than there being unknown devices
     */
    SendInvite = "send_invite",
    /**
     * An answer could not be created
     */
    CreateAnswer = "create_answer",
    /**
     * An offer could not be created
     */
    CreateOffer = "create_offer",
    /**
     * Error code used when we fail to send the answer
     * for some reason other than there being unknown devices
     */
    SendAnswer = "send_answer",
    /**
     * The session description from the other side could not be set
     */
    SetRemoteDescription = "set_remote_description",
    /**
     * The session description from this side could not be set
     */
    SetLocalDescription = "set_local_description",
    /**
     * A different device answered the call
     */
    AnsweredElsewhere = "answered_elsewhere",
    /**
     * No media connection could be established to the other party
     */
    IceFailed = "ice_failed",
    /**
     * The invite timed out whilst waiting for an answer
     */
    InviteTimeout = "invite_timeout",
    /**
     * The call was replaced by another call
     */
    Replaced = "replaced",
    /**
     * Signalling for the call could not be sent (other than the initial invite)
     */
    SignallingFailed = "signalling_timeout",
    /**
     * The remote party is busy
     */
    UserBusy = "user_busy",
    /**
     * We transferred the call off to somewhere else
     */
    Transfered = "transferred",
    /**
     * A call from the same user was found with a new session id
     */
    NewSession = "new_session"
}
export declare class CallError extends Error {
    readonly code: string;
    constructor(code: CallErrorCode, msg: string, err: Error);
}
export declare function genCallID(): string;
export type CallEventHandlerMap = {
    [CallEvent.DataChannel]: (channel: RTCDataChannel) => void;
    [CallEvent.FeedsChanged]: (feeds: CallFeed[]) => void;
    [CallEvent.Replaced]: (newCall: MatrixCall) => void;
    [CallEvent.Error]: (error: CallError) => void;
    [CallEvent.RemoteHoldUnhold]: (onHold: boolean) => void;
    [CallEvent.LocalHoldUnhold]: (onHold: boolean) => void;
    [CallEvent.LengthChanged]: (length: number) => void;
    [CallEvent.State]: (state: CallState, oldState?: CallState) => void;
    [CallEvent.Hangup]: (call: MatrixCall) => void;
    [CallEvent.AssertedIdentityChanged]: () => void;
    [CallEvent.HoldUnhold]: (onHold: boolean) => void;
    [CallEvent.SendVoipEvent]: (event: Record<string, any>) => void;
};
export declare class MatrixCall extends TypedEventEmitter<CallEvent, CallEventHandlerMap> {
    roomId?: string;
    callId: string;
    invitee?: string;
    hangupParty?: CallParty;
    hangupReason?: string;
    direction?: CallDirection;
    ourPartyId: string;
    peerConn?: RTCPeerConnection;
    toDeviceSeq: number;
    isPtt: boolean;
    private _state;
    private readonly client;
    private readonly forceTURN?;
    private readonly turnServers;
    private candidateSendQueue;
    private candidateSendTries;
    private candidatesEnded;
    private feeds;
    private transceivers;
    private inviteOrAnswerSent;
    private waitForLocalAVStream;
    private successor?;
    private opponentMember?;
    private opponentVersion?;
    private opponentPartyId;
    private opponentCaps?;
    private iceDisconnectedTimeout?;
    private inviteTimeout?;
    private readonly removeTrackListeners;
    private remoteOnHold;
    private callStatsAtEnd?;
    private makingOffer;
    private ignoreOffer;
    private responsePromiseChain?;
    private remoteCandidateBuffer;
    private remoteAssertedIdentity?;
    private remoteSDPStreamMetadata?;
    private callLengthInterval?;
    private callStartTime?;
    private opponentDeviceId?;
    private opponentDeviceInfo?;
    private opponentSessionId?;
    groupCallId?: string;
    /**
     * Construct a new Matrix Call.
     * @param opts - Config options.
     */
    constructor(opts: CallOpts);
    /**
     * Place a voice call to this room.
     * @throws If you have not specified a listener for 'error' events.
     */
    placeVoiceCall(): Promise<void>;
    /**
     * Place a video call to this room.
     * @throws If you have not specified a listener for 'error' events.
     */
    placeVideoCall(): Promise<void>;
    /**
     * Create a datachannel using this call's peer connection.
     * @param label - A human readable label for this datachannel
     * @param options - An object providing configuration options for the data channel.
     */
    createDataChannel(label: string, options: RTCDataChannelInit | undefined): RTCDataChannel;
    getOpponentMember(): RoomMember | undefined;
    getOpponentDeviceId(): string | undefined;
    getOpponentSessionId(): string | undefined;
    opponentCanBeTransferred(): boolean;
    opponentSupportsDTMF(): boolean;
    getRemoteAssertedIdentity(): AssertedIdentity | undefined;
    get state(): CallState;
    private set state(value);
    get type(): CallType;
    get hasLocalUserMediaVideoTrack(): boolean;
    get hasRemoteUserMediaVideoTrack(): boolean;
    get hasLocalUserMediaAudioTrack(): boolean;
    get hasRemoteUserMediaAudioTrack(): boolean;
    get localUsermediaFeed(): CallFeed | undefined;
    get localScreensharingFeed(): CallFeed | undefined;
    get localUsermediaStream(): MediaStream | undefined;
    get localScreensharingStream(): MediaStream | undefined;
    get remoteUsermediaFeed(): CallFeed | undefined;
    get remoteScreensharingFeed(): CallFeed | undefined;
    get remoteUsermediaStream(): MediaStream | undefined;
    get remoteScreensharingStream(): MediaStream | undefined;
    private getFeedByStreamId;
    /**
     * Returns an array of all CallFeeds
     * @returns CallFeeds
     */
    getFeeds(): Array<CallFeed>;
    /**
     * Returns an array of all local CallFeeds
     * @returns local CallFeeds
     */
    getLocalFeeds(): Array<CallFeed>;
    /**
     * Returns an array of all remote CallFeeds
     * @returns remote CallFeeds
     */
    getRemoteFeeds(): Array<CallFeed>;
    private initOpponentCrypto;
    /**
     * Generates and returns localSDPStreamMetadata
     * @returns localSDPStreamMetadata
     */
    private getLocalSDPStreamMetadata;
    /**
     * Returns true if there are no incoming feeds,
     * otherwise returns false
     * @returns no incoming feeds
     */
    noIncomingFeeds(): boolean;
    private pushRemoteFeed;
    /**
     * This method is used ONLY if the other client doesn't support sending SDPStreamMetadata
     */
    private pushRemoteFeedWithoutMetadata;
    private pushNewLocalFeed;
    /**
     * Pushes supplied feed to the call
     * @param callFeed - to push
     * @param addToPeerConnection - whether to add the tracks to the peer connection
     */
    pushLocalFeed(callFeed: CallFeed, addToPeerConnection?: boolean): void;
    /**
     * Removes local call feed from the call and its tracks from the peer
     * connection
     * @param callFeed - to remove
     */
    removeLocalFeed(callFeed: CallFeed): void;
    private deleteAllFeeds;
    private deleteFeedByStream;
    private deleteFeed;
    getCurrentCallStats(): Promise<any[] | undefined>;
    private collectCallStats;
    /**
     * Configure this call from an invite event. Used by MatrixClient.
     * @param event - The m.call.invite event
     */
    initWithInvite(event: MatrixEvent): Promise<void>;
    /**
     * Configure this call from a hangup or reject event. Used by MatrixClient.
     * @param event - The m.call.hangup event
     */
    initWithHangup(event: MatrixEvent): void;
    private shouldAnswerWithMediaType;
    /**
     * Answer a call.
     */
    answer(audio?: boolean, video?: boolean): Promise<void>;
    answerWithCallFeeds(callFeeds: CallFeed[]): void;
    /**
     * Replace this call with a new call, e.g. for glare resolution. Used by
     * MatrixClient.
     * @param newCall - The new call.
     */
    replacedBy(newCall: MatrixCall): void;
    /**
     * Hangup a call.
     * @param reason - The reason why the call is being hung up.
     * @param suppressEvent - True to suppress emitting an event.
     */
    hangup(reason: CallErrorCode, suppressEvent: boolean): void;
    /**
     * Reject a call
     * This used to be done by calling hangup, but is a separate method and protocol
     * event as of MSC2746.
     */
    reject(): void;
    /**
     * Adds an audio and/or video track - upgrades the call
     * @param audio - should add an audio track
     * @param video - should add an video track
     */
    private upgradeCall;
    /**
     * Returns true if this.remoteSDPStreamMetadata is defined, otherwise returns false
     * @returns can screenshare
     */
    opponentSupportsSDPStreamMetadata(): boolean;
    /**
     * If there is a screensharing stream returns true, otherwise returns false
     * @returns is screensharing
     */
    isScreensharing(): boolean;
    /**
     * Starts/stops screensharing
     * @param enabled - the desired screensharing state
     * @param desktopCapturerSourceId - optional id of the desktop capturer source to use
     * @returns new screensharing state
     */
    setScreensharingEnabled(enabled: boolean, opts?: IScreensharingOpts): Promise<boolean>;
    /**
     * Starts/stops screensharing
     * Should be used ONLY if the opponent doesn't support SDPStreamMetadata
     * @param enabled - the desired screensharing state
     * @param desktopCapturerSourceId - optional id of the desktop capturer source to use
     * @returns new screensharing state
     */
    private setScreensharingEnabledWithoutMetadataSupport;
    /**
     * Replaces/adds the tracks from the passed stream to the localUsermediaStream
     * @param stream - to use a replacement for the local usermedia stream
     */
    updateLocalUsermediaStream(stream: MediaStream, forceAudio?: boolean, forceVideo?: boolean): Promise<void>;
    /**
     * Set whether our outbound video should be muted or not.
     * @param muted - True to mute the outbound video.
     * @returns the new mute state
     */
    setLocalVideoMuted(muted: boolean): Promise<boolean>;
    /**
     * Check if local video is muted.
     *
     * If there are multiple video tracks, <i>all</i> of the tracks need to be muted
     * for this to return true. This means if there are no video tracks, this will
     * return true.
     * @returns True if the local preview video is muted, else false
     * (including if the call is not set up yet).
     */
    isLocalVideoMuted(): boolean;
    /**
     * Set whether the microphone should be muted or not.
     * @param muted - True to mute the mic.
     * @returns the new mute state
     */
    setMicrophoneMuted(muted: boolean): Promise<boolean>;
    /**
     * Check if the microphone is muted.
     *
     * If there are multiple audio tracks, <i>all</i> of the tracks need to be muted
     * for this to return true. This means if there are no audio tracks, this will
     * return true.
     * @returns True if the mic is muted, else false (including if the call
     * is not set up yet).
     */
    isMicrophoneMuted(): boolean;
    /**
     * @returns true if we have put the party on the other side of the call on hold
     * (that is, we are signalling to them that we are not listening)
     */
    isRemoteOnHold(): boolean;
    setRemoteOnHold(onHold: boolean): void;
    /**
     * Indicates whether we are 'on hold' to the remote party (ie. if true,
     * they cannot hear us).
     * @returns true if the other party has put us on hold
     */
    isLocalOnHold(): boolean;
    /**
     * Sends a DTMF digit to the other party
     * @param digit - The digit (nb. string - '#' and '*' are dtmf too)
     */
    sendDtmfDigit(digit: string): void;
    private updateMuteStatus;
    sendMetadataUpdate(): Promise<void>;
    private gotCallFeedsForInvite;
    private sendAnswer;
    private queueGotCallFeedsForAnswer;
    private mungeSdp;
    private createOffer;
    private createAnswer;
    private gotCallFeedsForAnswer;
    /**
     * Internal
     */
    private gotLocalIceCandidate;
    private onIceGatheringStateChange;
    onRemoteIceCandidatesReceived(ev: MatrixEvent): Promise<void>;
    /**
     * Used by MatrixClient.
     */
    onAnswerReceived(event: MatrixEvent): Promise<void>;
    onSelectAnswerReceived(event: MatrixEvent): Promise<void>;
    onNegotiateReceived(event: MatrixEvent): Promise<void>;
    private updateRemoteSDPStreamMetadata;
    onSDPStreamMetadataChangedReceived(event: MatrixEvent): void;
    onAssertedIdentityReceived(event: MatrixEvent): Promise<void>;
    callHasEnded(): boolean;
    private queueGotLocalOffer;
    private wrappedGotLocalOffer;
    private gotLocalOffer;
    private getLocalOfferFailed;
    private getUserMediaFailed;
    private onIceConnectionStateChanged;
    private onSignallingStateChanged;
    private onTrack;
    private onDataChannel;
    /**
     * This method removes all video/rtx codecs from screensharing video
     * transceivers. This is necessary since they can cause problems. Without
     * this the following steps should produce an error:
     *   Chromium calls Firefox
     *   Firefox answers
     *   Firefox starts screen-sharing
     *   Chromium starts screen-sharing
     *   Call crashes for Chromium with:
     *       [96685:23:0518/162603.933321:ERROR:webrtc_video_engine.cc(3296)] RTX codec (PT=97) mapped to PT=96 which is not in the codec list.
     *       [96685:23:0518/162603.933377:ERROR:webrtc_video_engine.cc(1171)] GetChangedRecvParameters called without any video codecs.
     *       [96685:23:0518/162603.933430:ERROR:sdp_offer_answer.cc(4302)] Failed to set local video description recv parameters for m-section with mid='2'. (INVALID_PARAMETER)
     */
    private getRidOfRTXCodecs;
    private onNegotiationNeeded;
    onHangupReceived: (msg: MCallHangupReject) => void;
    onRejectReceived: (msg: MCallHangupReject) => void;
    onAnsweredElsewhere: (msg: MCallAnswer) => void;
    /**
     * @internal
     */
    private sendVoipEvent;
    /**
     * Queue a candidate to be sent
     * @param content - The candidate to queue up, or null if candidates have finished being generated
     *                and end-of-candidates should be signalled
     */
    private queueCandidate;
    private discardDuplicateCandidates;
    transfer(targetUserId: string): Promise<void>;
    transferToCall(transferTargetCall: MatrixCall): Promise<void>;
    private terminate;
    private stopAllMedia;
    private checkForErrorListener;
    private sendCandidateQueue;
    /**
     * Place a call to this room.
     * @throws if you have not specified a listener for 'error' events.
     * @throws if have passed audio=false.
     */
    placeCall(audio: boolean, video: boolean): Promise<void>;
    /**
     * Place a call to this room with call feed.
     * @param callFeeds - to use
     * @throws if you have not specified a listener for 'error' events.
     * @throws if have passed audio=false.
     */
    placeCallWithCallFeeds(callFeeds: CallFeed[], requestScreenshareFeed?: boolean): Promise<void>;
    private createPeerConnection;
    private partyIdMatches;
    private chooseOpponent;
    private addBufferedIceCandidates;
    private addIceCandidates;
    get hasPeerConnection(): boolean;
}
export declare function setTracksEnabled(tracks: Array<MediaStreamTrack>, enabled: boolean): void;
export declare function supportsMatrixCall(): boolean;
/**
 * DEPRECATED
 * Use client.createCall()
 *
 * Create a new Matrix call for the browser.
 * @param client - The client instance to use.
 * @param roomId - The room the call is in.
 * @param options - DEPRECATED optional options map.
 * @returns the call or null if the browser doesn't support calling.
 */
export declare function createNewMatrixCall(client: MatrixClient, roomId: string, options?: Pick<CallOpts, "forceTURN" | "invitee" | "opponentDeviceId" | "opponentSessionId" | "groupCallId">): MatrixCall | null;
export {};
//# sourceMappingURL=call.d.ts.map