[sqlitecloud-js](../README.md) / [Exports](../modules.md) / SQLiteCloudConnection

# Class: SQLiteCloudConnection

SQLiteCloud low-level connection, will do messaging, handle socket, authentication, etc.

## Table of contents

### Constructors

- [constructor](SQLiteCloudConnection.md#constructor)

### Properties

- [config](SQLiteCloudConnection.md#config)
- [operations](SQLiteCloudConnection.md#operations)
- [socket](SQLiteCloudConnection.md#socket)

### Accessors

- [connected](SQLiteCloudConnection.md#connected)
- [initializationCommands](SQLiteCloudConnection.md#initializationcommands)

### Methods

- [close](SQLiteCloudConnection.md#close)
- [connect](SQLiteCloudConnection.md#connect)
- [log](SQLiteCloudConnection.md#log)
- [sendCommands](SQLiteCloudConnection.md#sendcommands)
- [validateConfiguration](SQLiteCloudConnection.md#validateconfiguration)
- [verbose](SQLiteCloudConnection.md#verbose)

## Constructors

### constructor

• **new SQLiteCloudConnection**(`config`, `callback?`): [`SQLiteCloudConnection`](SQLiteCloudConnection.md)

Parse and validate provided connectionString or configuration

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `string` \| [`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md) |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) |

#### Returns

[`SQLiteCloudConnection`](SQLiteCloudConnection.md)

#### Defined in

[src/connection.ts:43](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L43)

## Properties

### config

• `Private` **config**: [`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md)

Configuration passed by client or extracted from connection string

#### Defined in

[src/connection.ts:54](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L54)

___

### operations

• `Private` **operations**: `OperationsQueue`

Operations are serialized by waiting an any pending promises

#### Defined in

[src/connection.ts:60](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L60)

___

### socket

• `Private` `Optional` **socket**: `TLSSocket`

Currently opened tls socket used to communicated with SQLiteCloud server

#### Defined in

[src/connection.ts:57](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L57)

## Accessors

### connected

• `get` **connected**(): `boolean`

True if connection is open

#### Returns

`boolean`

#### Defined in

[src/connection.ts:67](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L67)

___

### initializationCommands

• `get` **initializationCommands**(): `string`

Initialization commands sent to database when connection is established

#### Returns

`string`

#### Defined in

[src/connection.ts:112](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L112)

## Methods

### close

▸ **close**(): [`SQLiteCloudConnection`](SQLiteCloudConnection.md)

Disconnect from server, release connection.

#### Returns

[`SQLiteCloudConnection`](SQLiteCloudConnection.md)

#### Defined in

[src/connection.ts:317](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L317)

___

### connect

▸ **connect**(`callback?`): [`SQLiteCloudConnection`](SQLiteCloudConnection.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) |

#### Returns

[`SQLiteCloudConnection`](SQLiteCloudConnection.md)

#### Defined in

[src/connection.ts:158](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L158)

___

### log

▸ **log**(`message`, `...optionalParams`): `void`

Will log to console if verbose mode is enabled

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[src/connection.ts:104](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L104)

___

### sendCommands

▸ **sendCommands**(`commands`, `callback?`): [`SQLiteCloudConnection`](SQLiteCloudConnection.md)

Will send a command and return the resulting rowset or result or throw an error

#### Parameters

| Name | Type |
| :------ | :------ |
| `commands` | `string` |
| `callback?` | `ResultsCallback`\<`any`\> |

#### Returns

[`SQLiteCloudConnection`](SQLiteCloudConnection.md)

#### Defined in

[src/connection.ts:209](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L209)

___

### validateConfiguration

▸ **validateConfiguration**(`config`): [`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md)

Validate configuration, apply defaults, throw if something is missing or misconfigured

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md) |

#### Returns

[`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md)

#### Defined in

[src/connection.ts:76](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L76)

___

### verbose

▸ **verbose**(): `void`

Enable verbose logging for debug purposes

#### Returns

`void`

#### Defined in

[src/connection.ts:153](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/connection.ts#L153)
