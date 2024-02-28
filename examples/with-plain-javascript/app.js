//
// Using @sqlitecloud/drivers with plain Javascript
//

var sqlitecloud = require('@sqlitecloud/drivers')

require('dotenv').config()
var DATABASE_URL = process.env.DATABASE_URL
console.assert(DATABASE_URL, 'DATABASE_URL environment variable not set in .env')

async function selectTracks() {
  // create a connection with sqlitecloud
  var database = new sqlitecloud.Database(DATABASE_URL)

  // run async query
  var tracks = await database.sql`USE DATABASE chinook.sqlite; SELECT * FROM tracks LIMIT 20;`
  console.log(`getTracks returned:`, tracks)

  // You can also use all the regular sqlite3 api with callbacks, see:
  // https://docs.sqlitecloud.io/docs/sdk/js/intro
}

void selectTracks()
