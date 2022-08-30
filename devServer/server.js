/**
Before running:
> npm install ws
Then:
> node server.js
> open http://localhost:8081 in the browser
*/

const http = require('http');
const fs = require('fs');
const ws = new require('ws');

const wss = new ws.Server({ noServer: true });

const clients = new Set();

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

function onSocketConnect(ws) {
  clients.add(ws);
  log(`new connection`);

  function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

  ws.on('message', function (paylod) {
    const request = JSON.parse(paylod);
    const timeout = getRandomInt(6) * 1000;
    log("___________");
    log(request);
    log(timeout);
    log("___________");
    setTimeout(() => {
      for (let client of clients) {
        client.send(
          JSON.stringify(
            {
              message: "OK | Response to request ID: " + request.id,
              id: request.id
            }
          )
        );
      }
    }, timeout)

  });

  ws.on('close', function () {
    log(`connection closed`);
    clients.delete(ws);
  });
}

let log;
if (!module.parent) {
  log = console.log;
  http.createServer(accept).listen(8081);
} else {
  // to embed into javascript.info
  log = function () { };
  // log = console.log;
  exports.accept = accept;
}