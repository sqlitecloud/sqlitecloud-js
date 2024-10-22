/**
 * reserved-commands.test.ts - test sqlitecloud reserved commands
 */

import {
  _,
  getConnection,
  test,
  CHINOOK_API_KEY,
  date,
  parseconnectionstring,
  CHINOOK_DATABASE_URL,
  uuid,
  ip,
  randomBool,
  randomDate,
  randomName
} from './shared'
import fs from 'fs'
import path from 'path'

//jest.retryTimes(3)

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
  let id = 0

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

describe('command debug', () => {
  for (let i = -5; i < 10; i++) {
    let ok = false
    if (i > 0 && i < 5) ok = true
    it(`should${ok ? '' : "n't"} command debug`, done => {
      const chinook = getConnection()
      chinook.sendCommands(
        `COMMAND DEBUG ${i}`,
        test(
          done,
          chinook,
          true,
          ok
            ? {
                id: expect.any(Number),
                address: ip(),
                port: expect.any(Number),
                nodeid: expect.any(Number),
                username: parseconnectionstring(CHINOOK_DATABASE_URL).username,
                database: parseconnectionstring(CHINOOK_DATABASE_URL).database,
                uuid: uuid(),
                ptr: expect.stringMatching(/^0x[a-z0-9]{12}/),
                connection_date: date(),
                last_activity: date(),
                forward: expect.any(Number),
                userid: expect.any(Number),
                exp: i != 2 ? undefined : expect.any(Number),
                dnow: i == 2 ? undefined : i == 4 ? expect.any(String) : expect.any(Number),
                last: i == 2 || i == 4 ? undefined : expect.any(Number),
                dlast: i != 4 ? undefined : expect.any(String),
                diff: i == 2 ? undefined : expect.any(Number)
              }
            : 'OK'
        )
      )
    })
  }
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
  [true, 2, '192.168.1.1:8860', '192.168.1.1:8860', true]
  //[false, 0, '//', '//', false]
])('node', (learner, id, address, cluster, ok) => {
  it(`should${ok ? '' : "n't"} add`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`ADD${learner ? ' LEARNER' : ''} NODE ${id} ADDRESS ${address}${cluster ? ` CLUSTER ${cluster}` : ''}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} list`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST NODES`,
      test(done, chinook, ok, {
        id: id,
        node: address,
        cluster: cluster,
        status: learner ? 'Learner' : 'Leader',
        progress: expect.stringMatching(/(replicate|probe)/i),
        match: expect.any(Number),
        last_activity: expect.any(String) //date()
      })
    )
  })

  it.skip(`should${ok ? '' : "n't"} auth`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`AUTH CLUSTER ${id} ${CHINOOK_API_KEY}`, test(done, chinook, ok))
  })

  it.skip(`should${ok ? '' : "n't"} promote`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`PROMOTE NODE ${id}`, test(done, chinook, ok))
  })

  it(`should${ok ? '' : "n't"} remove`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`REMOVE NODE ${id}`, test(done, chinook, ok))
  })
})

describe('list', () => {
  it.skip(`should list compile options`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST COMPILE OPTIONS`,
      test(done, chinook, true, [
        { compile_options: 'ATOMIC_INTRINSICS=1' },
        { compile_options: 'CODEC=see-aes256-ofb' },
        { compile_options: 'COMPILER=gcc-12.2.0' },
        { compile_options: 'DEFAULT_AUTOVACUUM' },
        { compile_options: 'DEFAULT_CACHE_SIZE=-2000' },
        { compile_options: 'DEFAULT_FILE_FORMAT=4' },
        { compile_options: 'DEFAULT_FOREIGN_KEYS' },
        { compile_options: 'DEFAULT_JOURNAL_SIZE_LIMIT=-1' },
        { compile_options: 'DEFAULT_MMAP_SIZE=0' },
        { compile_options: 'DEFAULT_PAGE_SIZE=4096' },
        { compile_options: 'DEFAULT_PCACHE_INITSZ=20' },
        { compile_options: 'DEFAULT_RECURSIVE_TRIGGERS' },
        { compile_options: 'DEFAULT_SECTOR_SIZE=4096' },
        { compile_options: 'DEFAULT_SYNCHRONOUS=2' },
        { compile_options: 'DEFAULT_WAL_AUTOCHECKPOINT=1000' },
        { compile_options: 'DEFAULT_WAL_SYNCHRONOUS=2' },
        { compile_options: 'DEFAULT_WORKER_THREADS=0' },
        { compile_options: 'DIRECT_OVERFLOW_READ' },
        { compile_options: 'ENABLE_COLUMN_METADATA' },
        { compile_options: 'ENABLE_DBPAGE_VTAB' },
        { compile_options: 'ENABLE_FTS3' },
        { compile_options: 'ENABLE_FTS3_PARENTHESIS' },
        { compile_options: 'ENABLE_FTS3_TOKENIZER' },
        { compile_options: 'ENABLE_FTS4' },
        { compile_options: 'ENABLE_FTS5' },
        { compile_options: 'ENABLE_GEOPOLY' },
        { compile_options: 'ENABLE_LOAD_EXTENSION' },
        { compile_options: 'ENABLE_MATH_FUNCTIONS' },
        { compile_options: 'ENABLE_NORMALIZE' },
        { compile_options: 'ENABLE_PREUPDATE_HOOK' },
        { compile_options: 'ENABLE_RTREE' },
        { compile_options: 'ENABLE_SESSION' },
        { compile_options: 'ENABLE_SNAPSHOT' },
        { compile_options: 'ENABLE_STMT_SCANSTATUS' },
        { compile_options: 'ENABLE_ZIPVFS' },
        { compile_options: 'HAS_CODEC' },
        { compile_options: 'MALLOC_SOFT_LIMIT=1024' },
        { compile_options: 'MAX_ATTACHED=10' },
        { compile_options: 'MAX_COLUMN=2000' },
        { compile_options: 'MAX_COMPOUND_SELECT=500' },
        { compile_options: 'MAX_DEFAULT_PAGE_SIZE=8192' },
        { compile_options: 'MAX_EXPR_DEPTH=1000' },
        { compile_options: 'MAX_FUNCTION_ARG=127' },
        { compile_options: 'MAX_LENGTH=1000000000' },
        { compile_options: 'MAX_LIKE_PATTERN_LENGTH=50000' },
        { compile_options: 'MAX_MMAP_SIZE=0x7fff0000' },
        { compile_options: 'MAX_PAGE_COUNT=0xfffffffe' },
        { compile_options: 'MAX_PAGE_SIZE=65536' },
        { compile_options: 'MAX_SQL_LENGTH=1000000000' },
        { compile_options: 'MAX_TRIGGER_DEPTH=1000' },
        { compile_options: 'MAX_VARIABLE_NUMBER=32766' },
        { compile_options: 'MAX_VDBE_OP=250000000' },
        { compile_options: 'MAX_WORKER_THREADS=8' },
        { compile_options: 'MUTEX_PTHREADS' },
        { compile_options: 'OMIT_AUTOINIT' },
        { compile_options: 'OMIT_DEPRECATED' },
        { compile_options: 'OMIT_TCL_VARIABLE' },
        { compile_options: 'SYSTEM_MALLOC' },
        { compile_options: 'TEMP_STORE=1' },
        { compile_options: 'THREADSAFE=1' }
      ])
    )
  }, 15000)

  it.skip(`should list only reserved commands`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ONLY RESERVED COMMANDS`,
      test(done, chinook, true, [
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>] SECRET <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'ADD [LEARNER] NODE <nodeid> ADDRESS <ip_address:port> [CLUSTER <ip_address:port>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'AUTH APIKEY <key>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'AUTH CLUSTER <node_id> <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'AUTH USER <username> HASH <hashed_password>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP FINISH <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP INIT [<dest_name>] [SOURCE <source_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP PAGECOUNT <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP REMAINING <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BACKUP STEP <index> PAGES <npages>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB BYTES <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB CLOSE <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB OPEN <database_name> TABLE <table_name> COLUMN <column_name> ROWID <rowid> RWFLAG <rwflag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB READ <index> SIZE <size> OFFSET <offset>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB REOPEN <index> ROWID <rowid>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'BLOB WRITE <index> OFFSET <offset> DATA <data>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'COMMAND DEBUG <debug_code>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'COUNT LOG [FROM <start_date>] [TO <end_date>] [LEVEL <log_level>] [TYPE <log_type>] [ID] [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'CREATE APIKEY USER <username> NAME <key_name> [EXPIRATION <expiration_date>] KEY <apikey>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE CACHEFLUSH',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'DATABASE ERRNO', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'DATABASE FILENAME <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE GET CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE GET ROWID',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE GET TOTAL CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE LIMIT <id> [VALUE <value>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE NAME <db_index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE READONLY <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'DATABASE TXNSTATE [<schema_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'DOWNLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'DOWNLOAD DATABASE <database_name> [IF EXISTS]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'DOWNLOAD STEP', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'GET CONNECTION STATUS',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'HELP <<command>>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'LIST COMPILE OPTIONS',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'LIST LATENCY KEY <keyname> [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'LIST LATENCY [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'LIST WEBHOOKS', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'LIST [ONLY] RESERVED COMMANDS [DETAILED]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'LOAD DATABASE <database_name> [KEY <encryption_key>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'PAUTH <uuid> <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'PROMOTE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'PUBSUB ONLY', count: expect.any(Number), avgtime: expect.any(Number) },
        { command: 'QUIT SERVER', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'REMOVE DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'REMOVE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'REMOVE WEBHOOK <webhook_id>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'RESERVE DATABASE <database_name> UUID <uuid_value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SET DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SET USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SET WEBHOOK <webhook_id> [ACTION <url_or_code>] [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SQLITE RANDOMNESS <n> [RESET]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SQLITE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SWITCH APIKEY <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SWITCH DATABASE <database_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'SWITCH USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'TRANSFER DATABASE <database_name> [KEY <encryption_key>] [SNAPSHOT <snapshot_value>] [INTERNAL]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'UNRESERVE DATABASE <database_name> [UUID]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'UPLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'UPLOAD DATABASE <database_name> [KEY <encryption_key>] [REPLACE]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VERIFY USER <username> PASSWORD <password> [IP <ip_address>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM BIND <vmindex> TYPE <type> COLUMN <column> VALUE <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM CLEAR <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'VM COMPILE <sql>', count: expect.any(Number), avgtime: expect.any(Number) },
        { command: 'VM EXECUTE <sql>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'VM FINALIZE <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'VM LIST <vmindex>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'VM PARAMETER <vmindex> INDEX <name>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM PARAMETER <vmindex> NAME <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM SCAN STATUS <vmindex> INDEX <loop_index> OP <op>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM SCAN STATUS RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        { command: 'VM SQL <vmindex>', count: expect.any(Number), avgtime: expect.any(Number) },
        {
          command: 'VM STATUS <vmindex> OP <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        },
        {
          command: 'VM STEP <vmindex> [<flag>]',
          count: expect.any(Number),
          avgtime: expect.any(Number)
        }
      ])
    )
  })

  it.skip(`should list only reserved commands detailed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST ONLY RESERVED COMMANDS DETAILED`,
      test(done, chinook, true, [
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'ADD WEBHOOK <url_or_code> [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>] SECRET <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'ADD [LEARNER] NODE <nodeid> ADDRESS <ip_address:port> [CLUSTER <ip_address:port>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'AUTH APIKEY <key>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'AUTH CLUSTER <node_id> <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'AUTH USER <username> HASH <hashed_password>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP FINISH <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP INIT [<dest_name>] [SOURCE <source_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP PAGECOUNT <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP REMAINING <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BACKUP STEP <index> PAGES <npages>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB BYTES <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB CLOSE <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB OPEN <database_name> TABLE <table_name> COLUMN <column_name> ROWID <rowid> RWFLAG <rwflag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB READ <index> SIZE <size> OFFSET <offset>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB REOPEN <index> ROWID <rowid>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'BLOB WRITE <index> OFFSET <offset> DATA <data>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'COMMAND DEBUG <debug_code>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'COUNT LOG [FROM <start_date>] [TO <end_date>] [LEVEL <log_level>] [TYPE <log_type>] [ID] [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'CREATE APIKEY USER <username> NAME <key_name> [EXPIRATION <expiration_date>] KEY <apikey>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE CACHEFLUSH',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'DATABASE ERRNO', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'DATABASE FILENAME <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE GET CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE GET ROWID',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE GET TOTAL CHANGES',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE LIMIT <id> [VALUE <value>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE NAME <db_index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE READONLY <db_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'DATABASE TXNSTATE [<schema_name>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'DOWNLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'DOWNLOAD DATABASE <database_name> [IF EXISTS]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'DOWNLOAD STEP', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'GET CONNECTION STATUS',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'HELP <<command>>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'LIST COMPILE OPTIONS',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'LIST LATENCY KEY <keyname> [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'LIST LATENCY [NODE <nodeid>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'LIST WEBHOOKS', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'LIST [ONLY] RESERVED COMMANDS [DETAILED]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'LOAD DATABASE <database_name> [KEY <encryption_key>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'PAUTH <uuid> <secret>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'PROMOTE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'PUBSUB ONLY', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        { command: 'QUIT SERVER', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'REMOVE DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'REMOVE NODE <nodeid>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'REMOVE WEBHOOK <webhook_id>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'RESERVE DATABASE <database_name> UUID <uuid_value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SET DEBUG MASK <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SET USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SET WEBHOOK <webhook_id> [ACTION <url_or_code>] [DATABASE <database_name>] [TABLE <table_name>] [MASK <mask>] [OPTIONS <options>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SQLITE RANDOMNESS <n> [RESET]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SQLITE STATUS <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SWITCH APIKEY <key>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SWITCH DATABASE <database_name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'SWITCH USER <username>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'TRANSFER DATABASE <database_name> [KEY <encryption_key>] [SNAPSHOT <snapshot_value>] [INTERNAL]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'UNRESERVE DATABASE <database_name> [UUID]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'UPLOAD ABORT', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'UPLOAD DATABASE <database_name> [KEY <encryption_key>] [REPLACE]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VERIFY USER <username> PASSWORD <password> [IP <ip_address>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM BIND <vmindex> TYPE <type> COLUMN <column> VALUE <value>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM CLEAR <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'VM COMPILE <sql>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        { command: 'VM EXECUTE <sql>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'VM FINALIZE <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'VM LIST <vmindex>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'VM PARAMETER <vmindex> INDEX <name>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM PARAMETER <vmindex> NAME <index>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM SCAN STATUS <vmindex> INDEX <loop_index> OP <op>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM SCAN STATUS RESET <vmindex>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        { command: 'VM SQL <vmindex>', count: expect.any(Number), avgtime: expect.any(Number), privileges: expect.anything() },
        {
          command: 'VM STATUS <vmindex> OP <op> RESET <reset_flag>',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        },
        {
          command: 'VM STEP <vmindex> [<flag>]',
          count: expect.any(Number),
          avgtime: expect.any(Number),
          privileges: expect.anything()
        }
      ])
    )
  })

  it(`should list reserved commands`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST RESERVED COMMANDS`,
      test(done, chinook, true, {
        command: expect.any(String),
        count: expect.any(Number),
        avgtime: expect.any(Number)
      })
    )
  })

  it(`should list reserved commands detailed`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `LIST RESERVED COMMANDS DETAILED`,
      test(done, chinook, true, {
        command: expect.any(String),
        count: expect.any(Number),
        avgtime: expect.any(Number),
        privileges: expect.any(String)
      })
    )
  })

  it(`should get help`, done => {
    //to be implemented
    const chinook = getConnection()
    chinook.sendCommands(`HELP <<command>>`, test(done, chinook, true))
  })
})

