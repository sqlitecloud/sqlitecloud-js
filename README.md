# @sqlitecloud/drivers

[![npm package][npm-img]][npm-url]
[![Test][test-img]][test-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![codecov](https://codecov.io/gh/sqlitecloud/sqlitecloud-js/graph/badge.svg?token=ZOKE9WFH62)](https://codecov.io/gh/sqlitecloud/sqlitecloud-js)

## Install

```bash
npm install @sqlitecloud/drivers
```

## React Native / Expo Install

You also have to install Peer Dependencies

```bash
npm install @sqlitecloud/drivers react-native-tcp-socket react-native-quick-base64
```

React Native run iOS

```bash
cd ios && pod install && cd .. && npm run ios
```

React Native run Android (without ./ in Windows)

```bash
cd android && ./gradlew clean build && cd .. && npm run android
```

Expo run iOS

```bash
npx expo prebuild && npx expo run:ios
```

Expo run Android

```bash
npx expo prebuild && npx expo run:android
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

## Examples

Check out all the supported platforms with related examples [here](https://github.com/sqlitecloud/sqlitecloud-js/tree/main/examples)!

## More

How do I deploy SQLite in the cloud?  
[https://sqlitecloud.io](https://sqlitecloud.io)

How do I connect SQLite cloud with Javascript?  
[https://sqlitecloud.github.io/sqlitecloud-js/](https://sqlitecloud.github.io/sqlitecloud-js/)

How can I contribute or suggest features?  
[https://github.com/sqlitecloud/sqlitecloud-js/issues](https://github.com/sqlitecloud/sqlitecloud-js/issues)

[test-img]: https://img.shields.io/github/actions/workflow/status/sqlitecloud/sqlitecloud-js/test.yml?label=Android%20%7C%20iOS%20%7C%20Web%20%7C%20Windows%20%7C%20MacOS%20%7C%20Linux
[test-url]: https://github.com/sqlitecloud/sqlitecloud-js/actions/workflows/test.yml
[downloads-img]: https://img.shields.io/npm/dt/@sqlitecloud/drivers
[downloads-url]: https://www.npmtrends.com/@sqlitecloud/drivers
[npm-img]: https://img.shields.io/npm/v/@sqlitecloud/drivers
[npm-url]: https://www.npmjs.com/package/@sqlitecloud/drivers
[issues-img]: https://img.shields.io/github/issues/sqlitecloud/sqlitecloud-js
[issues-url]: https://github.com/sqlitecloud/sqlitecloud-js/issues
