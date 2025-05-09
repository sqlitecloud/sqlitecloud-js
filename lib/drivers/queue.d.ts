export type OperationCallback = (error: Error | null) => void;
export type Operation = (done: OperationCallback) => void;
export declare class OperationsQueue {
    private queue;
    private isProcessing;
    /** Add operations to the queue, process immediately if possible, else wait for previous operations to complete */
    enqueue(operation: Operation): void;
    /** Clear the queue */
    clear(): void;
    /** Process the next operation in the queue */
    private processNext;
}