describe('connection', () => {
  it(`should get connection status`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `GET CONNECTION STATUS`,
      test(done, chinook, true, [parseconnectionstring(CHINOOK_DATABASE_URL).username, parseconnectionstring(CHINOOK_DATABASE_URL).database, 0, 0])
    )
  }, 15000)
})

describe.each([
  ['chinook.sqlite', true],
  [_, false]
])('download database', (database, ok) => {
  it(`should${ok ? '' : "n't"} download database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DOWNLOAD DATABASE ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??
            r.forEach((v: number) => expect(v).toBeGreaterThan(0))
            for (let i = 0; i < r.length - 1; i++) {
              chinook.sendCommands(
                `DOWNLOAD STEP`,
                i != r.length - 2
                  ? (e, r) => {
                      expect(e).toBeNull()
                      expect(r).toBeInstanceOf(Buffer)
                    }
                  : test(done, chinook, ok, expect.any(Buffer))
              )
            }
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} abort download database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DOWNLOAD DATABASE ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)])
            r.forEach((v: number) => expect(v).toBeGreaterThan(0))

            chinook.sendCommands(`DOWNLOAD STEP`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Buffer)
              chinook.sendCommands(`DOWNLOAD ABORT`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toEqual('OK')
                chinook.sendCommands(`DOWNLOAD STEP`, test(done, chinook, ok))
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should download database if exists${ok ? '' : " (it doesn't exist)"}`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `DOWNLOAD DATABASE ${database} IF EXISTS`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)])
            r.forEach((v: number) => expect(v).toBeGreaterThan(0))
            for (let i = 0; i < r.length - 1; i++) {
              chinook.sendCommands(
                `DOWNLOAD STEP`,
                i != r.length - 2
                  ? (e, r) => {
                      expect(e).toBeNull()
                      expect(r).toBeInstanceOf(Buffer)
                    }
                  : test(done, chinook, ok, expect.any(Buffer))
              )
            }
          }
        : (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([0, 0, expect.any(Number)])
            chinook.sendCommands(`DOWNLOAD STEP`, test(done, chinook, ok))
          }
    )
  })
})

