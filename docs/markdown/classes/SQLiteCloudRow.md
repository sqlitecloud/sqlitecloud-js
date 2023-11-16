[sqlitecloud-js](../README.md) / [Exports](../modules.md) / SQLiteCloudRow

# Class: SQLiteCloudRow

A single row in a dataset with values accessible by column name

## Indexable

▪ [columnName: `string`]: `SQLiteCloudDataTypes`

Column values are accessed by column name

## Table of contents

### Constructors

- [constructor](SQLiteCloudRow.md#constructor)

### Properties

- [#rowset](SQLiteCloudRow.md##rowset)

### Methods

- [getRowset](SQLiteCloudRow.md#getrowset)

## Constructors

### constructor

• **new SQLiteCloudRow**(`rowset`, `columnsNames`, `data`): [`SQLiteCloudRow`](SQLiteCloudRow.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rowset` | [`SQLiteCloudRowset`](SQLiteCloudRowset.md) |
| `columnsNames` | `string`[] |
| `data` | `SQLiteCloudDataTypes`[] |

#### Returns

[`SQLiteCloudRow`](SQLiteCloudRow.md)

#### Defined in

[src/rowset.ts:9](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/rowset.ts#L9)

## Properties

### #rowset

• `Private` **#rowset**: [`SQLiteCloudRowset`](SQLiteCloudRowset.md)

#### Defined in

[src/rowset.ts:17](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/rowset.ts#L17)

## Methods

### getRowset

▸ **getRowset**(): [`SQLiteCloudRowset`](SQLiteCloudRowset.md)

Returns the rowset that this row belongs to

#### Returns

[`SQLiteCloudRowset`](SQLiteCloudRowset.md)

#### Defined in

[src/rowset.ts:21](https://github.com/sqlitecloud/sqlitecloud-js/blob/dbbcde8/src/rowset.ts#L21)
