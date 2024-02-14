//
// index.ts - export drivers classes, utilities, types
//

// include ONLY packages used by drivers
// do NOT include anything related to gateway or bun or express
// connection-tls does not want/need to load on browser and is loaded dynamically by Database
// connection-ws does not want/need to load on node and is loaded dynamically by Database

export { Database } from './drivers/database'
export { Statement } from './drivers/statement'
export { SQLiteCloudConnection } from './drivers/connection'
export { type SQLiteCloudConfig, type SQLCloudRowsetMetadata, SQLiteCloudError, type ErrorCallback } from './drivers/types'
export { SQLiteCloudRowset, SQLiteCloudRow } from './drivers/rowset'
export { escapeSqlParameter, prepareSql, parseConnectionString, validateConfiguration } from './drivers/utilities'