describe('database commands', () => {
  it(`should do a cache flush`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE CACHEFLUSH`, test(done, chinook, true))
  })

  it(`should get error number`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE ERRNO`, test(done, chinook, true, 0))
  })

  it(`should get changes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE GET CHANGES`, test(done, chinook, true, 0))
  })

  it(`should get rowid`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE GET ROWID`, test(done, chinook, true, 0))
  })

  it(`should get total changes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`DATABASE GET TOTAL CHANGES`, test(done, chinook, true, 0))
  })

  for (let i = -5; i < 10; i++) {
    let ok = false
    if (i >= 0 && i < 2) ok = true
    it(`should${ok ? '' : "n't"} get database name`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE NAME ${i}`, test(done, chinook, ok, /[a-z]/))
    })
  }

  ;[
    [0, true],
    [Number.MAX_VALUE, true],
    [Number.MIN_VALUE, true]
  ].forEach(([n, ok]) => {
    it(`should${ok ? '' : "n't"} get database status ${n}`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE STATUS ${n} RESET ${n}`, test(done, chinook, ok as boolean, 3))
    })
  })
  ;[
    ['main', true],
    [_, false]
  ].forEach(([db_name, ok]) => {
    it(`should${ok ? '' : "n't"} get database filename`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE FILENAME ${db_name}`, test(done, chinook, ok as boolean, '/data/8860/databases/chinook.sqlite'))
    })

    it(`should${ok ? '' : "n't"} get if database is read-only`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE READONLY ${db_name}`, test(done, chinook, ok as boolean, 0)) // https://www.sqlite.org/c3ref/db_readonly.html
    })

    it(`should${ok ? '' : "n't"} get database txnstate`, done => {
      const chinook = getConnection()
      chinook.sendCommands(`DATABASE TXNSTATE ${db_name}`, test(done, chinook, ok as boolean, 0)) // https://www.sqlite.org/c3ref/c_txn_none.html
    })
  })

  for (let i = -5; i < 20; i++) {
    let ok = false
    if (i >= 0 && i <= 11) ok = true
    it(`should${ok ? '' : "n't"} get databases limit ${i}`, done => {
      const chinook = getConnection()
      chinook.sendCommands(
        `DATABASE LIMIT ${i == 7 || i == 11 ? `${i} VALUE ${i}` : i}`,
        test(done, chinook, ok, ok && i != 7 && i != 11 ? expect.any(Number) : 0)
      )
    })
  }
})

