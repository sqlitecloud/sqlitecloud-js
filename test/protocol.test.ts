//
// protocol.test.ts
//

import { formatCommand, parseRowsetChunks } from '../src/drivers/protocol'
import { SQLiteCloudCommand } from '../src/drivers/types'

// response sent by the server when we TEST ROWSET_CHUNK
const CHUNKED_RESPONSE = Buffer.from(
  '/24 1:1 1 1 +3 key+7 REINDEX/18 2:1 1 1 +7 INDEXED/16 3:1 1 1 +5 INDEX/15 4:1 1 1 +4 DESC/17 5:1 1 1 +6 ESCAPE/15 6:1 1 1 +4 EACH/16 7:1 1 1 +5 CHECK/14 8:1 1 1 +3 KEY/17 9:1 1 1 +6 BEFORE/19 10:1 1 1 +7 FOREIGN/15 11:1 1 1 +3 FOR/18 12:1 1 1 +6 IGNORE/18 13:1 1 1 +6 REGEXP/19 14:1 1 1 +7 EXPLAIN/19 15:1 1 1 +7 INSTEAD/15 16:1 1 1 +3 ADD/20 17:1 1 1 +8 DATABASE/14 18:1 1 1 +2 AS/18 19:1 1 1 +6 SELECT/17 20:1 1 1 +5 TABLE/16 21:1 1 1 +4 LEFT/16 22:1 1 1 +4 THEN/15 23:1 1 1 +3 END/23 24:1 1 1 +10 DEFERRABLE/16 25:1 1 1 +4 ELSE/19 26:1 1 1 +7 EXCLUDE/18 27:1 1 1 +6 DELETE/21 28:1 1 1 +9 TEMPORARY/16 29:1 1 1 +4 TEMP/14 30:1 1 1 +2 OR/18 31:1 1 1 +6 ISNULL/17 32:1 1 1 +5 NULLS/21 33:1 1 1 +9 SAVEPOINT/21 34:1 1 1 +9 INTERSECT/16 35:1 1 1 +4 TIES/19 36:1 1 1 +7 NOTNULL/15 37:1 1 1 +3 NOT/14 38:1 1 1 +2 NO/16 39:1 1 1 +4 NULL/16 40:1 1 1 +4 LIKE/18 41:1 1 1 +6 EXCEPT/24 42:1 1 1 +11 TRANSACTION/18 43:1 1 1 +6 ACTION/14 44:1 1 1 +2 ON/19 45:1 1 1 +7 NATURAL/17 46:1 1 1 +5 ALTER/17 47:1 1 1 +5 RAISE/21 48:1 1 1 +9 EXCLUSIVE/18 49:1 1 1 +6 EXISTS/23 50:1 1 1 +10 CONSTRAINT/16 51:1 1 1 +4 INTO/18 52:1 1 1 +6 OFFSET/14 53:1 1 1 +2 OF/15 54:1 1 1 +3 SET/19 55:1 1 1 +7 TRIGGER/17 56:1 1 1 +5 RANGE/21 57:1 1 1 +9 GENERATED/18 58:1 1 1 +6 DETACH/18 59:1 1 1 +6 HAVING/16 60:1 1 1 +4 GLOB/17 61:1 1 1 +5 BEGIN/17 62:1 1 1 +5 INNER/23 63:1 1 1 +10 REFERENCES/18 64:1 1 1 +6 UNIQUE/17 65:1 1 1 +5 QUERY/19 66:1 1 1 +7 WITHOUT/16 67:1 1 1 +4 WITH/17 68:1 1 1 +5 OUTER/19 69:1 1 1 +7 RELEASE/18 70:1 1 1 +6 ATTACH/19 71:1 1 1 +7 BETWEEN/19 72:1 1 1 +7 NOTHING/18 73:1 1 1 +6 GROUPS/17 74:1 1 1 +5 GROUP/19 75:1 1 1 +7 CASCADE/15 76:1 1 1 +3 ASC/19 77:1 1 1 +7 DEFAULT/16 78:1 1 1 +4 CASE/19 79:1 1 1 +7 COLLATE/18 80:1 1 1 +6 CREATE/25 81:1 1 1 +12 CURRENT_DATE/21 82:1 1 1 +9 IMMEDIATE/16 83:1 1 1 +4 JOIN/18 84:1 1 1 +6 INSERT/17 85:1 1 1 +5 MATCH/16 86:1 1 1 +4 PLAN/19 87:1 1 1 +7 ANALYZE/18 88:1 1 1 +6 PRAGMA/25 89:1 1 1 +12 MATERIALIZED/20 90:1 1 1 +8 DEFERRED/20 91:1 1 1 +8 DISTINCT/14 92:1 1 1 +2 IS/18 93:1 1 1 +6 UPDATE/18 94:1 1 1 +6 VALUES/19 95:1 1 1 +7 VIRTUAL/18 96:1 1 1 +6 ALWAYS/16 97:1 1 1 +4 WHEN/17 98:1 1 1 +5 WHERE/21 99:1 1 1 +9 RECURSIVE/18 100:1 1 1 +5 ABORT/18 101:1 1 1 +5 AFTER/19 102:1 1 1 +6 RENAME/16 103:1 1 1 +3 AND/17 104:1 1 1 +4 DROP/22 105:1 1 1 +9 PARTITION/27 106:1 1 1 +13 AUTOINCREMENT/15 107:1 1 1 +2 TO/15 108:1 1 1 +2 IN/17 109:1 1 1 +4 CAST/19 110:1 1 1 +6 COLUMN/19 111:1 1 1 +6 COMMIT/21 112:1 1 1 +8 CONFLICT/18 113:1 1 1 +5 CROSS/31 114:1 1 1 +17 CURRENT_TIMESTAMP/26 115:1 1 1 +12 CURRENT_TIME/20 116:1 1 1 +7 CURRENT/22 117:1 1 1 +9 PRECEDING/17 118:1 1 1 +4 FAIL/17 119:1 1 1 +4 LAST/19 120:1 1 1 +6 FILTER/20 121:1 1 1 +7 REPLACE/18 122:1 1 1 +5 FIRST/22 123:1 1 1 +9 FOLLOWING/17 124:1 1 1 +4 FROM/17 125:1 1 1 +4 FULL/18 126:1 1 1 +5 LIMIT/15 127:1 1 1 +2 IF/18 128:1 1 1 +5 ORDER/21 129:1 1 1 +8 RESTRICT/19 130:1 1 1 +6 OTHERS/17 131:1 1 1 +4 OVER/22 132:1 1 1 +9 RETURNING/18 133:1 1 1 +5 RIGHT/21 134:1 1 1 +8 ROLLBACK/17 135:1 1 1 +4 ROWS/16 136:1 1 1 +3 ROW/22 137:1 1 1 +9 UNBOUNDED/18 138:1 1 1 +5 UNION/18 139:1 1 1 +5 USING/19 140:1 1 1 +6 VACUUM/17 141:1 1 1 +4 VIEW/19 142:1 1 1 +6 WINDOW/15 143:1 1 1 +2 DO/15 144:1 1 1 +2 BY/22 145:1 1 1 +9 INITIALLY/16 146:1 1 1 +3 ALL/20 147:1 1 1 +7 PRIMARY/6 0 0 0 '
)

