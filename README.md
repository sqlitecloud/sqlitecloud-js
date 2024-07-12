# @sqlitecloud/drivers

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![codecov](https://codecov.io/gh/sqlitecloud/sqlitecloud-js/graph/badge.svg?token=ZOKE9WFH62)](https://codecov.io/gh/sqlitecloud/sqlitecloud-js)

## Install

```bash
npm install @sqlitecloud/drivers
```

## Usage

```ts
import { Database } from '@sqlitecloud/drivers'

let database = new Database('sqlitecloud://user:password@xxx.sqlite.cloud:8860/chinook.sqlite')
// or use sqlitecloud://xxx.sqlite.cloud:8860?apikey=xxxxxxx

let name = 'Breaking The Rules'

let results = await database.sql`SELECT * FROM tracks WHERE name = ${name}`
// => returns [{ AlbumId: 1, Name: 'Breaking The Rules', Composer: 'Angus Young... }]
```

Use [Database.sql](https://sqlitecloud.github.io/sqlitecloud-js/classes/Database.html#sql) to execute prepared statements or plain SQL queries asynchronously. This method returns an array of rows for SELECT queries and supports the standard syntax for UPDATE, INSERT, and DELETE.

We aim for full compatibility with the established [sqlite3 API](https://www.npmjs.com/package/sqlite3), with the primary distinction being that our driver connects to SQLiteCloud databases. This allows you to migrate your [SQLite to the cloud](https://sqlitecloud.io) while continuing to use your existing codebase.

The package is developed entirely in TypeScript and is fully compatible with JavaScript. It doesn't require any native libraries. This makes it a straightforward and effective tool for managing cloud-based databases in a familiar SQLite environment.

## Publish / Subscribe (Pub/Sub)

```ts
import { Database } from '@sqlitecloud/drivers'
import { PubSub, PUBSUB_ENTITY_TYPE } from '@sqlitecloud/drivers/lib/drivers/pubsub'

let database = new Database('sqlitecloud://user:password@xxx.sqlite.cloud:8860/chinook.sqlite')
// or use sqlitecloud://xxx.sqlite.cloud:8860?apikey=xxxxxxx

const pubSub: PubSub = await database.getPubSub()

await pubSub.listen(PUBSUB_ENTITY_TYPE.TABLE, 'albums', (error, results, data) => {
  if (results) {
    // Changes on albums table will be received here as JSON object
    console.log('Received message:', results)
  }
})

await database.sql`INSERT INTO albums (Title, ArtistId) values ('Brand new song', 1)`

// Stop listening changes on the table
await pubSub.unlisten(PUBSUB_ENTITY_TYPE.TABLE, 'albums')
```

Pub/Sub is a messaging pattern that allows multiple applications to communicate with each other asynchronously. In the context of SQLiteCloud, Pub/Sub can be used to provide real-time updates and notifications to subscribed applications whenever data changes in the database or it can be used to send payloads (messages) to anyone subscribed to a channel.

Pub/Sub Documentation: [https://docs.sqlitecloud.io/docs/pub-sub](https://docs.sqlitecloud.io/docs/pub-sub)

## More

How do I deploy SQLite in the cloud?  
[https://sqlitecloud.io](https://sqlitecloud.io)

How do I connect SQLite cloud with Javascript?  
[https://sqlitecloud.github.io/sqlitecloud-js/](https://sqlitecloud.github.io/sqlitecloud-js/)

How can I contribute or suggest features?  
[https://github.com/sqlitecloud/sqlitecloud-js/issues](https://github.com/sqlitecloud/sqlitecloud-js/issues)

[build-img]: https://github.com/sqlitecloud/sqlitecloud-js/actions/workflows/build-test-deploy.yml/badge.svg
[build-url]: https://github.com/sqlitecloud/sqlitecloud-js/actions/workflows/build-test-deploy.yml
[downloads-img]: https://img.shields.io/npm/dt/@sqlitecloud/drivers
[downloads-url]: https://www.npmtrends.com/@sqlitecloud/drivers
[npm-img]: https://img.shields.io/npm/v/@sqlitecloud/drivers
[npm-url]: https://www.npmjs.com/package/@sqlitecloud/drivers
[issues-img]: https://img.shields.io/github/issues/sqlitecloud/sqlitecloud-js
[issues-url]: https://github.com/sqlitecloud/sqlitecloud-js/issues
