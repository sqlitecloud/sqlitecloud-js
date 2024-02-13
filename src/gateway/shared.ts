//
// types.ts - shared types for client and server
//

/** Generic api request as a json dictionary */
export type ApiRequest = Record<string, unknown>

export interface ApiResponse {
  /** Rows are returned as dictionaries or arrays */
  data?: unknown
  /** Additional metadata */
  metadata?: unknown
  /** Optional error condition */
  error?: {
    /** Error status as http code */
    status: string
    title?: string
    detail?: string
    // SQLiteCloudError additional properties
    errorCode?: string
    externalErrorCode?: string
    offsetCode?: number
  }
}

/** An api call to perform a query */
export interface SqlApiRequest extends ApiRequest {
  /** If the optional database name is specified, the connection will perform a USE DATABASE before running the query */
  database?: string
  /** The sql query to be executed */
  sql: string
  /** Rows can be returned as arrays (default) or dictionaries */
  row?: 'array' | 'dictionary'
}

export const DEFAULT_PORT_SOCKET = 4000
export const DEFAULT_PORT_HTTP = 8090
