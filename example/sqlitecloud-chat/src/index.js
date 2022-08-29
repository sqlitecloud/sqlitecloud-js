import { Liter } from "sdk-sqlitecloud-js"
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

let show = function (message) {
  document.getElementById('message').innerHTML = message;
}
let myLiter = new Liter("ws://localhost:8081/ws", show);

// send message from the form
document.forms.publish.onsubmit = function () {
  let outgoingMessage = this.message.value;

  myLiter.send(outgoingMessage);
  return false;
};


const openEl = document.getElementById("open-connection");
openEl.addEventListener("click", () => {
  myLiter.connect();
}, false);

const closeEl = document.getElementById("close-connection");
closeEl.addEventListener("click", () => {
  myLiter.close();
}, false);

setInterval(() => {
  document.getElementById('connection-state').innerHTML = myLiter.connectionState;
}, 200)