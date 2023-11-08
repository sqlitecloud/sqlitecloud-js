import { SQLiteCloudError } from '../src/protocol'
import { prepareSql } from '../src/utilities'

describe('prepareSql', () => {
  it('should replace single ? parameter', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ?', 'John')
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John'")
  })

  it('should replace multiple ? parameter', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', 'John', 'Doe')
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John' AND last_name = 'Doe'")
  })

  it('should replace multiple ? parameter passed as array', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', ['John', 'Doe'])
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John' AND last_name = 'Doe'")
  })

  it('should replace multiple ? parameter passed as array', () => {
    const sql = prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', ['John', 'Doe'])
    expect(sql).toBe("SELECT * FROM users WHERE name = 'John' AND last_name = 'Doe'")
  })

  it("should replace string ? parameter containing ' character", () => {
    const sql = prepareSql('SELECT * FROM phone WHERE name = ?', "Jack's phone")
    expect(sql).toBe("SELECT * FROM phone WHERE name = 'Jack''s phone'")
  })

  it('should hANDle ? parameter with sql injection threat', () => {
    const sql = prepareSql('SELECT * FROM phone WHERE name = ?', "Jack's phone; DROP TABLE phone;")
    expect(sql).toBe("SELECT * FROM phone WHERE name = 'Jack''s phone; DROP TABLE phone;'")
  })

  it('should replace integer ? parameter', () => {
    const sql = prepareSql('SELECT * FROM users WHERE age < ?', 32)
    expect(sql).toBe('SELECT * FROM users WHERE age < 32')
  })

  it('should replace float ? parameter', () => {
    const sql = prepareSql('SELECT * FROM pies WHERE diameter < ?', Math.PI)
    expect(sql).toBe(`SELECT * FROM pies WHERE diameter < ${Math.PI}`)
  })

  it('should replace null ? parameter', () => {
    const sql = prepareSql('SELECT * FROM pies WHERE diameter = ?', null)
    expect(sql).toBe('SELECT * FROM pies WHERE diameter = NULL')
  })

  it('should replace json ? parameter', () => {
    const sql = prepareSql('update users set profile = ? WHERE id = ?', { first: 'John', last: 'Doe' }, 1)
    expect(sql).toBe('update users set profile = \'{"first":"John","last":"Doe"}\' WHERE id = 1')
  })

  it('should replace buffer ? parameter', () => {
    const buffer = Buffer.from('Hello World!')
    const sql = prepareSql('UPDATE users SET details = ? WHERE id = ?', buffer, 1)
    expect(sql).toBe("UPDATE users SET details = X'48656c6c6f20576f726c6421' WHERE id = 1")
  })

  it('should throw if ? parameter is missing', () => {
    expect(() => {
      prepareSql('SELECT * FROM users WHERE name = ? AND last_name = ?', 'John' /** missing last_name parameter */)
    }).toThrow(SQLiteCloudError)
  })

  it('should replace multiple $named parameters', () => {
    const sql = prepareSql('SELECT * FROM users WHERE first = $first AND last = $last', { $first: 'John', $last: 'Doe' })
    expect(sql).toBe("SELECT * FROM users WHERE first = 'John' AND last = 'Doe'")
  })

  it("should throw if $named parameter doesn't start with $ sign", () => {
    expect(() => {
      prepareSql('SELECT * FROM users WHERE first = $first AND last = €last', { $first: 'John', '€last': 'Doe' })
    }).toThrow(SQLiteCloudError)
  })
})
