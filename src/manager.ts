/* eslint-disable prettier/prettier */
import {
  SQLiteManagerType,
  SQLiteManagerColumn,
  SQLiteManagerTable,
  SQLiteManagerConstraints,
  SQLiteManagerDefault,
  SQLiteManagerCollate,
  SQLiteManagerForeignKeyOptions,
  SQLiteManagerForeignKeyOn,
  AT
} from './types'

export class SQLiteManager {
  private table: SQLiteManagerTable
  private create = false
  private query = ''

  constructor(table?: SQLiteManagerTable) {
    if (typeof table === 'undefined') {
      this.create = true
      this.table = {} as SQLiteManagerTable
    } else {
      if (table.name) {
        this.create = true
        if (table.columns) {
          this.create = false
        }
      }
      this.table = table
    }
  }

  reset(): void {
    this.table = {} as SQLiteManagerTable
  }

  /** If changing name in altertable you need to manually call the queryBuilder() */
  set name(name: string) {
    if (this.create) {
      this.table.name = name
    } else {
      this.table.name = name
      this.queryBuilder(AT.RENAME_TABLE, { name: name } as SQLiteManagerColumn)
    }
  }

  queryBuilder(op?: AT, column?: SQLiteManagerColumn, newColumn?: string): string {
    let query = ''

    if (this.table.columns) {
      if (this.create) {
        query += 'CREATE TABLE "' + this.table.name + '" ('

        for (let j = 0; j < this.table.columns.length; j++) {
          query += this.queryBuilderColumn(this.table.columns[j])
          if (j < this.table.columns.length - 1) {
            query += ', '
          }
        }

        query += ');'
      } else {
        if (typeof op != 'undefined' && column) {
          switch (op) {
            case AT.RENAME_TABLE:
              this.query += 'ALTER TABLE "' + this.table.name + '" RENAME TO "' + column.name + '";\n'
              break
            case AT.ADD_COLUMN:
              this.query += 'ALTER TABLE "' + this.table.name + '" ADD COLUMN ' + this.queryBuilderColumn(column) + ';\n'
              break
            case AT.DROP_COLUMN:
              this.query += 'ALTER TABLE "' + this.table.name + '" DROP COLUMN "' + column.name + '";\n'
              break
            case AT.RENAME_COLUMN:
              if (newColumn) this.query += 'ALTER TABLE "' + this.table.name + '" RENAME COLUMN "' + column.name + '" TO "' + newColumn + '";\n'
              break
          }
        }

        query = this.query
      }
    }

    return query
  }

  private queryBuilderColumn(column: SQLiteManagerColumn): string {
    let query = ''
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

          if (column.constraints.ForeignKey.match) {
            query += ' MATCH ' + column.constraints.ForeignKey.match
          }
        }
      }
    }
    return query
  }

  addColumn(column: SQLiteManagerColumn): string {
    if (this.table.columns) {
      this.table.columns.push(column)
    } else {
      this.table.columns = [column]
    }

    return this.queryBuilder(AT.ADD_COLUMN, column)
  }

  deleteColumn(name: string): string {
    const i = this.findColumn(name)

    if (typeof i != 'undefined' && this.table.columns) {
      this.table.columns.splice(i, 1)
    }

    return this.queryBuilder(AT.DROP_COLUMN, { name: name } as SQLiteManagerColumn)
  }

  renameColumn(oldColumnName: string, newColumnName: string): string {
    const i = this.findColumn(oldColumnName)

    if (typeof i != 'undefined' && this.table.columns) {
      this.table.columns[i].name = newColumnName
    }

    return this.queryBuilder(AT.RENAME_COLUMN, { name: oldColumnName } as SQLiteManagerColumn, newColumnName)
  }

  changeColumnType(name: string, type: SQLiteManagerType): string {
    const i = this.findColumn(name)

    if (typeof i != 'undefined' && this.table.columns) {
      this.table.columns[i].type = type
    }

    return this.queryBuilder()
  }

  changeColumnConstraints(name: string, constraints: SQLiteManagerConstraints): string {
    const i = this.findColumn(name)

    if (typeof i != 'undefined' && this.table.columns) {
      this.table.columns[i].constraints = constraints
    }

    return this.queryBuilder()
  }

  private findColumn(name: string): number | undefined {
    if (this.table.columns) {
      const i = this.table.columns.findIndex(column => column.name === name)
      if (i > -1) {
        return i
      }
    }
  }
}