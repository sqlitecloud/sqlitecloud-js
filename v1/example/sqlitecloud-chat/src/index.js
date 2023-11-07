import { Liter } from "js-sdk"
import './style.css';

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

let onErrorCallback = function (event, msg) {
  console.log(event);
  console.log(msg);
}

let onCloseCallback = function (msg) {
  console.log(msg);
}


var projectId = "f9cdd1d5-7d16-454b-8cc0-548dc1712c26";
var apikey = "Rfk00KgQkqIzfqVuTmO87xVLWUwBos3zPzwbXw5UDVY";
let myLiter = new Liter(projectId, apikey, onErrorCallback, onCloseCallback);
//set custom requestTimeout
myLiter.setRequestTimeout(10000);
myLiter.setFilterSentMessages(false);

//Connection Open
const openEl = document.getElementById("open-connection");
openEl.addEventListener("click", async () => {
  const connectionResponse = await myLiter.connect();
  console.log(connectionResponse);
}, false);

//Send exec
const sendEl = document.getElementById("send-button");
sendEl.addEventListener("click", async () => {
  const response = await myLiter.exec("LIST DATABASES");
  console.log(response);
}, false);

//Listen ch 1
const listen = (message) => {
  console.log(message)
}

const listenEl = document.getElementById("listen");
listenEl.addEventListener("click", async () => {
  const response = await myLiter.listen("chname0", listen);
  console.log(response);
}, false);


const unlistenEl = document.getElementById("unlisten");
unlistenEl.addEventListener("click", async () => {
  const response = await myLiter.unlisten("chname0");
  console.log(response);
}, false);

//Listen ch 2
const listen2 = (message) => {
  console.log(message)
}

const listenEl2 = document.getElementById("listen2");
listenEl2.addEventListener("click", async () => {
  const response = await myLiter.listen("chname1", listen2);
  console.log(response);
}, false);


const unlistenEl2 = document.getElementById("unlisten2");
unlistenEl2.addEventListener("click", async () => {
  const response = await myLiter.unlisten("chname1");
  console.log(response);
}, false);


//Notify ch1
const notifyEl = document.getElementById("notify1");
notifyEl.addEventListener("click", async () => {
  const response = await myLiter.notify("chname0", makeid(20));
  console.log(response);
}, false);

//Notify ch2
const notifyEl2 = document.getElementById("notify2");
notifyEl2.addEventListener("click", async () => {
  const response = await myLiter.notify("chname1", makeid(20));
  console.log(response);
}, false);

//Close Ws
const closeWS = document.getElementById("closeWs");
closeWS.addEventListener("click", () => {
  const response = myLiter.close(false);
  console.log(response);
}, false);

//Close Ws Pub SUb
const closeWsPubSub = document.getElementById("closeWsPubSub");
closeWsPubSub.addEventListener("click", () => {
  const response = myLiter.close();
  console.log(response);
}, false);

//Check state Ws Pub SUb
const check = document.getElementById("checkState");
check.addEventListener("click", () => {
  const response = myLiter.connectionState;
  console.log(response);
}, false);

//Check Stack
const checkStack = document.getElementById("checkStack");
checkStack.addEventListener("click", () => {
  const response = myLiter.subscriptionsStackState;
  console.log(response);
}, false);

