/**
 * reserved-commands.test.ts - test sqlitecloud reserved commands
 */

import {
  _,
  SQLiteCloudError,
  SQLiteCloudRowset,
  SQLiteCloudConnection,
  SQLiteCloudTlsConnection,
  CHINOOK_DATABASE_URL,
  parseconnectionstring,
  getConnection,
  connUsername,
  randomName,
  randomDate,
  randomBool,
  date,
  ip,
  uuid,
  bool,
  colseq,
  screaming_snake_case,
  regex_IP_UUID_N,
  test
} from './shared'

describe.skip.each([['example.com', 'chinook.sqlite', 'artists', 3, _, '', true]])('webhook', (url_or_code, database, table, mask, options, secret, ok) => {
  let generated_secret = ''

  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD WEBHOOK ${url_or_code}`,
      test(done, chinook, ok, (r: any) => (generated_secret = r))
    )
  })

  it(`should${ok ? '' : "n't"} add with secret`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD WEBHOOK ${url_or_code}${database ? `DATABASE ${database}` : ''}${table ? `TABLE ${table}` : ''}${mask ? `MASK ${mask}` : ''}${options ? `OPTIONS ${options}` : ''} SECRET ${secret}`,
      test(done, chinook, ok)
    )
  })

  let id = 0

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(
        done,
        chinook,
        ok,
        {
          id: expect.any(Number),
          action: url_or_code,
          databasename: database,
          tablename: table,
          mask: mask,
          options: options,
          secret: secret
        },
        (r: any) => (id = r[1].id)
      )
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE WEBHOOK ${id}`, test(done, chinook, ok))
  })

  it(`shouldn't list removed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(
        done,
        chinook,
        false,
        {
          id: expect.any(Number),
          action: url_or_code,
          databasename: database,
          tablename: table,
          mask: mask,
          options: options,
          secret: secret
        },
        (r: any) => (id = r.id)
      )
    )
  })
})
