//
// gateway.ts - SQLite Cloud Gateway enabling websocket connections and SQL to json queries
//

import packageJson from '../../package.json'

// bun specific driver + shared classes
import { SQLiteCloudBunConnection } from './connection-bun'
import { SQLiteCloudRowset, SQLiteCloudError, validateConfiguration } from '../index'
import { type ApiRequest, type ApiResponse, type SqlApiRequest, DEFAULT_PORT_HTTP, DEFAULT_PORT_SOCKET, GatewayError } from './shared'
import { VERBOSE, connectAsync, sendCommandsAsync, log, errorResponse } from './utilities'
import { getServerInfo, getDatabases, getStats } from './api'

// external modules
import { heapStats } from 'bun:jsc'
import { Server } from 'socket.io'
import express from 'express'
import http from 'http'

// port where socket.io will listen for connections
const SOCKET_PORT = parseInt(process.env['SOCKET_PORT'] || DEFAULT_PORT_SOCKET.toString())
// port where http server will listen for connections
const HTTP_PORT = parseInt(process.env['HTTP_PORT'] || DEFAULT_PORT_HTTP.toString())

console.log(`@sqlitecloud/gateway v${packageJson.version}`)

//
// express
//

// Express app for HTTP server
const app = express()
app.use(express.json())
app.use(express.static('public'))
const appStartedOn = new Date()

// server for socket.io and http endpoints
const server = http.createServer(app)

//
// websocket server
//

// Replacing Deno's Server with socket.io's Server
const io = new Server(server, {
  cors: {
    origin: '*', // specify the client origin
    methods: ['GET', 'POST'], // allowed HTTP methods
    credentials: true // allow credentials (cookies, session)
  }
})

// Establish handlers for a socket.io connection
io.on('connection', socket => {
  //
  // state
  //

  // the connection string is passed in the bearer token
  // https://socket.io/docs/v4/client-options/#auth
  const connectionString = socket.handshake.auth.token as string
  let connection: SQLiteCloudBunConnection | null = null
  log(`ws | connect socket.id: ${socket.id}`)

  //
  // handlers
  //

  async function getConnection(): Promise<SQLiteCloudBunConnection> {
    if (!connection) {
      const startTime = Date.now()
      log('ws | connecting...')
      connection = await connectAsync(connectionString)
      log(`ws | connected in ${Date.now() - startTime}ms`)
    }
    return connection
  }

  async function callbackWithApiResponse(
    callback: (response: ApiResponse) => void,
    func: (connection: SQLiteCloudBunConnection, ...args: any[]) => Promise<ApiResponse>,
    ...args: any[]
  ) {
    try {
      const connection = await getConnection()
      const response = await func(connection, ...args)
      callback(response)
    } catch (error) {
      callback({ error: { status: '500', title: String(error) } })
    }
  }

  // received a sql query request from the client socket
  socket.on('v1/info', async (_request: ApiRequest, callback: (response: ApiResponse) => void) => {
    const serverInfo = getServerInfo()
    log(`ws | info <- ${JSON.stringify(serverInfo)}`)
    return callback(serverInfo)
  })

  socket.on('v1/databases', async (_request: ApiRequest, callback: (response: ApiResponse) => void) => {
    await callbackWithApiResponse(callback, getDatabases)
  })

  socket.on('v1/stats', async (_request: ApiRequest, callback: (response: ApiResponse) => void) => {
    await callbackWithApiResponse(callback, getStats)
  })

  // received a sql query request from the client socket
  socket.on('v1/sql', async (request: SqlApiRequest, callback: (response: ApiResponse) => void) => {
    if (!connectionString) {
      callback({ error: { status: '401', title: 'Unauthorized', detail: 'Provide connection string in bearer token' } })
      return
    }

    try {
      log(`ws | sql -> ${JSON.stringify(request)}`)
      const connection = await getConnection()
      const response = await queryAsync(connection, request)
      log(`ws | sql <- ${JSON.stringify(response)}`)
      return callback(response)
    } catch (error) {
      callback({ error: { status: '400', title: 'Bad Request', detail: error as string } })
    }
  })

  // received a disconnect request from the client socket
  socket.on('disconnect', () => {
    log(`ws | disconnect socket.id: ${socket.id}`)
    connection?.close()
    connection = null
  })
})

// Run websocket server
server.listen(SOCKET_PORT, () => {
  console.debug(`WebSocket on ws://localhost:${SOCKET_PORT}`)
})

//
// HTTP server
//

app.listen(HTTP_PORT, () => {
  console.debug(`HTTP server on http://localhost:${HTTP_PORT}`)
})

app.get('/v1/info', (req, res) => {
  res.json(getServerInfo())
})

app.get('/v1/databases', async (request, response) => {
  try {
    response.json(await getDatabases(await getRequestConnection(request)))
  } catch (error) {
    errorResponse(response, 500, 'Error', error)
  }
})

app.get('/v1/stats', async (request, response) => {
  try {
    response.json(await getStats(await getRequestConnection(request)))
  } catch (error) {
    errorResponse(response, 500, 'Error', error)
  }
})

