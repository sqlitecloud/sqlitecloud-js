/* eslint-disable prettier/prettier */
import { SQLiteManager } from '../src/manager'
import { SQLiteManagerType } from '../src/types'
import { testTable, testTable2 } from './assets/manager-test-tables'

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

  it('tests alter table', () => {
    manager = new SQLiteManager(testTable)

    const addColumn: string = manager.addColumn(testTable2.columns[0])

    expect(addColumn).toContain('ALTER TABLE')
    expect(addColumn).toContain(testTable.name)
    expect(addColumn).toContain('ADD COLUMN')
    expect(addColumn).toContain(testTable2.columns[0].name)
    expect(addColumn).toContain(SQLiteManagerType[testTable2.columns[0].type])

    manager.addColumn(JSON.parse(JSON.stringify(testTable2.columns[1])))
    expect(manager.deleteColumn(testTable2.columns[0].name)).toContain('ALTER TABLE "' + testTable.name + '" DROP COLUMN "' + testTable2.columns[0].name + '";')

    const risRen: string = manager.renameColumn(testTable.columns[1].name, testTable2.columns[2].name)

    expect(risRen).toContain(testTable.columns[1].name)
    expect(risRen).toContain(testTable2.columns[2].name)

    manager.name = testTable2.name
    const renTable: string = manager.queryBuilder()

    expect(renTable).toContain('ALTER TABLE "' + testTable.name + '" RENAME TO "' + testTable2.name + '";')

    /* const risCh: string = manager.changeColumnType(testTable.columns[2].name, SQLiteManagerType.TEXT)

    expect(risCh).toContain(SQLiteManagerType[SQLiteManagerType.TEXT])
    expect(risCh).not.toContain(SQLiteManagerType[SQLiteManagerType.INTEGER])

    const risCnstr: string = manager.changeColumnConstraints(testTable.columns[2].name, testTable.columns[2].constraints)

    expect(risCnstr).toContain('NOT NULL UNIQUE') */
  })
})