describe('parseRowsetChunks', () => {
  it('should extract rowset from single buffer', () => {
    const rowset = parseRowsetChunks([CHUNKED_RESPONSE])
    expect(rowset.length).toBe(147)
    expect(rowset[0]['key']).toBe('REINDEX')
    expect(rowset[146]['key']).toBe('PRIMARY')
  })

  it('should extract rowset from segmented buffers', () => {
    // split CHUNKED_RESPONSE into 3 random sized buffers
    const buffer1 = CHUNKED_RESPONSE.slice(0, 100)
    const buffer2 = CHUNKED_RESPONSE.slice(100, 200)
    const buffer3 = CHUNKED_RESPONSE.slice(200)

    const rowset = parseRowsetChunks([buffer1, buffer2, buffer3])
    expect(rowset.length).toBe(147)
    expect(rowset[0]['key']).toBe('REINDEX')
    expect(rowset[146]['key']).toBe('PRIMARY')
  })
})

const testCases = [
  { query: "SELECT 'hello world'", parameters: [], expected: "+20 SELECT 'hello world'" },
  {
    query: 'SELECT ?, ?, ?, ?, ?',
    parameters: ['world', 123, 3.14, null, Buffer.from('hello')],
    expected: '=57 6 !21 SELECT ?, ?, ?, ?, ?\x00!6 world\x00:123 ,3.14 _ $5 hello',
  },
  {
    query: 'SELECT ?',
    parameters: ["'hello world'"],
    expected: "=32 2 !9 SELECT ?\x00!14 'hello world'\x00",
  },
]

describe('Format command', () => {
  testCases.forEach(({ query, parameters, expected }) => {
    it(`should serialize ${JSON.stringify([query, ...parameters])}`, () => {
      const command: SQLiteCloudCommand = { query, parameters }
      const serialized = formatCommand(command)
      expect(serialized).toEqual(Buffer.from(expected))
    })
  })
})
