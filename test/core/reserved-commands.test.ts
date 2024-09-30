/**
 * reserved-commands.test.ts - test sqlitecloud reserved commands
 */

import { _, getConnection, test } from './shared'

describe.each([
  ['example.com', 'chinook.sqlite', 'artists', 3, _, 'example', true],
  ['example2.com', 'chinook.sqlite', 'artists', 2, _, 'example2', true],
  ['example1.com', 'chinook.sqlite', 'artists', 1, _, 'example1', true],
  ['example0.com', 'chinook.sqlite', 'artists', 0, _, 'example0', false],
  ['example_notexisting.com', _, _, 2, _, 'example_notexisting', false],
  ['example.com', 'chinook', 'artist', 3, _, 'example', false],
  [_, _, _, 2, _, _, false]
])('webhook', (url_or_code, database, table, mask, options, secret, ok) => {
  let generated_secret = ''

  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD WEBHOOK ${url_or_code}`,
      test(done, chinook, ok, /[A-Za-z0-9]{43}/i, (r: any) => (generated_secret = r))
    )
  })

  it(`should${ok ? '' : "n't"} add with secret`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `ADD WEBHOOK ${url_or_code}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}${mask ? ` MASK ${mask}` : ''}${options ? ` OPTIONS ${options}` : ''} SECRET ${secret}`,
      test(done, chinook, ok, secret)
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
          options: options ?? null,
          secret: secret
        },
        (r: any) => (id = r[r.length - 1].id)
      )
    )
  })

  it(`should${ok ? '' : "n't"} remove with secret`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE WEBHOOK ${id}`, test(done, chinook, ok))
  })

  it(`shouldn't list ${ok ? 'removed' : ''}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(done, chinook, false, {
        id: id,
        action: url_or_code,
        databasename: database,
        tablename: table,
        mask: mask,
        options: options ?? null,
        secret: secret
      })
    )
  })

  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `SET WEBHOOK ${id - 1}${url_or_code ? ` ACTION ${url_or_code}` : ''}${database ? ` DATABASE ${database}` : ''}${table ? ` TABLE ${table}` : ''}${mask ? ` MASK ${mask}` : ''}${options ? ` OPTIONS ${options}` : ''}`,
      test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} list set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST WEBHOOKS`,
      test(done, chinook, ok, {
        id: id - 1,
        action: url_or_code,
        databasename: database,
        tablename: table,
        mask: mask,
        options: options ?? null,
        secret: generated_secret
      })
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE WEBHOOK ${id - 1}`, test(done, chinook, ok))
  })
})

describe.each([
  ['test', true],
  [Number.MAX_VALUE, true],
  [_, false]
])('debug mask', (mask, ok) => {
  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET DEBUG MASK ${mask ?? ''}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE DEBUG MASK ${mask ?? ''}`, test(done, chinook, ok))
  })
})

describe.skip.each([
  ['test', Number.MAX_VALUE, true],
  ['//', '//', false]
])('env', (key, value, ok) => {
  it(`should${ok ? '' : "n't"} set`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SET ENV ${key} TO ${value}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} get`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`GET ENV ${key}`, test(done, chinook, ok, value))
  })

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ENV`,
      test(done, chinook, ok, {
        key: key,
        value: value
      })
    )
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE ENV KEY ${key}`, test(done, chinook, ok))
  })
})

describe.skip.each([
  [true, 2, '192.168.1.1:8860', '192.168.1.1:8860', true],
  [false, 0, '//', '//', false]
])('node', (learner, id, address, cluster, ok) => {
  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`ADD${learner ? ' LEARNER' : ''} NODE ${id} ADDRESS ${address}${cluster ? ` CLUSTER ${cluster}` : ''}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE NODE ${id}`, test(done, chinook, ok))
  })
})
