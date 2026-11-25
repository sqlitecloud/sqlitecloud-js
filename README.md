# @sqlitecloud/drivers

[![npm package][npm-img]][npm-url]
[![Test][test-img]][test-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![codecov](https://codecov.io/gh/sqlitecloud/sqlitecloud-js/graph/badge.svg?token=ZOKE9WFH62)](https://codecov.io/gh/sqlitecloud/sqlitecloud-js)

## Install

### Web / Node.js / Next.js

```bash
npm install @sqlitecloud/drivers
```

No additional dependencies required - the package works out of the box.

### React Native / Expo

When using this package in React Native or Expo projects, you must install the required peer dependencies. These dependencies are optional and not installed automatically to avoid polluting web and Node.js projects with unnecessary packages.

```bash
npm install @sqlitecloud/drivers react-native-tcp-socket react-native-quick-base64 @craftzdog/react-native-buffer react-native-url-polyfill
```

If you forget to install these dependencies, the package will throw clear error messages indicating which dependency is missing and how to install it.

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

let results = await database.sql('SELECT * FROM tracks WHERE name = ?', name)
// => returns [{ AlbumId: 1, Name: 'Breaking The Rules', Composer: 'Angus Young... }]
```

Use [Database.sql](https://sqlitecloud.github.io/sqlitecloud-js/classes/Database.html#sql) to execute prepared statements or plain SQL queries asynchronously. This method returns an array of rows for SELECT queries and supports the standard syntax for UPDATE, INSERT, and DELETE.

We aim for full compatibility with the established [sqlite3 API](https://www.npmjs.com/package/sqlite3), with the primary distinction being that our driver connects to SQLiteCloud databases. This allows you to migrate your [SQLite to the cloud](https://sqlitecloud.io) while continuing to use your existing codebase.

The package is developed entirely in TypeScript and is fully compatible with JavaScript. It doesn't require any native libraries. This makes it a straightforward and effective tool for managing cloud-based databases in a familiar SQLite environment.

### Stateless HTTP gateway transport

Use `usehttp: true` to send each query as an independent HTTPS request through the gateway. It is a good fit for browser and edge workloads that issue parallel, cancellable reads:

```ts
const database = new Database({
  connectionstring: 'sqlitecloud://xxx.sqlite.cloud:8860/chinook.sqlite?apikey=xxxxxxx',
  usehttp: true
})

const controller = new AbortController()
const rows = await database.sql({ query: 'SELECT * FROM tracks LIMIT ?', parameters: [100], signal: controller.signal })
```

HTTP has no session. A transaction must be contained in one request; do not split `BEGIN`, writes, and `COMMIT` across `database.sql()` calls. The same applies to temporary tables, `ATTACH`, connection-scoped `PRAGMA` settings, and a later `last_insert_rowid()` call. HTTP construction does not make a network request, so invalid credentials or an unavailable gateway are reported by the first query rather than the constructor callback.

Commands are not ordered. Each one is sent as soon as it is issued, so `run`, `exec`, `all` and `Statement` calls that depend on an earlier one must wait for its result, by awaiting or through the callback. `database.close()` waits for the requests already in flight and reports their results, so a write the server received is never reported as failed; commands issued after `close()` fail with `ERR_CONNECTION_CLOSED`.

HTTP authenticates with `apikey` or `token`; a username and password are rejected when the configuration is validated. A `signal` cancels an HTTP request while it is running with `ERR_ABORTED`. On the TLS and WebSocket transports it cancels a command only while it waits in the queue; a command already sent runs to completion.

When using a localhost gateway with HTTP, configure a tenant-aware local reverse proxy. Browser and Node Fetch implementations do not reliably allow the driver to set the tenant `Host` header; the WebSocket transport remains the direct localhost option.

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
