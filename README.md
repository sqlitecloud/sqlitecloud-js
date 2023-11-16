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
import { Database } from 'sqlitecloud-js'

let database = new Database('sqlitecloud://user:password@xxx.sqlite.cloud:8860/chinook.db')

let name = 'Breaking The Rules'

let results = await database.sql`SELECT * FROM tracks WHERE name = ${name}`
// => returns [{ AlbumId: 1, Name: 'Breaking The Rules', Composer: 'Angus Young... }]
```

Use `Database.sql` for executing both your prepared statements and plain SQL queries asynchronously. This method returns an array of rows for SELECT queries and supports the standard syntax for UPDATE, INSERT, and DELETE.

We aim for full compatibility with the established [sqlite3](https://www.npmjs.com/package/sqlite3) API, with the primary distinction being that our driver connects to SQLiteCloud databases. This allows you to migrate your local SQLite databases to the cloud while continuing to use your existing codebase.

The package is developed entirely in TypeScript and is fully compatible with JavaScript. It doesn't require any native libraries. This makes it a straightforward and effective tool for managing cloud-based databases in a familiar SQLite environment.

## API

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
[downloads-img]: https://img.shields.io/npm/dt/sqlitecloud-js
[downloads-url]: https://www.npmtrends.com/sqlitecloud-js
[npm-img]: https://img.shields.io/npm/v/sqlitecloud-js
[npm-url]: https://www.npmjs.com/package/sqlitecloud-js
[issues-img]: https://img.shields.io/github/issues/sqlitecloud/sqlitecloud-js
[issues-url]: https://github.com/sqlitecloud/sqlitecloud-js/issues
