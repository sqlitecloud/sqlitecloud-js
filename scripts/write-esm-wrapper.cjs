const fs = require('fs')
const path = require('path')

const esmDir = path.join(__dirname, '..', 'lib', 'esm')

fs.mkdirSync(esmDir, { recursive: true })

fs.writeFileSync(path.join(esmDir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`)

fs.writeFileSync(
  path.join(esmDir, 'index.js'),
  `import sqlitecloud from '../index.js'

export const Database = sqlitecloud.Database
export const SQLiteCloudConnection = sqlitecloud.SQLiteCloudConnection
export const SQLiteCloudError = sqlitecloud.SQLiteCloudError
export const SQLiteCloudRowset = sqlitecloud.SQLiteCloudRowset
export const SQLiteCloudRow = sqlitecloud.SQLiteCloudRow
export const parseconnectionstring = sqlitecloud.parseconnectionstring
export const validateConfiguration = sqlitecloud.validateConfiguration
export const getInitializationCommands = sqlitecloud.getInitializationCommands
export const sanitizeSQLiteIdentifier = sqlitecloud.sanitizeSQLiteIdentifier
export const parseSafeIntegerMode = sqlitecloud.parseSafeIntegerMode
export const encodeBigIntMarkers = sqlitecloud.encodeBigIntMarkers
export const decodeBigIntMarkers = sqlitecloud.decodeBigIntMarkers
export const protocol = sqlitecloud.protocol

export default sqlitecloud
`
)

fs.writeFileSync(
  path.join(esmDir, 'index.d.ts'),
  `export * from '../index'
import * as sqlitecloud from '../index'
export default sqlitecloud
`
)
