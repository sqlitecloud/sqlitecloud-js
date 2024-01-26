/* eslint-disable prettier/prettier */
import {
  SQLiteManagerType,
  SQLiteManagerColumn,
  SQLiteManagerTable,
  SQLiteManagerConstraints,
  SQLiteManagerDefault,
  SQLiteManagerCollate,
  SQLiteManagerForeignKeyOptions,
  SQLiteManagerForeignKeyOn
} from './types'

export class SQLiteManager {
  private table: SQLiteManagerTable
  private create: boolean

  constructor(table?: SQLiteManagerTable) {
    if (typeof table === 'undefined') {
      this.create = true
      this.table = {} as SQLiteManagerTable
    } else {
      if (table.name) {
        this.create = true
      } else {
        this.create = false
      }
      this.table = table
    }
  }

  reset(): void {
    this.table = {} as SQLiteManagerTable
  }

  set name(name: string) {
    this.table.name = name
  }

  queryBuilder(): string {
    let query = ''

    if (this.create && this.table.columns) {
      query += 'CREATE TABLE "' + this.table.name + '" ('

      for (let j = 0; j < this.table.columns.length; j++) {
        const column: SQLiteManagerColumn = this.table.columns[j]

        query += '"' + column.name + '" ' + SQLiteManagerType[column.type]

        if (column.constraints) {
          const constraints: string[] = Object.keys(column.constraints).filter(key => {
            if (column.constraints) {
              return column.constraints[key as keyof SQLiteManagerConstraints]
            }
          })

          constraints.forEach(constraint => {
            query += ' ' + constraint.replace('_', ' ')
          })

          if (column.constraints.Check) {
            query += ' CHECK (' + column.constraints.Check + ')'
          }

          if (column.constraints.Default) {
            query += ' DEFAULT '
            if (typeof column.constraints.Default === 'string') {
              query += column.constraints.Default
            } else {
              query += SQLiteManagerDefault[column.constraints.Default]
            }
          }

          if (column.constraints.Collate) {
            query += ' COLLATE '
            if (typeof column.constraints.Collate === 'string') {
              query += column.constraints.Collate
            } else {
              query += SQLiteManagerCollate[column.constraints.Collate]
            }
          }

          if (column.constraints.ForeignKey) {
            if (column.constraints.ForeignKey.enabled) {
              query += ' REFERENCES ' + column.constraints.ForeignKey.table + '(' + column.constraints.ForeignKey.column + ')'
              if (column.constraints.ForeignKey.options) {
                query += ' ' + SQLiteManagerForeignKeyOptions[column.constraints.ForeignKey.options]
              }

              if (column.constraints.ForeignKey.onDelete) {
                query += ' ON DELETE ' + SQLiteManagerForeignKeyOn[column.constraints.ForeignKey.onDelete]
              }

              if (column.constraints.ForeignKey.onUpdate) {
                query += ' ON UPDATE ' + SQLiteManagerForeignKeyOn[column.constraints.ForeignKey.onUpdate]
              }
            }
          }
        }

        if (j < this.table.columns.length - 1) {
          query += ', '
        }
      }

      query += ');'
    }

    return query
  }

  mixTables(tables: SQLiteManagerTable, newTables: Partial<SQLiteManagerTable>): SQLiteManagerTable {
    return { ...tables, ...newTables }
  }

  addColumn(column: SQLiteManagerColumn): string {
    this.table = this.mixTables(this.table, { name: this.table.name, columns: [Object.create(column)] })
    return this.queryBuilder()
  }

  deleteColumn(columnName: string): string {
    if (this.table.columns) {
      const i = this.table.columns.findIndex(column => column.name === columnName)
      if (i > -1) {
        this.table.columns.splice(i, 1)
      }
    }
    //this.tables[index].columns = this.tables[index].columns.filter(column => column.name !== columnName) it's slower

    return this.queryBuilder()
  }

  renameColumn(oldColumnName: string, newColumnName: string): string {
    if (this.table.columns) {
      const i = this.table.columns.findIndex(column => column.name === oldColumnName)
      if (i > -1) {
        this.table.columns[i].name = newColumnName
      }
    }

    return this.queryBuilder()
  }

  changeColumnType(columnName: string, type: SQLiteManagerType): string {
    if (this.table.columns) {
      const i = this.table.columns.findIndex(column => column.name === columnName)
      if (i > -1) {
        this.table.columns[i].type = type
      }
    }

    return this.queryBuilder()
  }

  changeColumnConstraints(name: string, type: SQLiteManagerType, constraints: SQLiteManagerConstraints): string {
    /* if (typeof this.table.columns != 'undefined') {
      const i = this.table.columns.findIndex(column => column.name === columnName)
      if (i > -1) {
        this.table.columns[i].constraints = constraints
      }
    } */

    this.table = this.mixTables(this.table, {
      columns: [{ name: name, type: type, constraints: constraints }]
    })

    return this.queryBuilder()
  }
}
