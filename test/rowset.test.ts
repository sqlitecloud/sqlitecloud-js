/**
 * rowset.test.ts - test rowset container
 */

import { SQLiteCloudRowset, SQLiteCloudRow } from '../src/index'
import { getChinookTlsConnection } from './shared'

describe('rowset', () => {
  it('can be accessed as an array', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(10)
      expect(Array.isArray(rowset)).toBeTruthy()
      expect(rowset).toHaveLength(10)

      expect(rowset[0]).toBeDefined()
      expect(rowset[0]).toMatchObject({
        AlbumId: 1,
        Bytes: 11170334,
        Composer: 'Angus Young, Malcolm Young, Brian Johnson',
        GenreId: 1,
        MediaTypeId: 1,
        Milliseconds: 343719,
        Name: 'For Those About To Rock (We Salute You)',
        TrackId: 1,
        UnitPrice: 0.99
      })

      done()
      connection.close()
    })
  })

  it('implements .map', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(10)
      expect(Array.isArray(rowset)).toBeTruthy()
      expect(rowset).toHaveLength(10)

      rowset.map((row: SQLiteCloudRow) => {
        expect(row).toBeInstanceOf(SQLiteCloudRow)
        expect(Object.keys(row)).toHaveLength(9)
      })

      done()
      connection.close()
    })
  })

  it('implements .filter', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(10)
      expect(Array.isArray(rowset)).toBeTruthy()
      expect(rowset).toHaveLength(10)

      const filtered = rowset.filter((row: SQLiteCloudRow) => row.AlbumId === 1)
      expect(filtered).toBeInstanceOf(SQLiteCloudRowset)
      expect(filtered.numberOfColumns).toBe(9)
      expect(filtered.numberOfRows).toBe(6)

      done()
      connection.close()
    })
  })

  it('implements .reduce', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM invoices;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)

      // doing "SELECT sum(Total) FROM invoices" the wrong way (not using SQL) to test reduce...
      const total = rowset.reduce((acc: number, row: SQLiteCloudRow) => acc + (row?.Total ? (row.Total as number) : 0), 0)
      expect(Math.floor(total)).toBe(2328)

      done()
      connection.close()
    })
  })

  it('can be sliced like an array', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 50;', (error, rowset) => {
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.numberOfColumns).toBe(9)
      expect(rowset.numberOfRows).toBe(50)
      expect(Array.isArray(rowset)).toBeTruthy()
      expect(rowset).toHaveLength(50)

      // slice with correct bounds
      const sliced = rowset.slice(10, 20)
      expect(sliced).toHaveLength(10)
      expect(sliced[0]).toMatchObject(rowset[10])

      // slice with end larger than length
      const largerSlice = rowset.slice(10, 100)
      expect(largerSlice).toHaveLength(40)
      expect(largerSlice[0]).toMatchObject(rowset[10])
      expect(largerSlice[39]).toMatchObject(rowset[49])

      // slice last 3 elements
      const negativeStartSlice = rowset.slice(-3)
      expect(negativeStartSlice).toHaveLength(3)
      expect(negativeStartSlice[0]).toMatchObject(rowset[rowset.length - 3])

      // slice first 3 elements
      const negativeEndSlice = rowset.slice(0, -3)
      expect(negativeEndSlice).toHaveLength(rowset.length - 3)
      expect(negativeEndSlice[0]).toMatchObject(rowset[0])
      expect(negativeEndSlice[negativeEndSlice.length - 1]).toMatchObject(rowset[rowset.length - 4])

      // slice to empty set
      const emptySlice = rowset.slice(20, 10)
      expect(emptySlice).toHaveLength(0)

      done()
      connection.close()
    })
  })

  it('contains basic metadata', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(error).toBeNull()
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.metadata.numberOfRows).toBe(10)
      expect(rowset.metadata.numberOfColumns).toBe(9)
      expect(rowset.metadata.columns).toMatchObject([
        { name: 'TrackId' },
        { name: 'Name' },
        { name: 'AlbumId' },
        { name: 'MediaTypeId' },
        { name: 'GenreId' },
        { name: 'Composer' },
        { name: 'Milliseconds' },
        { name: 'Bytes' },
        { name: 'UnitPrice' }
      ])

      done()
      connection.close()
    })
  })

  it('contains extended metadata', done => {
    // custom connection used to required sqliteMode enabled but since feb/2/24 it's enabled by default
    const connection = getChinookTlsConnection()
    connection.sendCommands('SELECT * FROM tracks LIMIT 10;', (error, rowset) => {
      expect(error).toBeNull()
      expect(rowset).toBeInstanceOf(SQLiteCloudRowset)
      expect(rowset.metadata.version).toBe(2)
      expect(rowset.metadata.numberOfRows).toBe(10)
      expect(rowset.metadata.numberOfColumns).toBe(9)
      expect(rowset.metadata.columns).toMatchObject([
        { column: 'TrackId', database: 'main', name: 'TrackId', table: 'tracks', type: 'INTEGER', primaryKey: 1, autoIncrement: 1, notNull: 1 },
        { column: 'Name', database: 'main', name: 'Name', table: 'tracks', type: 'NVARCHAR(200)', primaryKey: 0, autoIncrement: 0, notNull: 1 },
        { column: 'AlbumId', database: 'main', name: 'AlbumId', table: 'tracks', type: 'INTEGER', primaryKey: 0, autoIncrement: 0, notNull: 0 },
        { column: 'MediaTypeId', database: 'main', name: 'MediaTypeId', table: 'tracks', type: 'INTEGER', primaryKey: 0, autoIncrement: 0, notNull: 1 },
        { column: 'GenreId', database: 'main', name: 'GenreId', table: 'tracks', type: 'INTEGER', primaryKey: 0, autoIncrement: 0, notNull: 0 },
        { column: 'Composer', database: 'main', name: 'Composer', table: 'tracks', type: 'NVARCHAR(220)', primaryKey: 0, autoIncrement: 0, notNull: 0 },
        { column: 'Milliseconds', database: 'main', name: 'Milliseconds', table: 'tracks', type: 'INTEGER', primaryKey: 0, autoIncrement: 0, notNull: 1 },
        { column: 'Bytes', database: 'main', name: 'Bytes', table: 'tracks', type: 'INTEGER', primaryKey: 0, autoIncrement: 0, notNull: 0 },
        { column: 'UnitPrice', database: 'main', name: 'UnitPrice', table: 'tracks', type: 'NUMERIC(10,2)', primaryKey: 0, autoIncrement: 0, notNull: 1 }
      ])

      done()
      connection.close()
    })
  })
})

