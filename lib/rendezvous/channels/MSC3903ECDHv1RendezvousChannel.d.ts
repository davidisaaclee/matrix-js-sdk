import { RendezvousCode, RendezvousIntent, RendezvousChannel, RendezvousTransportDetails, RendezvousTransport, RendezvousFailureReason } from "..";
import { UnstableValue } from "../../NamespacedValue";
declare const ECDH_V1: UnstableValue<"m.rendezvous.v1.curve25519-aes-sha256", "org.matrix.msc3903.rendezvous.v1.curve25519-aes-sha256">;
export interface ECDHv1RendezvousCode extends RendezvousCode {
    rendezvous: {
        transport: RendezvousTransportDetails;
        algorithm: typeof ECDH_V1.name | typeof ECDH_V1.altName;
        key: string;
    };
}
export type MSC3903ECDHPayload = PlainTextPayload | EncryptedPayload;
export interface PlainTextPayload {
    algorithm: typeof ECDH_V1.name | typeof ECDH_V1.altName;
    key?: string;
}
export interface EncryptedPayload {
    iv: string;
    ciphertext: string;
}
/**
 * Implementation of the unstable [MSC3903](https://github.com/matrix-org/matrix-spec-proposals/pull/3903)
 * X25519/ECDH key agreement based secure rendezvous channel.
 * Note that this is UNSTABLE and may have breaking changes without notice.
 */
export declare class MSC3903ECDHv1RendezvousChannel<T> implements RendezvousChannel<T> {
    private transport;
    private theirPublicKey?;
    onFailure?: ((reason: RendezvousFailureReason) => void) | undefined;
    private olmSAS?;
    private ourPublicKey;
    private aesKey?;
    private connected;
    constructor(transport: RendezvousTransport<MSC3903ECDHPayload>, theirPublicKey?: Uint8Array | undefined, onFailure?: ((reason: RendezvousFailureReason) => void) | undefined);
    generateCode(intent: RendezvousIntent): Promise<ECDHv1RendezvousCode>;
    connect(): Promise<string>;
    private encrypt;
    send(payload: T): Promise<void>;
    private decrypt;
    receive(): Promise<Partial<T> | undefined>;
    close(): Promise<void>;
    cancel(reason: RendezvousFailureReason): Promise<void>;
}
export {};
//# sourceMappingURL=MSC3903ECDHv1RendezvousChannel.d.ts.map