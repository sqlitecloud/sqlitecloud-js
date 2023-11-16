[sqlitecloud-js](../README.md) / [Exports](../modules.md) / SQLiteCloudError

# Class: SQLiteCloudError

Custom error reported by SQLiteCloud drivers

## Hierarchy

- `Error`

  ↳ **`SQLiteCloudError`**

## Table of contents

### Constructors

- [constructor](SQLiteCloudError.md#constructor)

### Properties

- [cause](SQLiteCloudError.md#cause)
- [errorCode](SQLiteCloudError.md#errorcode)
- [externalErrorCode](SQLiteCloudError.md#externalerrorcode)
- [message](SQLiteCloudError.md#message)
- [name](SQLiteCloudError.md#name)
- [offsetCode](SQLiteCloudError.md#offsetcode)
- [stack](SQLiteCloudError.md#stack)
- [prepareStackTrace](SQLiteCloudError.md#preparestacktrace)
- [stackTraceLimit](SQLiteCloudError.md#stacktracelimit)

### Methods

- [captureStackTrace](SQLiteCloudError.md#capturestacktrace)

## Constructors

### constructor

• **new SQLiteCloudError**(`message`, `args?`): [`SQLiteCloudError`](SQLiteCloudError.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |
| `args?` | `Partial`\<[`SQLiteCloudError`](SQLiteCloudError.md)\> |

#### Returns

[`SQLiteCloudError`](SQLiteCloudError.md)

#### Overrides

Error.constructor

#### Defined in

[src/types.ts:85](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L85)

## Properties

### cause

• `Optional` **cause**: `string` \| `Error`

Upstream error that cause this error

#### Defined in

[src/types.ts:94](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L94)

___

### errorCode

• `Optional` **errorCode**: `string`

Error code returned by drivers or server

#### Defined in

[src/types.ts:96](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L96)

___

### externalErrorCode

• `Optional` **externalErrorCode**: `string`

Additional error code

#### Defined in

[src/types.ts:98](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L98)

___

### message

• **message**: `string`

#### Inherited from

Error.message

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1054

___

### name

• **name**: `string`

#### Inherited from

Error.name

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1053

___

### offsetCode

• `Optional` **offsetCode**: `number`

Additional offset code in commands

#### Defined in

[src/types.ts:100](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L100)

___

### stack

• `Optional` **stack**: `string`

#### Inherited from

Error.stack

#### Defined in

node_modules/typescript/lib/lib.es5.d.ts:1055

node_modules/@types/node/globals.d.ts:127

___

### prepareStackTrace

▪ `Static` `Optional` **prepareStackTrace**: (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any`

#### Type declaration

▸ (`err`, `stackTraces`): `any`

Optional override for formatting stack traces

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

##### Returns

`any`

**`See`**

https://github.com/v8/v8/wiki/Stack%20Trace%20API#customizing-stack-traces

#### Inherited from

Error.prepareStackTrace

#### Defined in

node_modules/@types/node/globals.d.ts:140

___

### stackTraceLimit

▪ `Static` **stackTraceLimit**: `number`

#### Inherited from

Error.stackTraceLimit

#### Defined in

node_modules/@types/node/globals.d.ts:142

## Methods

### captureStackTrace

▸ **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Name | Type |
| :------ | :------ |
| `targetObject` | `Object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

Error.captureStackTrace

#### Defined in

node_modules/@types/node/globals.d.ts:133
