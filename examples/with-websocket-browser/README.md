# SQLite Cloud — WebSocket browser example

A minimal [Vite](https://vitejs.dev/) + TypeScript app that uses
[`@sqlitecloud/drivers`](https://www.npmjs.com/package/@sqlitecloud/drivers)
to query SQLite Cloud **over WebSocket** from the browser.

This example consumes the driver from a locally packed tarball
(`file:../../sqlitecloud-drivers.tgz`) so you can test changes in this repo
before publishing — see [Using a local build of the driver](#using-a-local-build-of-the-driver).

In the browser the driver cannot open a raw TLS socket, so it automatically
connects through the **SQLite Cloud Gateway** using `socket.io` (WebSocket).
This example also passes `usewebsocket: true` explicitly so the same
`runQuery` helper works under Node.js too.

## Files

- [`src/query.ts`](src/query.ts) — opens a WebSocket connection,
  runs one SQL statement and normalizes the result into `{ rows }`.
- [`src/main.ts`](src/main.ts) — wires the form in `index.html` to `runQuery`.
- [`index.html`](index.html) — small UI to enter a connection string + SQL.

## Run it

```bash
npm install        # installs deps, incl. the locally packed @sqlitecloud/drivers tarball
npm run dev        # starts Vite on http://localhost:5173
```

Open the page, paste your SQLite Cloud connection string, e.g.

```
sqlitecloud://host.sqlite.cloud:8860/chinook.sqlite?apikey=YOUR_KEY
```

and click **Run query**.

Optionally copy `.env.example` to `.env` and set `VITE_DATABASE_URL` to prefill
the connection string field. Note that any `VITE_*` value is bundled into the
client, so only use it for local/demo databases — never a production secret.

## Pointing at a specific gateway

By default the gateway URL is derived from the host (`wss://<host>:443`). To
target a different gateway, add `gatewayurl` to the config in
[`src/main.ts`](src/main.ts):

```ts
{ connectionstring, gatewayurl: 'wss://my-gateway.example.com:443' }
```

## Using a local build of the driver

This example does not depend on the published npm package. Instead it installs
`@sqlitecloud/drivers` from a tarball built from this repo, pinned in
`package.json` as:

```json
"@sqlitecloud/drivers": "file:../../sqlitecloud-drivers.tgz"
```

To rebuild that tarball from your current source and reinstall it, run:

```bash
npm run sync-driver
```

This script:

1. builds the driver in the repo root (`npm run build`);
2. runs `npm pack` to produce `sqlitecloud-drivers.tgz` — the exact tarball that
   would be published to npm (same file set, same `package.json` exports);
3. clears `node_modules/@sqlitecloud`, the Vite cache, and the lockfile;
4. reinstalls from the fresh tarball.

Because it consumes the packed tarball rather than a symlinked workspace,
`sync-driver` faithfully simulates a real `npm install @sqlitecloud/drivers` —
so you can validate local driver changes against this example before publishing.
Re-run it whenever you change the driver source.

> `sync-driver` clears `node_modules/.vite`, so a plain `npm run dev` picks up the
> new build. If you ever rebuild the tarball without `sync-driver`, start Vite with
> `npm run dev -- --force` to bust its stale dependency cache (the `file:` version
> never changes, so Vite can't detect the new contents on its own).
