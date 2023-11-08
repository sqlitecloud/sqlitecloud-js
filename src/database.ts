//
// database.ts - database driver api
//

// Trying as much as possible to be a drop-in replacement for SQLite3 API
// https://github.com/TryGhost/node-sqlite3/wiki/API
// https://github.com/TryGhost/node-sqlite3
// https://github.com/TryGhost/node-sqlite3/blob/master/lib/sqlite3.d.ts

import { SQLiteCloudConnection } from './protocol'
import { SQLiteCloudConfig } from './types/sqlitecloudconfig'

export class RunResult {
  //
}

export class Statement {
  //
}

export class Database {
  /** Create and initialize a database from a full configuration object, or connection string */
  constructor(config: SQLiteCloudConfig | string, mode?: string | null, callback?: (this: Database) => void) {
    this._config = typeof config === 'string' ? { connectionString: config } : config

    // opens first connection to the database automatically
    const connection = new SQLiteCloudConnection(this._config)
    this._connections = [connection]
    void connection.connect().then(() => {
      callback?.call(this)
    })
  }

  /** Configuration used to open database connections */
  private _config: SQLiteCloudConfig

  /** Database connections */
  private _connections: SQLiteCloudConnection[]

  //
  // private methods
  //

  /** Returns first available connection from connection pool */
  private getConnection(): SQLiteCloudConnection {
    // TODO sqlitecloud-js / implement database connection pool #10
    return this._connections?.[0]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private prepareSql(sql: string, ...params: any[]): string {
    // TODO sqlitecloud-js / implement prepared statements #11
    return sql
  }

  //
  // public methods
  //

  public get(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<(error: Error | null, rows?: any[]) => void>(params)
    this.all(sql, ...args, (error: Error | null, rows: any[]) => {
      if (rows) {
        callback?.call(this, null, rows[0])
      } else {
        callback?.call(this, error)
      }
    })
    return this
  }

  public all(sql: string, ...params: any[]): this {
    const { args, callback } = popCallback<(error: Error | null, rows?: any[]) => void>(params)

    void this.getConnection()
      .sendCommands(this.prepareSql(sql, ...args))
      .then(rowset => {
        const rows = rowset.toArray()
        callback?.call(this, null, rows)
      })
      .catch(error => {
        callback?.call(this, error)
        console.error(error)
      })

    return this
  }

  /** Close database connections then callback */
  public close(callback?: (err: Error | null) => void): void {
    const closingPromises = this._connections.map(connection =>
      connection.close().then(() => {
        this._connections = this._connections.filter(c => c !== connection)
      })
    )
    Promise.all(closingPromises)
      .then(() => {
        // all connections closed
        callback?.call(this, null)
      })
      .catch(error => {
        // emit error event
        callback?.call(this, error)
      })
  }
}

//
// utility methods
//

/**
 * Many of the methods in our API may contain a callback as their last argument.
 * This method will take the arguments array passed to the method and return an object
 * containing the arguments array with the callback removed (if any), and the callback itself.
 */
function popCallback<T extends (err: Error | null) => void = (err: Error | null) => void>(args: any[]): { args: any[]; callback?: T | undefined } {
  if (args && args.length > 0 && typeof args[args.length - 1] === 'function') {
    return { args: args.slice(0, -1), callback: args[args.length - 1] as T }
  }
  return { args }
}
