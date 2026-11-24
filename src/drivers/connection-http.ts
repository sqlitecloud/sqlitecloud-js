/** Stateless HTTP transport for the SQLite Cloud Gateway. */

import { SQLiteCloudConnection } from './connection'
import { decodeGatewayResponse } from './gateway-response'
import { buildGatewaySqlUrl } from './gateway-url'
import { ErrorCallback, ResultsCallback, SQLiteCloudCommand, SQLiteCloudConfig, SQLiteCloudError } from './types'
import { encodeBigIntMarkers, getAbortError } from './utilities'
import { Buffer } from 'buffer'

const BASE64_BLOB_TRANSFER_FORMAT = 'base64-blobs-v1'

/** Runs each command as an independent POST to /v2/weblite/sql. */
export class SQLiteCloudHttpConnection extends SQLiteCloudConnection {
  private closed = false
  private readonly pending = new Set<AbortController>()

  get connected(): boolean {
    return !this.closed
  }

  get concurrent(): boolean {
    return true
  }

  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    this.config = config
    this.closed = false
    callback?.call(this, null)
    return this
  }

  transportCommands(commands: string | SQLiteCloudCommand, callback?: ResultsCallback): this {
    const command = typeof commands === 'string' ? { query: commands } : commands
    const controller = new AbortController()
    const signal = command.signal
    let timeout: ReturnType<typeof setTimeout> | undefined
    let settled = false

    const finish = (error: Error | null, result?: any) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      this.pending.delete(controller)
      callback?.call(this, error, result)
    }
    const abort = () => controller.abort((signal as AbortSignal & { reason?: unknown }).reason)

    if (this.closed) {
      finish(new SQLiteCloudError('Connection closed', { errorCode: 'ERR_CONNECTION_CLOSED' }))
      return this
    }
    if (signal?.aborted) {
      finish(getAbortError(signal))
      return this
    }

    this.pending.add(controller)
    signal?.addEventListener('abort', abort, { once: true })
    const timeoutMs = this.config.timeout ?? 0
    if (timeoutMs > 0) {
      timeout = setTimeout(() => controller.abort(new SQLiteCloudError(`Request timed out after ${timeoutMs} ms`, { errorCode: 'ERR_CONNECTION_TIMEOUT' })), timeoutMs)
    }

    void this.post(command, controller.signal)
      .then(result => finish(null, result))
      .catch(error => {
        if (controller.signal.aborted) {
          const reason = (controller.signal as AbortSignal & { reason?: unknown }).reason
          finish(reason instanceof Error ? reason : signal ? getAbortError(signal) : new SQLiteCloudError('Request aborted', { errorCode: 'ERR_ABORTED' }))
          return
        }
        if (error instanceof SQLiteCloudError) {
          finish(error)
        } else {
          finish(new SQLiteCloudError(error instanceof Error ? error.message : String(error), { errorCode: 'ERR_CONNECTION_ERROR', cause: error instanceof Error ? error : undefined }))
        }
      })

    return this
  }

  private async post(command: SQLiteCloudCommand, signal: AbortSignal): Promise<any> {
    const { bind, blobBindIndexes } = encodeHttpBindings(command.parameters)
    const response = await fetch(this.gatewayUrl(), {
      method: 'POST',
      headers: this.headers(),
      signal,
      body: JSON.stringify({
        sql: command.query,
        bind,
        database: this.config.database,
        row: 'array',
        safe_integer_mode: this.config.safe_integer_mode,
        capabilities: {
          blobTransferFormat: BASE64_BLOB_TRANSFER_FORMAT,
          blobBindIndexes,
          bigIntMarkerFormat: 'tagged-v1'
        }
      })
    })

    const body = await response.text()
    let payload: any
    try {
      payload = body ? JSON.parse(body) : undefined
    } catch {
      throw httpError(response.status, response.statusText, body)
    }

    if (!response.ok) throw httpError(response.status, response.statusText, body)

    const decoded = decodeGatewayResponse(payload, this.config.safe_integer_mode)
    if (decoded.error) throw decoded.error
    return decoded.result
  }

  private gatewayUrl(): string {
    return buildGatewaySqlUrl(this.config.host || '', this.config.gatewayurl)
  }

  private headers(): Record<string, string> {
    const token = this.config.apikey || this.config.token
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  close(): this {
    this.closed = true
    for (const controller of this.pending) {
      controller.abort(new SQLiteCloudError('Connection closed', { errorCode: 'ERR_CONNECTION_CLOSED' }))
    }
    this.pending.clear()
    this.operations.clear()
    return this
  }
}

function encodeHttpBindings(parameters?: SQLiteCloudCommand['parameters']): { bind?: any[]; blobBindIndexes: number[] } {
  if (!parameters) return { bind: undefined, blobBindIndexes: [] }
  const blobBindIndexes: number[] = []
  const bind = parameters.map((value, index) => {
    const buffer = binaryBuffer(value)
    if (!buffer) return encodeBigIntMarkers(value)
    blobBindIndexes.push(index)
    return buffer.toString('base64')
  })
  return { bind, blobBindIndexes }
}

function binaryBuffer(value: unknown): Buffer | undefined {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value as ArrayBufferView)) {
    const view = value as ArrayBufferView
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength)
  }
}

function httpError(status: number, statusText: string, body: string): SQLiteCloudError {
  const message = `${status} ${statusText}${body ? `: ${body.slice(0, 512)}` : ''}`
  const errorCode = status === 401 ? 'ERR_GATEWAY_UNAUTHORIZED' : status === 413 ? 'ERR_GATEWAY_PAYLOAD_TOO_LARGE' : [502, 503, 504].includes(status) ? 'ERR_GATEWAY_UNAVAILABLE' : 'ERR_GATEWAY_HTTP_ERROR'
  return new SQLiteCloudError(message, { errorCode })
}

export default SQLiteCloudHttpConnection
