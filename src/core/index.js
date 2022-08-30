export class Liter {

  /* PRIVATE PROPERTIES */

  /*
  #ws private property stores the websocket used:
    - to send "exec" type request
    - to send "pubsub" subscription request
    - to receive response to "exec" type request
  
  User receives the responses to his requests reading the result of a Promise.
  */
  #ws = null;

  /*
  #wsPubSub private property stores the websocket used to receive pubSub messages.
  When a new message is received, based on the channel, is selected the callbacks to be called cycling through subscriptionsStack property
  */
  #wsPubSub = null;
  #wsPubSubUrl = "ws://localhost:8082/ws";

  /*
  #requestsStack private property stores the list of pending requests, in this way the user can send multiple parallel requests.
  For each request an object that contains the following is stored:
  {
    id: //unique id associated with the request 
    onRequestTimeout: //function called when the request times out
    resolve: resolve, //function called when the Promise resolve
    reject: reject //function called when the Promise reject
  }
  */
  #requestsStack = new Map();

  /*
  #subscriptionsStack private property stores the list of pubSub subscriptions.
  For each subscription an object that contains the following is stored:
  {
    channel: //the name of the channel you are subscribed to 
    callback: //the function called when a new message arrives
  }
  */
  #subscriptionsStack = new Map();

  /* PUBLIC PROPERTIES */
  /*
  requestTimeout property stores the time available to receive a response before the request times out.
  */
  requestTimeout = 3000;


  /* CONSTRUCTOR */
  /*
  Liter class constructor receives:
   - project ID
   - api key
   - 
  */
  constructor(url, onError = null, onClose = null) {
    this.url = url;
    this.onError = onError;
    this.onClose = onClose;
    // this.url = "wss://" + "{{.}}" + "/api/v1/" + projectfield.value + "/ws?apikey=" + apikeyfield.value;
  }


  /* PUBLIC METHODS */
  /*
  setRequestTimeout method allows the user to change the request timeout value
  */
  setRequestTimeout(value) {
    this.requestTimeout = value;
  }

  /*
  makeid method generates unique IDs to use for requests
  */
  makeid(length = 5) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    return result;
  }

  /*
  connect method opens websocket connection
  */
  async connect() {
    try {
      this.#ws = await this.#connectWs(this.url, "Websocket connection not established");
      //register the close event on websocket
      this.#ws.addEventListener('error', this.#onError);
      //register the close event on websocket
      this.#ws.addEventListener('close', this.#onClose);
      return "connection created"
    } catch (error) {
      return (error);
    }
  }

  /*
  close method closes websocket connection and if exist pubSub websocket connection
  - type = 0 close all websocket
  - type = 1 close only request websocket
  - type = 2 close only pubSub websocket

  */
  close(type = 0) {
    if (type == 0) {
      this.#ws.close(1000, "Client close connection");
      this.onError = null;
      this.onClose = null;
      if (this.#wsPubSub !== null) {
        this.#wsPubSub.close(1000, "Client close connection");
        this.#subscriptionsStack = new Map();
      }
    }
    if (type == 1) {
      this.#ws.close(1000, "Client close connection");
      this.onError = null;
      this.onClose = null;
    }
    if (type == 2) {
      if (this.#wsPubSub !== null) {
        this.#wsPubSub.close(1000, "Client close connection");
        this.#subscriptionsStack = new Map();
      }
    }
  }

  /*
  connectionState method returns the actual state of websocket connection
  */
  get connectionState() {
    let connectionStateString = "WEBSOCKET NOT EXIST"
    if (this.#ws !== null) {
      let connectionState = this.#ws.readyState;
      switch (connectionState) {
        case 0:
          connectionStateString = "CONNECTING"
          break;
        case 1:
          connectionStateString = "OPEN"
          break;
        case 2:
          connectionStateString = "CLOSING"
          break;
        case 3:
          connectionStateString = "CLOSED"
          break;
        default:
          connectionStateString = "WEBSOCKET NOT EXIST"
      }
    }

    return connectionStateString;
  }

  /*
  requestsStackState method return the lits of pending requests
  */
  get requestsStackState() {
    return this.#requestsStack;
  }

  /*
  subscriptionsStackState method return the lits of active subscriptions
  */
  get subscriptionsStackState() {
    return this.#subscriptionsStack;
  }


  /*
  exec method calls the private method promiseSend building the object 
  */
  async exec(id, command) {
    try {
      const response = await this.#promiseSend(
        {
          id: id,
          type: "exec",
          command: command
        }
      );
      return (response);
    } catch (error) {
      return (error);
    }
  }

  /*
  pubsub method calls 
  */
  async pubsub(id, channel, payload, callback) {
    //based on the value of of callback, create a new subscription or remove the subscription
    if (callback !== null) {
      //check if the channel subscription is already active
      if (!this.#subscriptionsStack.has(channel)) {
        //if the subscription does not exist 
        try {
          const response = await this.#promiseSend(
            {
              id: id,
              type: "pubsub",
              channel: channel.toLowerCase(),
              payload: null
            }
          );
          this.#subscriptionsStack.set(channel.toLowerCase(),
            {
              channel: channel.toLowerCase(),
              callback: callback
            }
          )
          //if this is the first subscription, create the websocket connection dedicated to receive pubSub messages
          if (this.#subscriptionsStack.size == 1) {
            //response qui ci sono le informazioni di autenticazione
            try {
              this.#wsPubSub = await this.#connectWs(this.#wsPubSubUrl, "PubSub connection not established");
              //register the onmessage event on pubSub websocket
              this.#wsPubSub.addEventListener('message', this.#wsPubSubonMessage);
            } catch (error) {
              return (error);
            }
          }
          return (response);
        } catch (error) {
          return (error);
        }
      } else {
        //if the subscription exists
        return ("Subscription to channel " + channel + "already exist");
      }
    } else {
      //::::::::::::TODO::::::::::::
      //say to server to remove subscription
      //::::::::::::

      this.#subscriptionsStack.delete(channel)
      //check the remaing active subscription. If zero the websocket connection used for pubSub can be closed
      if (this.#subscriptionsStack.size == 0) {
        this.#wsPubSub.removeEventListener('message', this.#wsPubSubonMessage);
        this.#wsPubSub.close(1000, "Client close pubSub connection");
        this.#wsPubSub = null;
      }
      return ("Subscription to channel " + channel + "removed");
    }
  }


  /* PRIVATE METHODS */

  /*
  connectWs private method is called to create the websocket conenction used to send command request, receive command request response, pubSub subscription request, 
  */
  #connectWs(url, errorMessage) {
    return new Promise((resolve, reject) => {
      var ws = new WebSocket(url);
      ws.onopen = function () {
        resolve(ws);
      };
      ws.onerror = function (err) {
        reject(errorMessage);
      };
    });
  }


  /*
  onClose private method is called when close event is fired by websocket.
  if user provided a callback, this is invoked
  */
  #onClose = (event) => {
    if (this.onClose !== null) {
      this.onClose(event);
    }
  }

  /*
  onError private method is called when error event is fired by websocket.
  if user provided a callback, this is invoked
  */
  #onError = (event) => {
    if (this.onError !== null) {
      this.onError(event);
    }
  }

  /*
  wsPubSubonMessage private method is called when ad onmessage event is fired on pubSub websocket.
  based on the channel indicated in the message the right callback is called
  */
  #wsPubSubonMessage = (event) => {
    const pubSubMessage = JSON.parse(event.data);
    this.#subscriptionsStack.get(pubSubMessage.channel).callback(pubSubMessage.message);
  }

  /*
  promiseSend private method send request to the server creating a Promise that resolve when a websocket onmessage event is fired.
  */
  #promiseSend(request) {
    //request is sent to the server
    this.#ws.send(JSON.stringify(request));
    console.log(request); //TOGLIMI
    //extract request id
    const requestId = request.id;
    //define the Promise that wait for the server response 
    return new Promise((resolve, reject) => {
      //define what to do if an answer does not arrive within the set time
      const onRequestTimeout = setTimeout(() => { this.#handlePromiseRejectTimeout(requestId) }, this.requestTimeout);
      //add the new request to the request stack 
      this.#requestsStack.set(
        requestId,
        {
          id: requestId,
          onRequestTimeout: onRequestTimeout,
          resolve: resolve,
          reject: reject
        }
      )
      //if this is the only one request in the stack, register the function to be executed at the onmessage event
      if (this.#requestsStack.size == 1) this.#ws.addEventListener('message', this.#handlePromiseResolve);
    })
  }

  /*
  private handlePromiseResolve method is called when onmessage event is fired.
  */
  #handlePromiseResolve = (event) => {
    //parse the response sent by the server
    const response = JSON.parse(event.data);
    //search in the requests stack the request with the same id of the response received by the server.
    //it is possible that the request no longer exists as it may have timed out and therefore deleted from the stack.
    //if the request was found:
    // - the Promise corresponding to the request is resolved returning the response received by the server
    // - the timeout related to the request is cleared
    // - the new requests stack is stored
    // - if there are no pending requests remove the websocket onmessage event
    if (this.#requestsStack.has(response.id)) {
      this.#requestsStack.get(response.id).resolve(`${response.message}`);
      clearTimeout(this.#requestsStack.get(response.id).onRequestTimeout);
      this.#requestsStack.delete(response.id);
      if (this.#requestsStack.size == 0) this.#ws.removeEventListener('message', this.#handlePromiseResolve);
    }
  }

  /*
  private handlePromiseRejectTimeout method is called when a request times out.
  */
  #handlePromiseRejectTimeout = (requestID) => {
    //search in the requests stack the request with the same id of the request that times out.
    //a new requests stack is created by removing the request that times out.
    //once the request is found:
    // - the Promise corresponding to the reject returning an error message
    // - the timeout related to the request is cleared
    // - the new requests stack is stored
    // - if there are no pending requests remove the websocket onmessage event
    if (this.#requestsStack.has(requestID)) {
      clearTimeout(this.#requestsStack.get(requestID).onRequestTimeout);
      this.#requestsStack.get(requestID).reject(`Error | Times out request ID: ${requestID} `);
      this.#requestsStack.delete(requestID);
      if (this.#requestsStack.size == 0) this.#ws.removeEventListener('message', this.#handlePromiseResolve);
    }
  }
}


