[sqlitecloud-js](../README.md) / [Exports](../modules.md) / Database

# Class: Database

Creating a Database object automatically opens a connection to the SQLite database.
When the connection is established the Database object emits an open event and calls
the optional provided callback. If the connection cannot be established an error event
will be emitted and the optional callback is called with the error information.

## Table of contents

### Constructors

- [constructor](Database.md#constructor)

### Properties

- [config](Database.md#config)
- [connections](Database.md#connections)

### Methods

- [all](Database.md#all)
- [close](Database.md#close)
- [configure](Database.md#configure)
- [each](Database.md#each)
- [emitEvent](Database.md#emitevent)
- [exec](Database.md#exec)
- [get](Database.md#get)
- [getConnection](Database.md#getconnection)
- [handleError](Database.md#handleerror)
- [interrupt](Database.md#interrupt)
- [loadExtension](Database.md#loadextension)
- [prepare](Database.md#prepare)
- [processContext](Database.md#processcontext)
- [run](Database.md#run)
- [sql](Database.md#sql)
- [verbose](Database.md#verbose)

## Constructors

### constructor

• **new Database**(`config`, `callback?`): [`Database`](Database.md)

Create and initialize a database from a full configuration object, or connection string

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `string` \| [`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md) |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:28](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L28)

## Properties

### config

• `Private` **config**: [`SQLiteCloudConfig`](../interfaces/SQLiteCloudConfig.md)

Configuration used to open database connections

#### Defined in

[src/database.ts:46](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L46)

___

### connections

• `Private` **connections**: [`SQLiteCloudConnection`](SQLiteCloudConnection.md)[]

Database connections

#### Defined in

[src/database.ts:49](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L49)

## Methods

### all

▸ **all**\<`T`\>(`sql`, `callback?`): [`Database`](Database.md)

Runs the SQL query with the specified parameters and calls the callback
with all result rows afterwards. The function returns the Database object to
allow for function chaining. The parameters are the same as the Database#run
function, with the following differences: The signature of the callback is
function(err, rows) {}. rows is an array. If the result set is empty, it will
be an empty array, otherwise it will have an object for each result row which
in turn contains the values of that row, like the Database#get function.
Note that it first retrieves all result rows and stores them in memory.
For queries that have potentially large result sets, use the Database#each
function to retrieve all rows or Database#prepare followed by multiple Statement#get
calls to retrieve a previously unknown amount of rows.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `callback?` | `RowsCallback`\<`T`\> |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:223](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L223)

▸ **all**\<`T`\>(`sql`, `params`, `callback?`): [`Database`](Database.md)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `params` | `any` |
| `callback?` | `RowsCallback`\<`T`\> |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:224](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L224)

___

### close

▸ **close**(`callback?`): `void`

If the optional callback is provided, this function will be called when the
database was closed successfully or when an error occurred. The first argument
is an error object. When it is null, closing succeeded. If no callback is provided
and an error occurred, an error event with the error object as the only parameter
will be emitted on the database object. If closing succeeded, a close event with no
parameters is emitted, regardless of whether a callback was provided or not.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) |

#### Returns

`void`

#### Defined in

[src/database.ts:344](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L344)

___

### configure

▸ **configure**(`_option`, `_value`): [`Database`](Database.md)

Set a configuration option for the database

#### Parameters

| Name | Type |
| :------ | :------ |
| `_option` | `string` |
| `_value` | `any` |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:140](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L140)

___

### each

▸ **each**\<`T`\>(`sql`, `callback?`, `complete?`): [`Database`](Database.md)

Runs the SQL query with the specified parameters and calls the callback once for each result row.
The function returns the Database object to allow for function chaining. The parameters are the
same as the Database#run function, with the following differences: The signature of the callback
is function(err, row) {}. If the result set succeeds but is empty, the callback is never called.
In all other cases, the callback is called once for every retrieved row. The order of calls correspond
exactly to the order of rows in the result set. After all row callbacks were called, the completion
callback will be called if present. The first argument is an error object, and the second argument
is the number of retrieved rows. If you specify only one function, it will be treated as row callback,
if you specify two, the first (== second to last) function will be the row callback, the last function
will be the completion callback. If you know that a query only returns a very limited number of rows,
it might be more convenient to use Database#all to retrieve all rows at once. There is currently no
way to abort execution.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `callback?` | `RowCallback`\<`T`\> |
| `complete?` | `RowCountCallback` |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:262](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L262)

▸ **each**\<`T`\>(`sql`, `params`, `callback?`, `complete?`): [`Database`](Database.md)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `params` | `any` |
| `callback?` | `RowCallback`\<`T`\> |
| `complete?` | `RowCountCallback` |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:263](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L263)

___

### emitEvent

▸ **emitEvent**(`event`, `...args`): `void`

Emits given event with optional arguments

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[src/database.ts:91](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L91)

___

### exec

▸ **exec**(`sql`, `callback?`): [`Database`](Database.md)

Runs all SQL queries in the supplied string. No result rows are retrieved.
The function returns the Database object to allow for function chaining.
If a query fails, no subsequent statements will be executed (wrap it in a
transaction if you want all or none to be executed). When all statements
have been executed successfully, or when an error occurs, the callback
function is called, with the first parameter being either null or an error
object. When no callback is provided and an error occurs, an error event
will be emitted on the database object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:318](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L318)

___

### get

▸ **get**\<`T`\>(`sql`, `callback?`): [`Database`](Database.md)

Runs the SQL query with the specified parameters and calls the callback with
a subsequent result row. The function returns the Database object to allow for
function chaining. The parameters are the same as the Database#run function,
with the following differences: The signature of the callback is `function(err, row) {}`.
If the result set is empty, the second parameter is undefined, otherwise it is an
object containing the values for the first row. The property names correspond to
the column names of the result set. It is impossible to access them by column index;
the only supported way is by column name.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `callback?` | `RowCallback`\<`T`\> |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:185](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L185)

▸ **get**\<`T`\>(`sql`, `params`, `callback?`): [`Database`](Database.md)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `params` | `any` |
| `callback?` | `RowCallback`\<`T`\> |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:186](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L186)

___

### getConnection

▸ **getConnection**(`callback`): `void`

Returns first available connection from connection pool

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | `ResultsCallback`\<[`SQLiteCloudConnection`](SQLiteCloudConnection.md)\> |

#### Returns

`void`

#### Defined in

[src/database.ts:56](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L56)

___

### handleError

▸ **handleError**(`connection`, `error`, `callback?`): `void`

Handles an error by closing the connection, calling the callback and/or emitting an error event

#### Parameters

| Name | Type |
| :------ | :------ |
| `connection` | ``null`` \| [`SQLiteCloudConnection`](SQLiteCloudConnection.md) |
| `error` | `Error` |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) |

#### Returns

`void`

#### Defined in

[src/database.ts:75](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L75)

___

### interrupt

▸ **interrupt**(): `void`

Allows the user to interrupt long-running queries. Wrapper around
sqlite3_interrupt and causes other data-fetching functions to be
passed an err with code = sqlite3.INTERRUPT. The database must be
open to use this function.

#### Returns

`void`

#### Defined in

[src/database.ts:378](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L378)

___

### loadExtension

▸ **loadExtension**(`_path`, `callback?`): [`Database`](Database.md)

Loads a compiled SQLite extension into the database connection object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_path` | `string` | - |
| `callback?` | [`ErrorCallback`](../modules.md#errorcallback) | If provided, this function will be called when the extension was loaded successfully or when an error occurred. The first argument is an error object. When it is null, loading succeeded. If no callback is provided and an error occurred, an error event with the error object as the only parameter will be emitted on the database object. |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:362](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L362)

___

### prepare

▸ **prepare**\<`T`\>(`sql`, `...params`): [`Statement`](Statement.md)\<`T`\>

Prepares the SQL statement and optionally binds the specified parameters and
calls the callback when done. The function returns a Statement object.
When preparing was successful, the first and only argument to the callback
is null, otherwise it is the error object. When bind parameters are supplied,
they are bound to the prepared statement before calling the callback.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `...params` | `any`[] |

#### Returns

[`Statement`](Statement.md)\<`T`\>

#### Defined in

[src/database.ts:303](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L303)

___

### processContext

▸ **processContext**(`results?`): `undefined` \| `Record`\<`string`, `any`\>

Some queries like inserts or updates processed via run or exec may generate
an empty result (eg. no data was selected), but still have some metadata.
For example the server may pass the id of the last row that was modified.
In this case the callback results should be empty but the context may contain
additional information like lastID, etc.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `results?` | `any` | Results received from the server |

#### Returns

`undefined` \| `Record`\<`string`, `any`\>

A context object if one makes sense, otherwise undefined

**`See`**

https://github.com/TryGhost/node-sqlite3/wiki/API#runsql--param---callback

#### Defined in

[src/database.ts:108](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L108)

___

### run

▸ **run**\<`T`\>(`sql`, `callback?`): [`Database`](Database.md)

Runs the SQL query with the specified parameters and calls the callback afterwards.
The callback will contain the results passed back from the server, for example in the
case of an update or insert, these would contain the number of rows modified, etc.
It does not retrieve any result data. The function returns the Database object for
which it was called to allow for function chaining.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `callback?` | `ResultsCallback`\<`T`\> |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:152](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L152)

▸ **run**\<`T`\>(`sql`, `params`, `callback?`): [`Database`](Database.md)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `params` | `any` |
| `callback?` | `ResultsCallback`\<`T`\> |

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:153](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L153)

___

### sql

▸ **sql**(`sql`, `...values`): `Promise`\<`any`\>

Sql is a promise based API for executing SQL statements. You can
pass a simple string with a SQL statement or a template string
using backticks and parameters in ${parameter} format. These parameters
will be properly escaped and quoted like when using a prepared statement.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sql` | `string` \| `TemplateStringsArray` | A sql string or a template string in `backticks` format |
| `...values` | `any`[] | - |

#### Returns

`Promise`\<`any`\>

An array of rows in case of selections or an object with
metadata in case of insert, update, delete.

#### Defined in

[src/database.ts:396](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L396)

___

### verbose

▸ **verbose**(): [`Database`](Database.md)

Enable verbose mode

#### Returns

[`Database`](Database.md)

#### Defined in

[src/database.ts:131](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/database.ts#L131)