describe('pubsub', () => {
  it(`should do pubsub only`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`PUBSUB ONLY`, (e, r) => {
      expect(e).toBeNull()
      expect(r).toEqual('OK')
      chinook.sendCommands(`LIST DATABASES`, test(done, chinook, false))
    })
  })
})

describe.each([
  [0, true],
  [1, true],
  [Number.MAX_VALUE, true],
  [Number.MIN_VALUE, true]
])('sqlite commands', (n, ok) => {
  it(`should set sqlite randomness`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SQLITE RANDOMNESS ${n}`, test(done, chinook, ok, n ? expect.any(Buffer) : null))
  })

  it(`should set sqlite randomness and reset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SQLITE RANDOMNESS ${n} RESET`, test(done, chinook, ok))
  })

  it(`should get sqlite status and reset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`SQLITE STATUS ${n} RESET ${n}`, test(done, chinook, ok, 3))
  })
})

describe.each([
  [_, _, _, _, randomBool(), _, true],
  [_, _, 9, _, randomBool(), _, true],
  [_, _, _, 9, randomBool(), _, true],
  [randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), _, _, _, randomBool(), _, true],
  [_, randomDate(), _, _, randomBool(), 999, false],
  [randomDate(new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()), randomDate(), _, _, randomBool(), 1, true]
])('logs', (from, to, level, type, id, node, ok) => {
  it(`should${ok ? '' : "n't"} count log`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `COUNT LOG${from ? ` FROM "${from}"` : ''}${to ? ` TO "${to}"` : ''}${level ? ` LEVEL ${level}` : ''}${type ? ` TYPE ${type}` : ''}${id ? ' ID' : ''}${node ? ` NODE ${node}` : ''}`,
      test(done, chinook, ok, expect.any(Object))
    )
  })
})

