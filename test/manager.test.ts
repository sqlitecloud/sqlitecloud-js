/* eslint-disable prettier/prettier */
import { SQLiteManager } from '../src/manager'
import { SQLiteManagerType } from '../src/types'
import { testTable } from './assets/manager-test-tables'

describe('Create a table', () => {
  let manager: SQLiteManager

  it('tests create table', () => {
    manager = new SQLiteManager({ name: testTable.name })

    expect(manager.addColumn(testTable.columns[0])).toContain(
      'CREATE TABLE "' + testTable.name + '" ("' + testTable.columns[0].name + '" ' + SQLiteManagerType[testTable.columns[0].type]
    )

    manager.addColumn(JSON.parse(JSON.stringify(testTable.columns[1])))
    expect(manager.deleteColumn(testTable.columns[0].name)).not.toContain(testTable.columns[0].name)

    const risRen: string = manager.renameColumn(testTable.columns[1].name, testTable.columns[2].name)

    expect(risRen).not.toContain(testTable.columns[1].name)
    expect(risRen).toContain(testTable.columns[2].name)

    const risCh: string = manager.changeColumnType(testTable.columns[2].name, SQLiteManagerType.TEXT)

    expect(risCh).toContain(SQLiteManagerType[SQLiteManagerType.TEXT])
    expect(risCh).not.toContain(SQLiteManagerType[SQLiteManagerType.INTEGER])

    const risCnstr: string = manager.changeColumnConstraints(testTable.columns[2].name, testTable.columns[2].constraints)

    expect(risCnstr).toContain('NOT NULL UNIQUE')
  })
})
