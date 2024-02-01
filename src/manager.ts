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

enum AT {
  ADD_COLUMN,
  DROP_COLUMN,
  RENAME_COLUMN,
  RENAME_TABLE
}

/**
 *
 * When creating a new istance of the SQLiteManager class, the constructor:
 * - will get you in the alter table section if you pass an entire table
 * - will get you to the create table section if you just pass the name of the table or you pass nothing
 *
 * */
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

  queryBuilder(op?: AT | string, column?: SQLiteManagerColumn, newColumn?: string): string {
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
          let oldname: string

          switch (op) {
            case AT.RENAME_TABLE:
              this.query += 'ALTER TABLE "' + this.table.name + '" RENAME TO "' + column.name + '";\n'
              break
            case AT.ADD_COLUMN:
              if (
                column.constraints?.PRIMARY_KEY ||
                column.constraints?.UNIQUE ||
                column.constraints?.Default != SQLiteManagerDefault.NULL ||
                (typeof column.constraints.NOT_NULL != 'undefined' && column.constraints?.Default == SQLiteManagerDefault.NULL) ||
                (column.constraints?.ForeignKey?.enabled &&
                  column.constraints?.ForeignKey?.table &&
                  column.constraints?.ForeignKey?.column &&
                  column.constraints?.Default != SQLiteManagerDefault.NULL)
              ) {
                query += this.queryBuilder('', {} as SQLiteManagerColumn)
              } else {
                this.query += 'ALTER TABLE "' + this.table.name + '" ADD COLUMN ' + this.queryBuilderColumn(column) + ';\n'
              }
              break
            case AT.DROP_COLUMN:
              if (this.isReferenced(column) || column.constraints?.PRIMARY_KEY || column.constraints?.UNIQUE) {
                query += this.queryBuilder('', {} as SQLiteManagerColumn)
              } else {
                this.query += 'ALTER TABLE "' + this.table.name + '" DROP COLUMN "' + column.name + '";\n'
              }
              break
            case AT.RENAME_COLUMN:
              if (newColumn) this.query += 'ALTER TABLE "' + this.table.name + '" RENAME COLUMN "' + column.name + '" TO "' + newColumn + '";\n'
              break
            default:
              this.query += '\n\nPRAGMA foreign_keys = OFF;\n'
              this.query += 'BEGIN TRANSACTION;\n'
              /*
              this.query += 'WITH indexntriggernview AS (SELECT type, sql FROM sqlite_schema WHERE tbl_name="' + this.table.name + '");\n'
              DROP views, indexes and triggers
              */
              this.create = true
              oldname = this.table.name
              if (typeof this.findColumn('new_' + this.table.name) == 'undefined') {
                this.table.name = 'new_' + this.table.name
              } else {
                throw new Error('Column new_' + this.table.name + 'already exists')
              }
              this.query += this.queryBuilder()
              this.create = false
              this.query += '\nINSERT INTO "' + this.table.name + '" SELECT * FROM "' + oldname + '";\n'
              this.query += 'DROP TABLE "' + oldname + '";\n'
              this.query += 'ALTER TABLE "' + this.table.name + '" RENAME TO "' + oldname + '";\n'
              this.table.name = oldname
              this.query += 'CREATE INDEX '
              /*          
              Reconstruct using CREATE INDEX, CREATE TRIGGER, and CREATE VIEW
              If any views refer to table X in a way that is affected by the schema change, then drop those views using DROP VIEW and recreate them with whatever changes are necessary to accommodate the schema change using CREATE VIEW.
              */
              this.query += 'PRAGMA foreign_key_check("' + this.table.name + '");\n'
              this.query += 'COMMIT;\n'
              this.query += 'PRAGMA foreign_keys = ON;\n'

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
          const constcol = column.constraints[key as keyof SQLiteManagerConstraints]
          if (typeof constcol == 'boolean' && constcol == true) {
            return constcol
          }
        }
      })

      constraints.forEach(constraint => {
        if (!(constraint == 'AUTOINCREMENT' && column.type != SQLiteManagerType.INTEGER)) {
          query += ' ' + constraint.replace('_', ' ')
        }
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

          if (typeof column.constraints.ForeignKey.onDelete !== 'undefined') {
            query += ' ON DELETE ' + SQLiteManagerForeignKeyOn[column.constraints.ForeignKey.onDelete].replace('_', ' ')
          }

          if (typeof column.constraints.ForeignKey.onUpdate !== 'undefined') {
            query += ' ON UPDATE ' + SQLiteManagerForeignKeyOn[column.constraints.ForeignKey.onUpdate].replace('_', ' ')
          }

          if (column.constraints.ForeignKey.match) {
            query += ' MATCH ' + column.constraints.ForeignKey.match
          }

          if (typeof column.constraints.ForeignKey.options !== 'undefined') {
            query += ' ' + SQLiteManagerForeignKeyOptions[column.constraints.ForeignKey.options].replace('_', ' ')
          }
        }
      }
    }
    return query
  }

  private isReferenced(column: SQLiteManagerColumn): boolean {
    if (this.table.columns) {
      for (let i = 0; i < this.table.columns.length; i++) {
        if (this.table.columns[i].constraints?.ForeignKey?.column == column.name) {
          return true
        }
      }
    }
    return false
  }

  addColumn(column: SQLiteManagerColumn): string {
    if (this.table.columns) {
      if (typeof this.findColumn(column.name) == 'undefined') {
        this.table.columns.push(column)
      } else {
        throw new Error('Column already exists')
      }
    } else {
      this.table.columns = [column]
    }

    return this.queryBuilder(AT.ADD_COLUMN, column)
  }

  deleteColumn(name: string): string {
    let query = ''
    const i = this.findColumn(name)

    if (this.table.columns && typeof i != 'undefined') {
      if (this.create) {
        this.table.columns.splice(i, 1)
        query = this.queryBuilder(AT.DROP_COLUMN, this.table.columns[i])
      } else {
        query = this.queryBuilder(AT.DROP_COLUMN, this.table.columns[i])
        this.table.columns.splice(i, 1)
      }
    }

    return query
  }

  renameColumn(oldColumnName: string, newColumnName: string): string {
    const i = this.findColumn(oldColumnName)

    if (typeof i != 'undefined' && this.table.columns) {
      if (typeof this.findColumn(newColumnName) == 'undefined') {
        this.table.columns[i].name = newColumnName
      } else {
        throw new Error('Column already exists')
      }
    }

    return this.queryBuilder(AT.RENAME_COLUMN, { name: oldColumnName } as SQLiteManagerColumn, newColumnName)
  }

  changeColumnType(name: string, type: SQLiteManagerType): string {
    const i = this.findColumn(name)

    if (typeof i != 'undefined' && this.table.columns) {
      this.table.columns[i].type = type
    }

    return this.queryBuilder('', {} as SQLiteManagerColumn)
  }

  changeColumnConstraints(name: string, constraints: SQLiteManagerConstraints): string {
    const i = this.findColumn(name)

    if (typeof i != 'undefined' && this.table.columns) {
      this.table.columns[i].constraints = constraints
    }

    return this.queryBuilder('', {} as SQLiteManagerColumn)
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
