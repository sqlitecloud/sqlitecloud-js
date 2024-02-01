/* eslint-disable prettier/prettier */

import * as types from '../../src/types'

export const testTable = {
  name: 'myTable',
  columns: [
    {
      name: 'column1',
      type: types.SQLiteManagerType.INTEGER,
      constraints: {
        PRIMARY_KEY: true,
        AUTOINCREMENT: true,
        NOT_NULL: true,
        UNIQUE: true
      }
    },
    {
      name: 'column2',
      type: types.SQLiteManagerType.REAL,
      constraints: {
        NOT_NULL: true,
        UNIQUE: true
      }
    },
    {
      name: 'column3',
      type: types.SQLiteManagerType.INTEGER,
      constraints: {
        NOT_NULL: true,
        UNIQUE: true
      }
    },
    {
      name: 'column4',
      type: types.SQLiteManagerType.INTEGER,
      constraints: {
        NOT_NULL: true,
        UNIQUE: true
      }
    }
  ]
}

export const testTable2 = {
  name: 'myTable',
  columns: [
    {
      name: 'test1',
      type: types.SQLiteManagerType.REAL,
      constraints: {
        PRIMARY_KEY: false,
        AUTOINCREMENT: true,
        UNIQUE: false,
        Default: types.SQLiteManagerDefault.NULL
      }
    },
    {
      name: 'test2',
      type: types.SQLiteManagerType.BLOB,
      constraints: {
        NOT_NULL: true,
        UNIQUE: true
      }
    },
    {
      name: 'test3',
      type: types.SQLiteManagerType.TEXT,
      constraints: {
        NOT_NULL: false,
        UNIQUE: true
      }
    },
    {
      name: 'test4',
      type: types.SQLiteManagerType.INTEGER,
      constraints: {
        NOT_NULL: true,
        UNIQUE: true,
        CHECK: 'test4 > 0',
        ForeignKey: new types.SQLiteManagerForeignKey(
          true,
          'myTable2',
          'test1',
          types.SQLiteManagerForeignKeyOptions.NONE,
          types.SQLiteManagerForeignKeyOn.CASCADE,
          types.SQLiteManagerForeignKeyOn.CASCADE
        )
      }
    }
  ]
}