describe.each([
  [0, true],
  [1, true],
  [Number.MAX_VALUE, false],
  [Number.MIN_VALUE, false]
])('latency', (node, ok) => {
  it(`should${ok ? '' : "n't"} list latency empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY`, test(done, chinook, true, []))
  })

  it(`should${ok ? '' : "n't"} list latency of node empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY NODE ${node}`, test(done, chinook, ok, []))
  })

  it(`should${ok ? '' : "n't"} list latency key empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY KEY ${_}`, test(done, chinook, true, []))
  })

  it(`should${ok ? '' : "n't"} list latency of node empty`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`LIST LATENCY KEY ${_} NODE ${node}`, test(done, chinook, ok, []))
  })
})

describe.each([
  ['main', true],
  [_, false]
])('backup database', (database, ok) => {
  it(`should${ok ? '' : "n't"} backup database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BACKUP INIT ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??

            chinook.sendCommands(`BACKUP STEP 0 PAGES ${r[3]}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)

              chinook.sendCommands(`BACKUP REMAINING 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe(0)
                chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r[0]).toBe(42)
                  test(done, chinook, ok, 3)(e, r)
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} finish early backup database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BACKUP INIT ${database}`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)])

            chinook.sendCommands(`BACKUP STEP 0 PAGES 1`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)
              chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toEqual([42, 0, 0])
                chinook.sendCommands(`BACKUP STEP 0 PAGES 1`, test(done, chinook, false)) //should return error already deallocated
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it.skip(`should${ok ? '' : "n't"} backup database to source with unsupported attach`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `CREATE DATABASE source_db IF NOT EXISTS; ATTACH DATABASE source_db AS source; BACKUP INIT ${database} SOURCE source`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??

            chinook.sendCommands(`BACKUP STEP 0 PAGES ${r[3]}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)

              chinook.sendCommands(`BACKUP REMAINING 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe(0)
                chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r[0]).toBe(42)
                  expect(r).toHaveLength(3)
                  chinook.sendCommands(`DETACH DATABASE source_db`, test(done, chinook, ok))
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} backup database to source`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BACKUP INIT ${database} SOURCE temp`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual([expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number)]) //could fail??

            chinook.sendCommands(`BACKUP STEP 0 PAGES ${r[3]}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBeInstanceOf(Array)

              chinook.sendCommands(`BACKUP REMAINING 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe(0)
                chinook.sendCommands(`BACKUP FINISH 0`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r[0]).toBe(42)
                  test(done, chinook, ok, 3)(e, r)
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })
})

