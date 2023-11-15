# sqlitecloud-js

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![codecov](https://codecov.io/gh/sqlitecloud/sqlitecloud-js/graph/badge.svg?token=ZOKE9WFH62)](https://codecov.io/gh/sqlitecloud/sqlitecloud-js)

> This is the future home of SQLiteCloud drivers for Javascript and Typescript v2  
> Currently under development, please open an issue for any problems, suggestions.

## Install

```bash
npm install sqlitecloud-js
```

## Usage

```ts
// import sqlitecloud driver
import { Database } from 'sqlitecloud-js'

// trivial example here but let's suppose we have this in a variable
let name = 'Ava Jones'

// run our prepared statement (or plain sql) with familiar print syntax
let results = await database.sql`SELECT * FROM people WHERE name = ${name}`
// => returns [{ id: 5, name: 'Ava Jones', age: 22, hobby: 'Time traveling' }]
```

## API

We are striving to be 100% compatibile with the widely used sqlite3 APIs, the difference being that this driver connects to your SQLiteCloud database. You can take you local SQLite, deploy in the cloud and keep using the same code. Easy! You can also use Database.sql to run an async query.

### myPackage(input, options?)

#### input

Type: `string`

Lorem ipsum.

#### options

Type: `object`

##### postfix

Type: `string`
Default: `rainbows`

Lorem ipsum.

[build-img]: https://github.com/ryansonshine/typescript-npm-package-template/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/ryansonshine/typescript-npm-package-template/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/typescript-npm-package-template
[downloads-url]: https://www.npmtrends.com/typescript-npm-package-template
[npm-img]: https://img.shields.io/npm/v/typescript-npm-package-template
[npm-url]: https://www.npmjs.com/package/typescript-npm-package-template
[issues-img]: https://img.shields.io/github/issues/sqlitecloud/sqlitecloud-js
[issues-url]: https://github.com/sqlitecloud/sqlitecloud-js/issues
