import * as RustSdkCryptoJs from "@matrix-org/matrix-sdk-crypto-js";
import type { IEventDecryptionResult, IMegolmSessionData } from "../@types/crypto";
import { MatrixEvent } from "../models/event";
import { CryptoBackend } from "../common-crypto/CryptoBackend";
/**
 * An implementation of {@link CryptoBackend} using the Rust matrix-sdk-crypto.
 */
export declare class RustCrypto implements CryptoBackend {
    private readonly olmMachine;
    globalBlacklistUnverifiedDevices: boolean;
    globalErrorOnUnknownDevices: boolean;
    /** whether stop() has been called */
    private stopped;
    constructor(olmMachine: RustSdkCryptoJs.OlmMachine, _userId: string, _deviceId: string);
    stop(): void;
    decryptEvent(event: MatrixEvent): Promise<IEventDecryptionResult>;
    userHasCrossSigningKeys(): Promise<boolean>;
    exportRoomKeys(): Promise<IMegolmSessionData[]>;
}
//# sourceMappingURL=rust-crypto.d.ts.map