describe('rowset column names', () => {
  function createRowset(names: (string | undefined)[], data: any[]): SQLiteCloudRowset {
    return new SQLiteCloudRowset(
      {
        version: 1,
        numberOfRows: data.length / names.length,
        numberOfColumns: names.length,
        columns: names.map(name => ({ name }) as any)
      },
      data
    )
  }

  it('keeps the first duplicate column name and suffixes the following ones', () => {
    const rowset = createRowset(['id', 'id', 'id'], [1, 2, 3])
    expect(rowset.columnsNames).toEqual(['id', 'id_1', 'id_2'])
    expect(rowset.originalColumnsNames).toEqual(['id', 'id', 'id'])
    expect({ ...rowset[0] }).toEqual({ id: 1, id_1: 2, id_2: 3 })
    expect(rowset[0].getData()).toEqual([1, 2, 3])
  })

  it('returns columnsNames matching the row keys', () => {
    const rowset = createRowset(['id', 'name', 'id', 'customer_id', 'name'], [7, 'Ada', 42, 7, 'Laptop'])
    expect(rowset.columnsNames).toEqual(['id', 'name', 'id_1', 'customer_id', 'name_1'])
    expect(rowset.columnsNames.map(name => rowset[0][name])).toEqual([7, 'Ada', 42, 7, 'Laptop'])
  })

  it('skips suffixes already used by other columns', () => {
    const rowset = createRowset(['id', 'id', 'id_1', 'id_2', 'id'], [1, 2, 3, 4, 5])
    expect(rowset.columnsNames).toEqual(['id', 'id_3', 'id_1', 'id_2', 'id_4'])
    expect({ ...rowset[0] }).toEqual({ id: 1, id_3: 2, id_1: 3, id_2: 4, id_4: 5 })
  })

  it('names missing columns by position', () => {
    const rowset = createRowset(['', 'a', undefined, 'column_1'], [1, 2, 3, 4])
    expect(rowset.columnsNames).toEqual(['column_0', 'a', 'column_2', 'column_1'])
    expect(rowset.originalColumnsNames).toEqual(['', 'a', undefined, 'column_1'])
  })

  it('does not expose internal column names to mutation', () => {
    const rowset = createRowset(['id', 'id'], [1, 2])
    rowset.columnsNames.push('other')
    expect(rowset.columnsNames).toEqual(['id', 'id_1'])
  })

  it('keeps unique column names after slice and filter', () => {
    const rowset = createRowset(['id', 'id'], [1, 2, 3, 4, 5, 6])
    const sliced = rowset.slice(1) as SQLiteCloudRowset
    expect(sliced.columnsNames).toEqual(['id', 'id_1'])
    expect({ ...sliced[0] }).toEqual({ id: 3, id_1: 4 })
    const filtered = rowset.filter(row => row.id === 5) as SQLiteCloudRowset
    expect(filtered.columnsNames).toEqual(['id', 'id_1'])
    expect({ ...filtered[0] }).toEqual({ id: 5, id_1: 6 })
  })

  it('keeps the first duplicate column name for joined tables', done => {
    const connection = getChinookTlsConnection()
    connection.sendCommands(
      'SELECT a.AlbumId, a.Title, t.TrackId AS AlbumId, t.Name AS Title FROM albums a JOIN tracks t ON t.AlbumId = a.AlbumId WHERE t.TrackId = 6;',
      (error, rowset) => {
        expect(error).toBeNull()
        expect(rowset.originalColumnsNames).toEqual(['AlbumId', 'Title', 'AlbumId', 'Title'])
        expect(rowset.columnsNames).toEqual(['AlbumId', 'Title', 'AlbumId_1', 'Title_1'])
        expect({ ...rowset[0] }).toEqual({ AlbumId: 1, Title: 'For Those About To Rock We Salute You', AlbumId_1: 6, Title_1: 'Put The Finger On You' })
        expect(rowset.columnsNames.map(name => rowset[0][name])).toEqual(rowset[0].getData())

        done()
        connection.close()
      }
    )
  })
})
