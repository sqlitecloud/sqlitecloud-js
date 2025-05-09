"use strict";
//
// queue.ts - simple task queue used to linearize async operations
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsQueue = void 0;
class OperationsQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }
    /** Add operations to the queue, process immediately if possible, else wait for previous operations to complete */
    enqueue(operation) {
        this.queue.push(operation);
        if (!this.isProcessing) {
            this.processNext();
        }
    }
    /** Clear the queue */
    clear() {
        this.queue = [];
        this.isProcessing = false;
    }
    /** Process the next operation in the queue */
    processNext() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }
        this.isProcessing = true;
        const operation = this.queue.shift();
        operation === null || operation === void 0 ? void 0 : operation(() => {
            // could receive (error) => { ...
            // if (error) {
            //   console.warn('OperationQueue.processNext - error in operation', error)
            // }
            // process the next operation in the queue
            this.processNext();
        });
    }
}
exports.OperationsQueue = OperationsQueue;
