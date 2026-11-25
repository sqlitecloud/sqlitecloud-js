/** Stateless HTTP transport for the SQLite Cloud Gateway. */

import { SQLiteCloudConnection } from './connection'
import { decodeGatewayResponse } from './gateway-response'
import { buildGatewaySqlUrl } from './gateway-url'
import { ErrorCallback, ResultsCallback, SQLiteCloudCommand, SQLiteCloudConfig, SQLiteCloudError, SQLiteCloudWebsocketBlobTransferFormat } from './types'
import { encodeBigIntMarkers, encodeBlobMarker, getAbortError, toBuffer } from './utilities'

/** HTTP binds and rowsets are plain JSON, so BLOBs always travel as base64-blobs-v2 markers. */
const HTTP_BLOB_TRANSFER_FORMAT: SQLiteCloudWebsocketBlobTransferFormat = 'base64-blobs-v2'

/** Runs each command as an independent POST to /v2/weblite/sql. */
export class SQLiteCloudHttpConnection extends SQLiteCloudConnection {
  private closed = false
  private readonly pending = new Set<AbortController>()
  private readonly drained: Array<() => void> = []

  get connected(): boolean {
    return !this.closed
  }

  get concurrent(): boolean {
    return true
  }

  connectTransport(config: SQLiteCloudConfig, callback?: ErrorCallback): this {
    this.config = config
    this.closed = false
    // no handshake: report asynchronously like the other transports, so the caller has stored the connection first
    queueMicrotask(() => callback?.call(this, null))
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
      if (this.pending.size === 0) this.drained.splice(0).forEach(resolve => resolve())
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
      timeout = setTimeout(
        () => controller.abort(new SQLiteCloudError(`Request timed out after ${timeoutMs} ms`, { errorCode: 'ERR_CONNECTION_TIMEOUT' })),
        timeoutMs
      )
    }

    void this.post(command, controller.signal)
      .then(result => finish(null, result))
      .catch(error => {
        if (controller.signal.aborted) {
          finish(getAbortError(controller.signal))
          return
        }
        if (error instanceof SQLiteCloudError) {
          finish(error)
        } else {
          finish(
            new SQLiteCloudError(error instanceof Error ? error.message : String(error), {
              errorCode: 'ERR_CONNECTION_ERROR',
              cause: error instanceof Error ? error : undefined
            })
          )
        }
      })

    return this
  }

  private async post(command: SQLiteCloudCommand, signal: AbortSignal): Promise<any> {
    const bind = encodeHttpBindings(command.parameters)
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
          blobTransferFormat: HTTP_BLOB_TRANSFER_FORMAT,
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

    // gateway errors, sql errors included, come as a JSON `errors[]` body with a non-2xx status:
    // keep their own codes and fill in a transport code only when they carry none
    const decoded = decodeGatewayResponse(payload, this.config.safe_integer_mode)
    if (decoded.error) {
      decoded.error.errorCode ??= httpErrorCode(response.status)
      throw decoded.error
    }
    if (!response.ok) throw httpError(response.status, response.statusText, body)
    return decoded.result
  }

  private gatewayUrl(): string {
    return buildGatewaySqlUrl(this.config.host || '', this.config.gatewayurl)
  }

  private headers(): Record<string, string> {
    const token = this.config.unauthenticated ? undefined : this.config.apikey || this.config.token
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  /** Stops accepting commands. Requests already sent run to completion: the server has them, so aborting here would misreport a committed write. */
  close(): this {
    this.closed = true
    this.operations.clear()
    return this
  }

  drain(): Promise<void> | undefined {
    if (this.pending.size === 0) return undefined
    return new Promise(resolve => this.drained.push(resolve))
  }
}

/** JSON bind parameters: a binary value becomes a base64-blobs-v2 marker, anything else keeps its tagged BigInt form. */
function encodeHttpBindings(parameters?: SQLiteCloudCommand['parameters']): any[] | undefined {
  return parameters?.map(value => {
    const buffer = toBuffer(value)
    return buffer ? encodeBlobMarker(buffer) : encodeBigIntMarkers(value)
  })
}

function httpErrorCode(status: number): string {
  if (status === 401) return 'ERR_GATEWAY_UNAUTHORIZED'
  if (status === 413) return 'ERR_GATEWAY_PAYLOAD_TOO_LARGE'
  if ([502, 503, 504].includes(status)) return 'ERR_GATEWAY_UNAVAILABLE'
  return 'ERR_GATEWAY_HTTP_ERROR'
}

function httpError(status: number, statusText: string, body: string): SQLiteCloudError {
  const message = `${status} ${statusText}${body ? `: ${body.slice(0, 512)}` : ''}`
  return new SQLiteCloudError(message, { errorCode: httpErrorCode(status) })
}

export default SQLiteCloudHttpConnection
