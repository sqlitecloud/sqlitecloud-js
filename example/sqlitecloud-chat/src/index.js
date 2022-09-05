import { Liter } from "js-sdk"
import './style.css';

let onErrorCallback = function (event) {
  console.log("on Error");
  console.log(event);
}

let onCloseCallback = function (event) {
  console.log("on Close");
  console.log(event);
}


var projectId = "f9cdd1d5-7d16-454b-8cc0-548dc1712c26";
var apikey = "Rfk00KgQkqIzfqVuTmO87xVLWUwBos3zPzwbXw5UDVY";
let myLiter = new Liter(projectId, apikey, onErrorCallback, onCloseCallback);
//set custom requestTimeout
myLiter.setRequestTimeout(10000);

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

//Listen ch
const listen = (message) => {
  console.log(message)
}

const listenEl = document.getElementById("listen");
listenEl.addEventListener("click", async () => {
  const response = await myLiter.listen("chan1", listen);
  console.log(response);
}, false);


const unlistenEl = document.getElementById("unlisten");
unlistenEl.addEventListener("click", async () => {
  const response = await myLiter.unlisten("chan1");
  console.log(response);
}, false);


//Notify ch
const notifyEl = document.getElementById("notify");
notifyEl.addEventListener("click", async () => {
  const response = await myLiter.notify("chan1", "messagio di prova");
  console.log(response);
}, false);

//Close Ws
const closeWS = document.getElementById("closeWs");
closeWS.addEventListener("click", () => {
  const response = myLiter.close(1);
}, false);

//Close Ws Pub SUb
const closeWsPubSub = document.getElementById("closeWsPubSub");
closeWsPubSub.addEventListener("click", () => {
  const response = myLiter.close(2);
}, false);

//Close ALL
const closeAll = document.getElementById("closeAll");
closeAll.addEventListener("click", () => {
  const response = myLiter.close(0);
}, false);
