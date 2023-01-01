export declare enum ReceiptType {
    Read = "m.read",
    FullyRead = "m.fully_read",
    ReadPrivate = "m.read.private"
}
export declare const MAIN_ROOM_TIMELINE = "main";
export interface Receipt {
    ts: number;
    thread_id?: string;
}
export interface WrappedReceipt {
    eventId: string;
    data: Receipt;
}
export interface CachedReceipt {
    type: ReceiptType;
    userId: string;
    data: Receipt;
}
export type ReceiptCache = {
    [eventId: string]: CachedReceipt[];
};
export interface ReceiptContent {
    [eventId: string]: {
        [key in ReceiptType | string]: {
            [userId: string]: Receipt;
        };
    };
}
export type Receipts = {
    [receiptType: string]: {
        [userId: string]: [WrappedReceipt | null, WrappedReceipt | null];
    };
};
//# sourceMappingURL=read_receipts.d.ts.map