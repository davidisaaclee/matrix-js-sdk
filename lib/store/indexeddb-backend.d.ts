import { ISavedSync } from "./index";
import { IEvent, IStartClientOpts, IStateEventWithRoomId, ISyncResponse } from "..";
import { IndexedToDeviceBatch, ToDeviceBatchWithTxnId } from "../models/ToDeviceMessage";
export interface IIndexedDBBackend {
    connect(): Promise<void>;
    syncToDatabase(userTuples: UserTuple[]): Promise<void>;
    isNewlyCreated(): Promise<boolean>;
    setSyncData(syncData: ISyncResponse): Promise<void>;
    getSavedSync(): Promise<ISavedSync>;
    getNextBatchToken(): Promise<string>;
    clearDatabase(): Promise<void>;
    getOutOfBandMembers(roomId: string): Promise<IStateEventWithRoomId[] | null>;
    setOutOfBandMembers(roomId: string, membershipEvents: IStateEventWithRoomId[]): Promise<void>;
    clearOutOfBandMembers(roomId: string): Promise<void>;
    getUserPresenceEvents(): Promise<UserTuple[]>;
    getClientOptions(): Promise<IStartClientOpts>;
    storeClientOptions(options: IStartClientOpts): Promise<void>;
    saveToDeviceBatches(batches: ToDeviceBatchWithTxnId[]): Promise<void>;
    getOldestToDeviceBatch(): Promise<IndexedToDeviceBatch>;
    removeToDeviceBatch(id: number): Promise<void>;
}
export type UserTuple = [userId: string, presenceEvent: Partial<IEvent>];
//# sourceMappingURL=indexeddb-backend.d.ts.map