export declare enum PushRuleActionName {
    DontNotify = "dont_notify",
    Notify = "notify",
    Coalesce = "coalesce"
}
export declare enum TweakName {
    Highlight = "highlight",
    Sound = "sound"
}
export type Tweak<N extends TweakName, V> = {
    set_tweak: N;
    value?: V;
};
export type TweakHighlight = Tweak<TweakName.Highlight, boolean>;
export type TweakSound = Tweak<TweakName.Sound, string>;
export type Tweaks = TweakHighlight | TweakSound;
export declare enum ConditionOperator {
    ExactEquals = "==",
    LessThan = "<",
    GreaterThan = ">",
    GreaterThanOrEqual = ">=",
    LessThanOrEqual = "<="
}
export type PushRuleAction = Tweaks | PushRuleActionName;
export type MemberCountCondition<N extends number, Op extends ConditionOperator = ConditionOperator.ExactEquals> = `${Op}${N}` | (Op extends ConditionOperator.ExactEquals ? `${N}` : never);
export type AnyMemberCountCondition = MemberCountCondition<number, ConditionOperator>;
export declare const DMMemberCountCondition: MemberCountCondition<2>;
export declare function isDmMemberCountCondition(condition: AnyMemberCountCondition): boolean;
export declare enum ConditionKind {
    EventMatch = "event_match",
    ContainsDisplayName = "contains_display_name",
    RoomMemberCount = "room_member_count",
    SenderNotificationPermission = "sender_notification_permission",
    CallStarted = "call_started",
    CallStartedPrefix = "org.matrix.msc3914.call_started"
}
export interface IPushRuleCondition<N extends ConditionKind | string> {
    [k: string]: any;
    kind: N;
}
export interface IEventMatchCondition extends IPushRuleCondition<ConditionKind.EventMatch> {
    key: string;
    pattern?: string;
    value?: string;
}
export interface IContainsDisplayNameCondition extends IPushRuleCondition<ConditionKind.ContainsDisplayName> {
}
export interface IRoomMemberCountCondition extends IPushRuleCondition<ConditionKind.RoomMemberCount> {
    is: AnyMemberCountCondition;
}
export interface ISenderNotificationPermissionCondition extends IPushRuleCondition<ConditionKind.SenderNotificationPermission> {
    key: string;
}
export interface ICallStartedCondition extends IPushRuleCondition<ConditionKind.CallStarted> {
}
export interface ICallStartedPrefixCondition extends IPushRuleCondition<ConditionKind.CallStartedPrefix> {
}
export type PushRuleCondition = IEventMatchCondition | IContainsDisplayNameCondition | IRoomMemberCountCondition | ISenderNotificationPermissionCondition | ICallStartedCondition | ICallStartedPrefixCondition;
export declare enum PushRuleKind {
    Override = "override",
    ContentSpecific = "content",
    RoomSpecific = "room",
    SenderSpecific = "sender",
    Underride = "underride"
}
export declare enum RuleId {
    Master = ".m.rule.master",
    ContainsDisplayName = ".m.rule.contains_display_name",
    ContainsUserName = ".m.rule.contains_user_name",
    AtRoomNotification = ".m.rule.roomnotif",
    DM = ".m.rule.room_one_to_one",
    EncryptedDM = ".m.rule.encrypted_room_one_to_one",
    Message = ".m.rule.message",
    EncryptedMessage = ".m.rule.encrypted",
    InviteToSelf = ".m.rule.invite_for_me",
    MemberEvent = ".m.rule.member_event",
    IncomingCall = ".m.rule.call",
    SuppressNotices = ".m.rule.suppress_notices",
    Tombstone = ".m.rule.tombstone"
}
export type PushRuleSet = {
    [k in PushRuleKind]?: IPushRule[];
};
export interface IPushRule {
    actions: PushRuleAction[];
    conditions?: PushRuleCondition[];
    default: boolean;
    enabled: boolean;
    pattern?: string;
    rule_id: RuleId | string;
}
export interface IAnnotatedPushRule extends IPushRule {
    kind: PushRuleKind;
}
export interface IPushRules {
    global: PushRuleSet;
    device?: PushRuleSet;
}
export interface IPusher {
    "app_display_name": string;
    "app_id": string;
    "data": {
        format?: string;
        url?: string;
        brand?: string;
    };
    "device_display_name": string;
    "kind": "http" | string;
    "lang": string;
    "profile_tag"?: string;
    "pushkey": string;
    "enabled"?: boolean | null;
    "org.matrix.msc3881.enabled"?: boolean | null;
    "device_id"?: string | null;
    "org.matrix.msc3881.device_id"?: string | null;
}
export interface IPusherRequest extends Omit<IPusher, "device_id" | "org.matrix.msc3881.device_id"> {
    append?: boolean;
}
//# sourceMappingURL=PushRules.d.ts.map