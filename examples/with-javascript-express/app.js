//
// Using @sqlitecloud/drivers inside an Express app with Javascript
//

var sqlitecloud = require('@sqlitecloud/drivers')
require('dotenv').config()
var DATABASE_URL = process.env.DATABASE_URL
console.assert(DATABASE_URL, 'DATABASE_URL environment variable not set in .env')

var express = require('express')
var http = require('http')
var app = express()
app.use(express.json())

/* http://localhost:3001/ returns chinook tracks as json */
app.get('/', async function (req, res, next) {
  var database = new sqlitecloud.Database(DATABASE_URL)
  var tracks = await database.sql`USE DATABASE chinook.sqlite; SELECT * FROM tracks LIMIT 20;`
  res.send({ tracks })
})

const port = process.env.PORT || 3000
var server = http.createServer(app)
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`)
})

module.exports = app
