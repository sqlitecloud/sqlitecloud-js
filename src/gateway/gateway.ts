//
// gateway.ts - SQLite Cloud Gateway enabling websocket connections and SQL to json queries
//

import packageJson from '../../package.json'

// bun specific driver + shared classes
import { SQLiteCloudBunConnection } from './connection-bun'
import { SQLiteCloudRowset, SQLiteCloudError, validateConfiguration } from '../index'
import { type ApiRequest, type ApiResponse, type SqlApiRequest, DEFAULT_PORT_HTTP, DEFAULT_PORT_SOCKET } from './shared'

// external modules
import { heapStats } from 'bun:jsc'
import { Server } from 'socket.io'
import express from 'express'
import http from 'http'

// Express app for HTTP server
const app = express()
app.use(express.json())

// HTTP server for socket.io
const server = http.createServer(app)

// Replacing Deno's serveDir with Express static middleware
app.use(express.static('public'))

// Replacing Deno's Server with socket.io's Server
const io = new Server(server, {
  cors: {
    origin: '*', // specify the client origin
    methods: ['GET', 'POST'], // allowed HTTP methods
    credentials: true // allow credentials (cookies, session)
  }
})

// port where socket.io will listen for connections
const SOCKET_PORT = parseInt(process.env['SOCKET_PORT'] || DEFAULT_PORT_SOCKET.toString())
// port where http server will listen for connections
const HTTP_PORT = parseInt(process.env['HTTP_PORT'] || DEFAULT_PORT_HTTP.toString())
// should we log verbose messages?
const VERBOSE = process.env['VERBOSE']?.toLowerCase() === 'true'

// Establish handlers for a socket.io connection
io.on('connection', socket => {
  //
  // state
  //

  // the connection string is passed in the bearer token
  // https://socket.io/docs/v4/client-options/#auth
  const connectionString = socket.handshake.auth.token as string
  let connection: SQLiteCloudBunConnection | null = null
  log(`socket | connect socket.id: ${socket.id}`)

  //
  // handlers
  //

  // received a sql query request from the client socket
  socket.on('v1/info', (_request: ApiRequest, callback: (response: ApiResponse) => void) => {
    const serverInfo = getServerInfo()
    log(`socket | info <- ${JSON.stringify(serverInfo)}`)
    return callback(serverInfo)
  })

  // received a sql query request from the client socket
  socket.on('v1/sql', async (request: SqlApiRequest, callback: (response: ApiResponse) => void) => {
    if (!connectionString) {
      callback({ error: { status: '401', title: 'Unauthorized', detail: 'Provide connection string in bearer token' } })
      return
    }

    try {
      if (!connection) {
        const startTime = Date.now()
        log('socket | connecting...')
        connection = await connectAsync(connectionString)
        log(`socket | connected in ${Date.now() - startTime}ms`)
      }

      log(`socket | sql -> ${JSON.stringify(request)}`)
      const response = await queryAsync(connection, request)
      log(`socket | sql <- ${JSON.stringify(response)}`)
      return callback(response)
    } catch (error) {
      callback({ error: { status: '400', title: 'Bad Request', detail: error as string } })
    }
  })

  // received a disconnect request from the client socket
  socket.on('disconnect', () => {
    log(`socket | disconnect socket.id: ${socket.id}`)
    connection?.close()
    connection = null
  })
})

// Run websocket server
server.listen(SOCKET_PORT, () => {
  console.debug(`WebSocket server is running on port ${SOCKET_PORT}`)
})

//
// HTTP server
//

app.listen(HTTP_PORT, () => {
  console.debug(`HTTP server is running on port ${HTTP_PORT}`)
})

app.get('/v1/info', (req, res) => {
  res.json(getServerInfo())
})

app.post('/v1/sql', async (req: express.Request, res: express.Response) => {
  try {
    log(`POST /v1/sql`)
    const response = await handleHttpSqlRequest(req, res)
    res.json(response)
  } catch (error) {
    log(`POST /v1/sql - error: ${error}`)
    res.status(400).json({ error: { status: '400', title: 'Bad Request', detail: error as string } })
  }
})

//
// utilities
//

/** Handle a stateless sql query request */
async function handleHttpSqlRequest(request: express.Request, response: express.Response) {
  // bearer token is required to connect to sqlitecloud
  const connectionString = getBearerToken(request)
  if (!connectionString) {
    return errorResponse(response, 401, 'Unauthorized')
  }

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

  let connection
  try {
    // request is stateless so we will connect and disconnect for each request
    log(`http | sql -> ${JSON.stringify(apiRequest)}`)
    connection = await connectAsync(connectionString)
    const apiResponse = await queryAsync(connection, apiRequest)
    log(`http | sql <- ${JSON.stringify(apiResponse)}`)
    response.json(apiResponse)
  } catch (error) {
    errorResponse(response, 400, 'Bad Request', (error as Error).toString())
  } finally {
    connection?.close()
  }
}

/** Server info for /v1/info endpoints */
function getServerInfo() {
  const { objectTypeCounts, ...memory } = heapStats()

  return {
    data: {
      name: packageJson.name,
      version: packageJson.version,
      date: new Date().toISOString(),
      memory
    }
  }
}

/** Extract and return bearer token from request authorization headers */
function getBearerToken(request: express.Request): string | null {
  const authorization = request.headers['authorization'] as string
  // console.debug(`getBearerToken - ${authorization}`, request.headers)
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.substring(7)
  }
  return null
}

/** Returns a json api compatibile error response */
function errorResponse(response: express.Response, status: number, statusText: string, detail?: string) {
  response.status(status).json({ error: { status: status.toString(), title: statusText, detail } })
}

/** Connects to given database asynchronously */
async function connectAsync(connectionString: string): Promise<SQLiteCloudBunConnection> {
  return await new Promise((resolve, reject) => {
    const config = validateConfiguration({ connectionString })
    const connection = new SQLiteCloudBunConnection(config, (error: Error | null) => {
      if (error) {
        log(`connectAsync | error: ${error}`)
        reject(error)
      } else {
        resolve(connection)
      }
    })
  })
}

/** Sends given sql commands asynchronously */
async function sendCommandsAsync(connection: SQLiteCloudBunConnection, sql: string): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    connection.sendCommands(sql, (error: Error | null, results) => {
      // Explicitly type the 'error' parameter as 'Error'
      if (error) {
        log(`sendCommandsAsync | error: ${error}`)
        reject(error)
      } else {
        // console.debug(JSON.stringify(results).substring(0, 140) + '...')
        resolve(results)
      }
    })
  })
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
        const rowset = result as SQLiteCloudRowset
        const data = apiRequest.row === 'dictionary' ? rowset : rowset.map(rowsetRow => rowsetRow.getData()) // rows as arrays by default
        return { data, metadata: rowset.metadata }
      }
    }
  } catch (error) {
    log(`queryAsync | error: ${error}`)
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

/** Log only in verbose mode */
function log(...args: unknown[]) {
  if (VERBOSE) {
    console.debug(...args)
  }
}
