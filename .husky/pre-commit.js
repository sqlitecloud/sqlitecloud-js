//
// pre-commit.js - update version in package.json with day of the year before checkin
//

const fs = require('fs')
const path = require('path')

const packagePath = path.join(__dirname, '../package.json')
const package = require(packagePath)

const yearStart = new Date('2024-01-01').getTime()
const now = new Date().getTime()
const dayOfYear = Math.floor((now - yearStart) / (1000 * 60 * 60 * 24))

package.version = package.version.replace(/\.\d+$/, `.${dayOfYear}`)
fs.writeFileSync(packagePath, JSON.stringify(package, null, 2))
