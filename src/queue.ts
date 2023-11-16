//
// queue.ts - OperationsQueue is used to linearize operations on the connection
//

type OperationCallback = (error?: Error) => void
type Operation = (done: OperationCallback) => void

export class OperationsQueue {
  private queue: Operation[] = []
  private isProcessing = false

  /** Add operations to the queue, process immediately if possible, else wait for previous operations to complete */
  public enqueue(operation: Operation) {
    this.queue.push(operation)
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  /** Clear the queue */
  public clear() {
    this.queue = []
    this.isProcessing = false
  }

  /** Process the next operation in the queue */
  private processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const operation = this.queue.shift()
    operation?.(error => {
      if (error) {
        console.warn('OperationQueue.processNext - error in operation', error)
      }

      // process the next operation in the queue
      this.processNext()
    })
  }
}
