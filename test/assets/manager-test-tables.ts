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
      type: types.SQLiteManagerType.TEXT,
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