describe.each([
  ['main', 'artists', 'Name', 5, true],
  [_, _, _, _, false]
])('blob', (database, table, column, bytes, ok) => {
  it(`should${ok ? '' : "n't"} open blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${bytes} OFFSET 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBeInstanceOf(Buffer)
                expect(r).toHaveLength(bytes as number)

                chinook.sendCommands(`BLOB CLOSE ${index}`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r).toBe('OK')

                  //check if slot 0 was already deallocated
                  chinook.sendCommands(`BLOB READ ${index} SIZE ${Math.trunc((bytes as number) / 2)} OFFSET 0`, test(done, chinook, false))
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} finish early blob read`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${Math.trunc((bytes as number) / 2)} OFFSET 0`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBeInstanceOf(Buffer)
                expect(r).toHaveLength(Math.trunc(bytes ? bytes / 2 : 0))

                chinook.sendCommands(`BLOB CLOSE ${index}`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r).toBe('OK')

                  //check if slot 0 was already deallocated
                  chinook.sendCommands(`BLOB READ ${index} SIZE ${Math.trunc((bytes as number) / 2)} OFFSET 0`, test(done, chinook, false))
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} open blob and size fail`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${(bytes as number) + 1} OFFSET 0`, test(done, chinook, false))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail reading blob bytes`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index + 1}`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail closing blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB CLOSE ${index + 1}`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail reading blob`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB READ ${index + 1} SIZE 1 OFFSET 0`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} open blob and offset fail`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB READ ${index} SIZE ${bytes as number} OFFSET ${(bytes as number) + 1}`, test(done, chinook, false))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} change blob rowid by reopening`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(bytes)

              chinook.sendCommands(`BLOB REOPEN ${index} ROWID 2`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe('OK')

                chinook.sendCommands(`BLOB BYTES ${index}`, (e, r) => {
                  expect(e).toBeNull()
                  expect(r).not.toBe(bytes)

                  chinook.sendCommands(`BLOB CLOSE ${index}`, (e, r) => {
                    expect(e).toBeNull()
                    expect(r).toBe('OK')

                    //try to reopen closed slot should fail
                    chinook.sendCommands(`BLOB REOPEN ${index} ROWID 3`, test(done, chinook, false))
                  })
                })
              })
            })
          }
        : test(done, chinook, ok)
    )
  })

  it.skip(`should${ok ? '' : "n't"} fail to write on a ro db`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 0`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
              expect(r).toBeUndefined()
              expect(e && e.message).toMatch(/attempt to write a readonly database/i)

              chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok)) //tofix shouldn't throw error
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} write`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe('OK')

              chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail to write`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index + 1} OFFSET 0 DATA 12`, test(done, chinook, false))
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} write with offset`, done => {
    const chinook = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 3 DATA 12`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe('OK')

              chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok))
            })
          }
        : test(done, chinook, ok)
    )
  })

  it(`should${ok ? '' : "n't"} fail double writing`, done => {
    const chinook = getConnection()
    const chinook2 = getConnection()
    chinook.sendCommands(
      `BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`,
      ok
        ? (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual(0)
            let index = r

            chinook.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe('OK')
            })

            chinook2.sendCommands(`BLOB OPEN ${database} TABLE ${table} COLUMN ${column} ROWID 1 RWFLAG 1`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toBe(index)

              chinook2.sendCommands(`BLOB WRITE ${index} OFFSET 0 DATA 12`, (e, r) => {
                expect(r).toBeUndefined()
                expect(e && e.message).toMatch(/database is locked/i)
              })

              chinook2.close()
            })

            chinook.sendCommands(`BLOB CLOSE ${index}`, test(done, chinook, ok))
          }
        : chinook2.close() && test(done, chinook, ok)
    )
  })
})

describe.each([
  ['northwind.db', true]
  //[_, false]
])('upload database', (database, ok) => {
  it(`should fail to start upload database`, done => {
    const chinook = getConnection()
    chinook.sendCommands(`UPLOAD DATABASE chinook.sqlite`, test(done, chinook, false))
  })

  //fails because we need to handle blobs in the driver
  it.skip(`should${ok ? '' : "n't"} upload database`, async () => {
    const chinook = getConnection()

    const upload_database = await chinook.sql(`UPLOAD DATABASE ${database} REPLACE`)
    expect(upload_database).toBe('OK')
    console.log('UPLOAD DATABASE', upload_database)

    const fileStream = fs.createReadStream(path.join(__dirname, '../assets/', database as string))

    async function uploader(connection: any, sql: string | ArrayBuffer): Promise<unknown> {
      return await new Promise((resolve, reject) => {
        // console.debug(`sendCommandsAsync - ${sql}`)
        connection.sendCommands([sql], (error: Error | null, results: any) => {
          console.log('uploader', error, results)
          // Explicitly type the 'error' parameter as 'Error'
          if (error) {
            reject(error)
          } else {
            // console.debug(JSON.stringify(results).substring(0, 140) + '...')
            resolve(results)
          }
        })
      })
    }

    let chunk
    for await (chunk of fileStream) {
      console.log(chunk.buffer)
      const upload_chunk = await uploader(chinook, chunk.buffer)
      expect(upload_chunk).toBe('OK')
    }

    fileStream.close()

    const close_upload = await uploader(chinook, new ArrayBuffer(0))
    expect(close_upload).toBe('OK')

    const list_databases = await chinook.sql(`LIST DATABASES DETAILED`)
    expect(list_databases).toContainEqual({
      size: expect.any(Number),
      name: database,
      connections: 0,
      encryption: expect.any(String),
      backup: 0,
      nread: 0,
      nwrite: 0,
      inbytes: 0,
      outbytes: 0,
      fragmentation: 0.0,
      pagesize: 1024,
      encoding: 'UTF-8',
      status: 1
    })

    chinook.close()
  }, 60000)

  it(`should reserve and unreserve database`, done => {
    const chinook = getConnection()
    const rsrvd_db_test = randomName()
    chinook.sendCommands(`RESERVE DATABASE ${rsrvd_db_test} UUID ${rsrvd_db_test}`, (e, r) => {
      expect(e).toBeNull()
      expect(r).toBe('OK')

      chinook.sendCommands(`UPLOAD DATABASE ${rsrvd_db_test}`, (e, r) => {
        expect(r).toBeUndefined()
        expect(e && e.message).toMatch(/is reserved and cannot be uploaded/i)

        chinook.sendCommands(`UPLOAD ABORT`, (e, r) => {
          expect(e).toBeNull()
          expect(r).toEqual('OK')

          chinook.sendCommands(`UPLOAD DATABASE ${rsrvd_db_test}`, (e, r) => {
            expect(r).toBeUndefined()
            expect(e && e.message).toMatch(/is reserved and cannot be uploaded/i)

            chinook.sendCommands(`UNRESERVE DATABASE ${rsrvd_db_test} UUID`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toEqual('OK')

              chinook.sendCommands(`UPLOAD DATABASE ${rsrvd_db_test}`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe('OK')

                chinook.sendCommands(`UPLOAD ABORT`, test(done, chinook, true))
              })
            })
          })
        })
      })
    })
  })

  it(`should try multiple database transfers`, done => {
    const chinook = getConnection()
    const rsrvd_db_test = randomName()
    chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test}`, (e, r) => {
      expect(e).toBeNull()
      expect(r).toBe('OK')

      chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test} INTERNAL`, (e, r) => {
        expect(r).toBeUndefined()
        expect(e && e.message).toMatch(/another upload operation is in place/i)

        chinook.sendCommands(`UPLOAD ABORT`, (e, r) => {
          expect(e).toBeNull()
          expect(r).toEqual('OK')

          chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test} INTERNAL`, (e, r) => {
            expect(e).toBeNull()
            expect(r).toEqual('OK')

            chinook.sendCommands(`UPLOAD ABORT`, (e, r) => {
              expect(e).toBeNull()
              expect(r).toEqual('OK')

              chinook.sendCommands(`TRANSFER DATABASE ${rsrvd_db_test} KEY ${rsrvd_db_test} INTERNAL`, (e, r) => {
                expect(e).toBeNull()
                expect(r).toBe('OK')

                chinook.sendCommands(`UPLOAD ABORT`, test(done, chinook, true))
              })
            })
          })
        })
      })
    })
  })
})

describe('vm commands', () => {
  it(`should vm execute`, async () => {
    const chinook = getConnection()
    expect(await chinook.sql(`VM EXECUTE "SELECT * FROM artists"`)).toContainEqual({
      ArtistId: 3,
      Name: 'Aerosmith'
    })
    chinook.close()
  })

  it(`should vm compile`, async () => {
    const chinook = getConnection()
    const result = await chinook.sql(`VM COMPILE "SELECT * FROM artists"`)
    expect(result[0]).toBe(21)
    expect(result[7]).toBe(0)
    chinook.close()
  })
})
