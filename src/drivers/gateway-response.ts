/** Gateway JSON response decoding shared by the HTTP and socket.io transports. */

import { SQLiteCloudRowset } from './rowset'
import { SQLiteCloudError, SQLiteCloudSafeIntegerMode, SQLiteCloudWebsocketBlobTransferFormat } from './types'
import { decodeBigIntMarkers, decodeGatewayRowsetData, parseWebsocketBlobTransferFormat, reviveJsonBuffers } from './utilities'

function gatewayError(response: any): Record<string, any> | undefined {
  if (response?.error && typeof response.error === 'object') return response.error
  if (Array.isArray(response?.errors) && response.errors[0] && typeof response.errors[0] === 'object') return response.errors[0]
}

function blobTransferFormat(response: any): SQLiteCloudWebsocketBlobTransferFormat | undefined {
  return parseWebsocketBlobTransferFormat(response?.capabilities?.blobTransferFormat || response?.blobTransferFormat, undefined)
}

function allowLegacyBigIntMarkers(response: any): boolean {
  return response?.bigIntMarkerFormat !== 'tagged-v1'
}

function isRowsetMetadata(metadata: any): boolean {
  return metadata && metadata.numberOfRows !== undefined && metadata.numberOfColumns !== undefined && Array.isArray(metadata.columns)
}

/** Decode a response produced by /v2/weblite/sql into the driver's ordinary result objects. */
export function decodeGatewayResponse(response: any, safeIntegerMode?: SQLiteCloudSafeIntegerMode): { error?: SQLiteCloudError; result?: any } {
  const responseError = gatewayError(response)
  if (responseError) {
    const errorFields = responseError.meta && typeof responseError.meta === 'object' ? responseError.meta : responseError
    return {
      error: new SQLiteCloudError(responseError.detail || responseError.message || 'Gateway error', { ...errorFields })
    }
  }

  const metadata = response?.metadata
  if (isRowsetMetadata(metadata)) {
    const data = decodeGatewayRowsetData(response?.data, metadata, safeIntegerMode, blobTransferFormat(response), allowLegacyBigIntMarkers(response))
    if (!Array.isArray(data)) {
      return { error: new SQLiteCloudError('Gateway returned an invalid rowset.', { errorCode: 'ERR_GATEWAY_INVALID_RESPONSE' }) }
    }
    return { result: new SQLiteCloudRowset(metadata, data.flat()) }
  }

  return { result: decodeBigIntMarkers(reviveJsonBuffers(response?.data), safeIntegerMode, allowLegacyBigIntMarkers(response)) }
}
