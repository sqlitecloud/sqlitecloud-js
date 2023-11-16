[sqlitecloud-js](../README.md) / [Exports](../modules.md) / SQLCloudRowsetMetadata

# Interface: SQLCloudRowsetMetadata

Metadata information for a set of rows resulting from a query

## Table of contents

### Properties

- [columns](SQLCloudRowsetMetadata.md#columns)
- [numberOfColumns](SQLCloudRowsetMetadata.md#numberofcolumns)
- [numberOfRows](SQLCloudRowsetMetadata.md#numberofrows)
- [version](SQLCloudRowsetMetadata.md#version)

## Properties

### columns

• **columns**: \{ `column?`: `string` ; `database?`: `string` ; `name`: `string` ; `table?`: `string` ; `type?`: `string`  }[]

Columns' metadata

#### Defined in

[src/types.ts:66](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L66)

___

### numberOfColumns

• **numberOfColumns**: `number`

Number of columns

#### Defined in

[src/types.ts:63](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L63)

___

### numberOfRows

• **numberOfRows**: `number`

Number of rows

#### Defined in

[src/types.ts:61](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L61)

___

### version

• **version**: `number`

Rowset version 1 has column's name, version 2 has extended metadata

#### Defined in

[src/types.ts:59](https://github.com/sqlitecloud/sqlitecloud-js/blob/802b4cb/src/types.ts#L59)
