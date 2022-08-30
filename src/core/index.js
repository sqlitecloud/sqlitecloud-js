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
  #requestsStack = [];

  /*
  #subscriptionsStack private property stores the list of pubSub subscriptions.
  For each subscription an object that contains the following is stored:
  {
    channel: //the name of the channel you are subscribed to 
    callback: //the function called when a new message arrives
  }
  */
  #subscriptionsStack = [];

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
  constructor(url, callback) {
    this.url = url;
    this.callback = callback;
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
      return "connection created"
    } catch (error) {
      return (error);
    }
  }

  /*
  close method closes websocket connection
  */
  close() {
    this.#ws.close(1000, "Client close connection");
    if (this.#wsPubSub !== null) {
      this.#wsPubSub.close(1000, "Client close connection");
      this.#subscriptionsStack = [];
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
      let subExist = false;
      this.#subscriptionsStack.forEach((sub) => {
        if (sub.channel == channel) subExist = true;
      })
      if (!subExist) {
        //if the subscription does not exist 
        try {
          const response = await this.#promiseSend(
            {
              id: id,
              type: "pubsub",
              channel: channel,
              payload: null
            }
          );
          this.#subscriptionsStack.push(
            {
              channel: channel,
              callback: callback
            }
          )
          //if this is the first subscription, create the websocket connection dedicated to receive pubSub messages
          if (this.#subscriptionsStack.length == 1) {
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
      let newSubscriptionsStack = [];
      this.#subscriptionsStack.forEach((sub) => {
        if (sub.channel != channel) newSubscriptionsStack.push(sub);
      })
      this.#subscriptionsStack = newSubscriptionsStack;
      //check the remaing active subscription. If zero the websocket connection used for pubSub can be closed
      if (this.#subscriptionsStack.length == 0) {
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
    return new Promise(function (resolve, reject) {
      var ws = new WebSocket(url);
      ws.onopen = function () {
        resolve(ws);
      };
      ws.onerror = function (err) {
        reject(errorMessage);
      };
    });
  }

  #wsPubSubonMessage = (event) => {
    const pubSubMessage = JSON.parse(event.data);
    console.log("______________________");
    console.log(this.#subscriptionsStack);
    this.#subscriptionsStack.forEach((sub) => {
      if (sub.channel == pubSubMessage.channel) sub.callback(pubSubMessage.message);
    })
    console.log("______________________");
  }

  /*
  promiseSend method send request to the server creating a Promise that resolve when a websocket onmessage event is fired.
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
      this.#requestsStack.push(
        {
          id: requestId,
          onRequestTimeout: onRequestTimeout,
          resolve: resolve,
          reject: reject
        }
      );
      //if this is the only one request in the stack, register the function to be executed at the onmessage event
      if (this.#requestsStack.length == 1) this.#ws.addEventListener('message', this.#handlePromiseResolve);
    })
  }

  /*
  private handlePromiseResolve method is called when onmessage event is fired.
  */
  #handlePromiseResolve = (event) => {
    //parse the response sent by the server
    const response = JSON.parse(event.data);
    //search in the requests stack the request with the same id of the response received by the sever.
    //it is possible that the request no longer exists as it may have timed out and therefore deleted from the stack.
    //a new requests stack is created by removing, if present, the request with the same id as the one in the response.
    //the index of the request corresponding to the response is stored.
    let newRequestsStack = [];
    let requestIndex = -1;
    this.#requestsStack.forEach((request, i) => {
      if (request.id != response.id) {
        newRequestsStack.push(request);
      } else {
        requestIndex = i;
      }
    });
    //if the request was found:
    // - the Promise corresponding to the request is resolved returning the response received by the server
    // - the timeout related to the request is cleared
    // - the new requests stack is stored
    // - if there are no pending requests remove the websocket onmessage event
    if (requestIndex >= 0) {
      this.#requestsStack[requestIndex].resolve(`${response.message}`);
      clearTimeout(this.#requestsStack[requestIndex].onRequestTimeout);
      this.#requestsStack = newRequestsStack;
      if (this.#requestsStack.length == 0) this.#ws.removeEventListener('message', this.#handlePromiseResolve);
    }
  }

  /*
  private handlePromiseRejectTimeout method is called when a request times out.
  */
  #handlePromiseRejectTimeout = (requestID) => {
    //search in the requests stack the request with the same id of the request that times out.
    //a new requests stack is created by removing the request that times out.
    //the index of the request that times out is stored.
    let newRequestsStack = [];
    let requestIndex = -1;
    this.#requestsStack.forEach((request, i) => {
      if (request.id != requestID) {
        newRequestsStack.push(request);
      } else {
        requestIndex = i;
      }
    });
    //once the request is found:
    // - the Promise corresponding to the reject returning an error message
    // - the timeout related to the request is cleared
    // - the new requests stack is stored
    // - if there are no pending requests remove the websocket onmessage event
    if (requestIndex >= 0) {
      clearTimeout(this.#requestsStack[requestIndex].onRequestTimeout);
      this.#requestsStack[requestIndex].reject(`Error | Times out request ID: ${requestID} `);
      this.#requestsStack = newRequestsStack;
      if (this.#requestsStack.length == 0) this.#ws.removeEventListener('message', this.#handlePromiseResolve);
    }
  }
}


