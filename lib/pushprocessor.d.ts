import { MatrixClient } from "./client";
import { MatrixEvent } from "./models/event";
import { IPushRule, IPushRules, PushRuleAction, TweakName } from "./@types/PushRules";
export interface IActionsObject {
    /** Whether this event should notify the user or not. */
    notify: boolean;
    /** How this event should be notified. */
    tweaks: Partial<Record<TweakName, any>>;
}
export declare class PushProcessor {
    private readonly client;
    /**
     * Construct a Push Processor.
     * @param client - The Matrix client object to use
     */
    constructor(client: MatrixClient);
    /**
     * Convert a list of actions into a object with the actions as keys and their values
     * @example
     * eg. `[ 'notify', { set_tweak: 'sound', value: 'default' } ]`
     *     becomes `{ notify: true, tweaks: { sound: 'default' } }`
     * @param actionList - The actions list
     *
     * @returns A object with key 'notify' (true or false) and an object of actions
     */
    static actionListToActionsObject(actionList: PushRuleAction[]): IActionsObject;
    /**
     * Rewrites conditions on a client's push rules to match the defaults
     * where applicable. Useful for upgrading push rules to more strict
     * conditions when the server is falling behind on defaults.
     * @param incomingRules - The client's existing push rules
     * @returns The rewritten rules
     */
    static rewriteDefaultRules(incomingRules: IPushRules): IPushRules;
    private static cachedGlobToRegex;
    private matchingRuleFromKindSet;
    private templateRuleToRaw;
    private eventFulfillsCondition;
    private eventFulfillsSenderNotifPermCondition;
    private eventFulfillsRoomMemberCountCondition;
    private eventFulfillsDisplayNameCondition;
    private eventFulfillsEventMatchCondition;
    private eventFulfillsCallStartedCondition;
    private createCachedRegex;
    private valueForDottedKey;
    private matchingRuleForEventWithRulesets;
    private pushActionsForEventAndRulesets;
    ruleMatchesEvent(rule: Partial<IPushRule> & Pick<IPushRule, "conditions">, ev: MatrixEvent): boolean;
    /**
     * Get the user's push actions for the given event
     */
    actionsForEvent(ev: MatrixEvent): IActionsObject;
    /**
     * Get one of the users push rules by its ID
     *
     * @param ruleId - The ID of the rule to search for
     * @returns The push rule, or null if no such rule was found
     */
    getPushRuleById(ruleId: string): IPushRule | null;
}
//# sourceMappingURL=pushprocessor.d.ts.map