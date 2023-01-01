import type { IEventDecryptionResult, IMegolmSessionData } from "../@types/crypto";
import { MatrixEvent } from "../models/event";
/**
 * Common interface for the crypto implementations
 */
export interface CryptoBackend {
    /**
     * Global override for whether the client should ever send encrypted
     * messages to unverified devices. This provides the default for rooms which
     * do not specify a value.
     *
     * If true, all unverified devices will be blacklisted by default
     */
    globalBlacklistUnverifiedDevices: boolean;
    /**
     * Whether sendMessage in a room with unknown and unverified devices
     * should throw an error and not send the message. This has 'Global' for
     * symmetry with setGlobalBlacklistUnverifiedDevices but there is currently
     * no room-level equivalent for this setting.
     */
    globalErrorOnUnknownDevices: boolean;
    /**
     * Shut down any background processes related to crypto
     */
    stop(): void;
    /**
     * Checks if the user has previously published cross-signing keys
     *
     * This means downloading the devicelist for the user and checking if the list includes
     * the cross-signing pseudo-device.

     * @returns true if the user has previously published cross-signing keys
     */
    userHasCrossSigningKeys(): Promise<boolean>;
    /**
     * Decrypt a received event
     *
     * @returns a promise which resolves once we have finished decrypting.
     * Rejects with an error if there is a problem decrypting the event.
     */
    decryptEvent(event: MatrixEvent): Promise<IEventDecryptionResult>;
    /**
     * Get a list containing all of the room keys
     *
     * This should be encrypted before returning it to the user.
     *
     * @returns a promise which resolves to a list of
     *    session export objects
     */
    exportRoomKeys(): Promise<IMegolmSessionData[]>;
}
//# sourceMappingURL=CryptoBackend.d.ts.map