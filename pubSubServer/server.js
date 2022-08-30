/**
Before running:
> npm install ws
Then:
> node server.js
> open http://localhost:8082 in the browser
*/

const http = require('http');
const fs = require('fs');
const ws = new require('ws');

const wss = new ws.Server({ noServer: true });

const clients = new Set();

var count = 0;

function accept(req, res) {
  if (req.url == '/ws' && req.headers.upgrade &&
    req.headers.upgrade.toLowerCase() == 'websocket' &&
    // can be Connection: keep-alive, Upgrade
    req.headers.connection.match(/\bupgrade\b/i)) {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onSocketConnect);
  } else if (req.url == '/') { // index.html
    fs.createReadStream('./index.html').pipe(res);
  } else { // page not found
    res.writeHead(404);
    res.end();
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}


function onSocketConnect(ws) {
  clients.add(ws);
  log(`new connection`);

  setInterval(() => {
    for (let client of clients) {
      client.send(
        JSON.stringify(
          {
            channel: "channel1",
            message: "pubSub message: " + getRandomInt(5000),
          }
        )
      );
    }
  }, 2000)

  ws.on('close', function () {
    log(`connection closed`);
    clients.delete(ws);
  });
}

let log;
if (!module.parent) {
  log = console.log;
  http.createServer(accept).listen(8082);
} else {
  // to embed into javascript.info
  log = function () { };
  // log = console.log;
  exports.accept = accept;
}