app.post('/v1/sql', async (req: express.Request, res: express.Response) => {
  try {
    log('POST /v1/sql')
    const response = await handleHttpSqlRequest(req, res)
    res.json(response)
  } catch (error) {
    log('POST /v1/sql - error', error)
    res.status(400).json({ error: { status: '400', title: 'Bad Request', detail: error as string } })
  }
})

//
// utilities
//

/** Extract and return bearer token from request authorization headers */
function getRequestToken(request: express.Request): string | null {
  const authorization = request.headers['authorization'] as string
  // console.debug(`getBearerToken - ${authorization}`, request.headers)
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.substring(7)
  }
  return null
}

/** Returns database connection associated with express request credentials */
async function getRequestConnection(request: express.Request): Promise<SQLiteCloudBunConnection> {
  // bearer token is required to connect to sqlitecloud
  const connectionString = getRequestToken(request)
  if (!connectionString) {
    throw new GatewayError('Unauthorized', { status: 401 })
  }
  return await connectAsync(connectionString)
}

/** Handle a stateless sql query request */
async function handleHttpSqlRequest(request: express.Request, response: express.Response) {
  // ?sql= or json payload with sql property is required
  let apiRequest: SqlApiRequest
  try {
    apiRequest = request.body
  } catch (_error) {
    apiRequest = {
      database: request.query.database as string,
      sql: request.query.sql as string,
      row: request.query.row as 'array' | 'dictionary'
    }
  }
  if (!(apiRequest.database || apiRequest.sql)) {
    return errorResponse(response, 400, 'Bad Request', 'Missing ?sql= query or json payload')
  }

  let connection = null
  try {
    // request is stateless so we will connect and disconnect for each request
    log(`http | sql -> ${JSON.stringify(apiRequest)}`)
    connection = await getRequestConnection(request)
    const apiResponse = await queryAsync(connection, apiRequest)
    log(`http | sql <- ${JSON.stringify(apiResponse)}`)
    response.json(apiResponse)
  } catch (error) {
    errorResponse(response, 400, 'Bad Request', (error as Error).toString())
  } finally {
    if (connection) {
      connection.close()
    }
  }
}

/** Runs query on given connection and returns response payload */
async function queryAsync(connection: SQLiteCloudBunConnection, apiRequest: SqlApiRequest): Promise<ApiResponse> {
  let result: unknown = 'OK'
  try {
    if (apiRequest.database) {
      result = await sendCommandsAsync(connection, `USE DATABASE ${apiRequest.database}`)
    }

    if (apiRequest.sql) {
      result = await sendCommandsAsync(connection, apiRequest.sql)
      // query returned a rowset?
      if (result instanceof SQLiteCloudRowset) {
        const rowset = result
        const data = apiRequest.row === 'dictionary' ? rowset : rowset.map(rowsetRow => rowsetRow.getData()) // rows as arrays by default
        return { data, metadata: rowset.metadata }
      } else {
        return generateMetadata(apiRequest.sql, result)
      }
    }
  } catch (error) {
    log('queryAsync | error', error)
    const sqliteError = error as SQLiteCloudError
    return {
      error: {
        status: '400',
        title: 'Bad Request',
        detail: sqliteError?.message || sqliteError?.toString(),
        // SQLiteCloudError additional properties
        errorCode: sqliteError?.errorCode,
        offsetCode: sqliteError?.offsetCode,
        externalErrorCode: sqliteError?.externalErrorCode
      }
    }
  }

  return { data: result }
}

function generateMetadata(sql: string, result: any): ApiResponse {
  // detect that this array was sent in response to an insert, update or delete statement and will add special
  // metadata so it's easier for clients to extract useful information like the number of rows
  // affected by the statement. in the future, the server may produce a typed rowset instead
  if (Array.isArray(result) && result.length === 6) {
    const lowerSql = sql.toLocaleLowerCase()
    if (lowerSql.includes('insert ') || lowerSql.includes('update ') || lowerSql.includes('delete ')) {
      return {
        data: [result],
        metadata: {
          version: 1,
          numberOfRows: 1,
          numberOfColumns: 6,
          // https://github.com/sqlitecloud/sdk/blob/master/PROTOCOL.md#sqlite-statements
          columns: [
            { name: 'TYPE', type: 'INTEGER' },
            { name: 'INDEX', type: 'INTEGER' },
            { name: 'ROWID', type: 'INTEGER' },
            { name: 'CHANGES', type: 'INTEGER' },
            { name: 'TOTAL_CHANGES', type: 'INTEGER' },
            { name: 'FINALIZED', type: 'INTEGER' }
          ]
        }
      }
    }
  }

  // response is an array value but a special array like above
  if (Array.isArray(result)) {
    return {
      data: result.map(v => [v]),
      metadata: {
        version: 1,
        numberOfRows: result.length,
        numberOfColumns: 1,
        columns: [{ name: 'Result' }]
      }
    }
  }

  return { data: result }
}
