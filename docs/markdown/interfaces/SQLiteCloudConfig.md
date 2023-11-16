[sqlitecloud-js](../README.md) / [Exports](../modules.md) / SQLiteCloudConfig

# Interface: SQLiteCloudConfig

Configuration for SQLite cloud connection

## Table of contents

### Properties

- [clientId](SQLiteCloudConfig.md#clientid)
- [compression](SQLiteCloudConfig.md#compression)
- [connectionString](SQLiteCloudConfig.md#connectionstring)
- [createDatabase](SQLiteCloudConfig.md#createdatabase)
- [database](SQLiteCloudConfig.md#database)
- [dbMemory](SQLiteCloudConfig.md#dbmemory)
- [host](SQLiteCloudConfig.md#host)
- [maxData](SQLiteCloudConfig.md#maxdata)
- [maxRows](SQLiteCloudConfig.md#maxrows)
- [maxRowset](SQLiteCloudConfig.md#maxrowset)
- [noBlob](SQLiteCloudConfig.md#noblob)
- [nonlinearizable](SQLiteCloudConfig.md#nonlinearizable)
- [password](SQLiteCloudConfig.md#password)
- [passwordHashed](SQLiteCloudConfig.md#passwordhashed)
- [port](SQLiteCloudConfig.md#port)
- [sqliteMode](SQLiteCloudConfig.md#sqlitemode)
- [timeout](SQLiteCloudConfig.md#timeout)
- [tlsOptions](SQLiteCloudConfig.md#tlsoptions)
- [username](SQLiteCloudConfig.md#username)
- [verbose](SQLiteCloudConfig.md#verbose)

## Properties

### clientId

• `Optional` **clientId**: `string`

Optional identifier used for verbose logging

#### Defined in

[src/types.ts:51](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L51)

___

### compression

• `Optional` **compression**: `boolean`

#### Defined in

[src/types.ts:35](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L35)

___

### connectionString

• `Optional` **connectionString**: `string`

Connection string in the form of sqlitecloud://user:password@host:port/database?options

#### Defined in

[src/types.ts:10](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L10)

___

### createDatabase

• `Optional` **createDatabase**: `boolean`

Create the database if it doesn't exist?

#### Defined in

[src/types.ts:29](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L29)

___

### database

• `Optional` **database**: `string`

Name of database to open

#### Defined in

[src/types.ts:26](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L26)

___

### dbMemory

• `Optional` **dbMemory**: `boolean`

Database will be created in memory

#### Defined in

[src/types.ts:31](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L31)

___

### host

• `Optional` **host**: `string`

Host name is required unless connectionString is provided

#### Defined in

[src/types.ts:20](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L20)

___

### maxData

• `Optional` **maxData**: `number`

Do not send columns with more than max_data bytes

#### Defined in

[src/types.ts:41](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L41)

___

### maxRows

• `Optional` **maxRows**: `number`

Server should chunk responses with more than maxRows

#### Defined in

[src/types.ts:43](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L43)

___

### maxRowset

• `Optional` **maxRowset**: `number`

Server should limit total number of rows in a set to maxRowset

#### Defined in

[src/types.ts:45](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L45)

___

### noBlob

• `Optional` **noBlob**: `boolean`

Server should send BLOB columns

#### Defined in

[src/types.ts:39](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L39)

___

### nonlinearizable

• `Optional` **nonlinearizable**: `boolean`

Request for immediate responses from the server node without waiting for linerizability guarantees

#### Defined in

[src/types.ts:37](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L37)

___

### password

• `Optional` **password**: `string`

Password is required unless connection string is provided

#### Defined in

[src/types.ts:15](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L15)

___

### passwordHashed

• `Optional` **passwordHashed**: `boolean`

True if password is hashed, default is false

#### Defined in

[src/types.ts:17](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L17)

___

### port

• `Optional` **port**: `number`

Port number for tls socket

#### Defined in

[src/types.ts:22](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L22)

___

### sqliteMode

• `Optional` **sqliteMode**: `boolean`

Enable SQLite compatibility mode

#### Defined in

[src/types.ts:33](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L33)

___

### timeout

• `Optional` **timeout**: `number`

Optional query timeout passed directly to TLS socket

#### Defined in

[src/types.ts:24](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L24)

___

### tlsOptions

• `Optional` **tlsOptions**: `ConnectionOptions`

Custom options and configurations for tls socket, eg: additional certificates

#### Defined in

[src/types.ts:48](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L48)

___

### username

• `Optional` **username**: `string`

User name is required unless connectionString is provided

#### Defined in

[src/types.ts:13](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L13)

___

### verbose

• `Optional` **verbose**: `boolean`

True if connection should enable debug logs

#### Defined in

[src/types.ts:53](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/types.ts#L53)
