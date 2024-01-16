//
// Using sqlitecloud drivers with knex
//

import { knex } from 'knex'

const Client_SQLite3 = require('knex/lib/dialects/sqlite3')

// client will have sqlite3 dialect, but will use sqlitecloud-js driver
class Client_Libsql extends Client_SQLite3 {
  _driver() {
    return require('sqlitecloud-js')
  }
}

console.assert(process.env.CHINOOK_DATABASE_URL, 'Define CHINOOK_URL environment variable')

// create knex instance with sqlitecloud-js driver
// database url is passed as filename parameter
const db = knex({
  client: Client_Libsql as any,
  connection: {
    filename: process.env.CHINOOK_DATABASE_URL as string
  }
})

db.raw('select * from customers')
  .then(result => {
    console.log(`Connected to database via knex and received ${result.length} rows`)
    console.log(JSON.stringify(result, null, 2))
    db.destroy()
  })
  .catch(err => {
    console.error(err)
    db.destroy()
  })
