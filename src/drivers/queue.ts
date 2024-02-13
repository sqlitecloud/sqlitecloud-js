//
// queue.ts - simple task queue used to linearize async operations
//

export type OperationCallback = (error: Error | null) => void
export type Operation = (done: OperationCallback) => void

export class OperationsQueue {
  private queue: Operation[] = []
  private isProcessing = false

  /** Add operations to the queue, process immediately if possible, else wait for previous operations to complete */
  public enqueue(operation: Operation): void {
    this.queue.push(operation)
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  /** Clear the queue */
  public clear(): void {
    this.queue = []
    this.isProcessing = false
  }

  /** Process the next operation in the queue */
  private processNext(): void {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const operation = this.queue.shift()
    operation?.(() => {
      // could receive (error) => { ...
      // if (error) {
      //   console.warn('OperationQueue.processNext - error in operation', error)
      // }

      // process the next operation in the queue
      this.processNext()
    })
  }
}
