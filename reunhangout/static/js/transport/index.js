export {default as ConnectionStatus} from './containers/ConnectionStatus';
import * as A from './actions';
import * as PLENARY_ACTIONS from '../plenary/actions';

let _socketClient = null;

export const connectSocket = (store) => {
  if (_socketClient) {
    _socketClient.close();
  }
  _socketClient = new SocketClient(store);
}

export class SocketClient {
  constructor(store) {
    this.store = store;
    this.connect();
  }

  connect() {
    this.url = window.location.href.replace(/^http/, 'ws');
    this.socket = new WebSocket(this.url);
    this.socket.onmessage = (e) => this.onMessage(e);
    this.socket.onopen = (e) => this.onOpen(e);
    this.socket.onclose = (e) => this.onClose(e);
    this.socket.onerror = (e) => this.onError(e);
    this.store.dispatch(A.connecting({url: this.url}));
  }

  close() {
    this.socket.close();
    this.store.dispatch(A.closing({url: this.url}));
  }

  onMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error(e);
      return;
    }
    switch (data.type) {
      case "chat": 
        this.store.dispatch(PLENARY_ACTIONS.chatMessageReceive(data.payload))
        break;
    }
  }

  onOpen(event) {
    console.log("OPENED!");
    this.store.dispatch(A.open({url: this.url}));
    if (this._connectedInterval) {
      clearTimeout(this._connectedInterval);
    }
  }

  onClose(event) {
    console.log("CLOSED!");
    this.store.dispatch(A.closed({url: this.url}));
    this._connectInterval = setInterval(() => {
      if (this.store.getState().socket.state === WebSocket.CLOSED) {
        this.connect();
      }
    }, 100);
  }

  onError(event) {
    this.store.dispatch(A.error({error: "error"}));
  }

  sendMessage(msg) {
    let string = JSON.stringify(msg);
    let waitForSend = (resolve) => {
      if (this.socket.bufferedAmount > 0) {
        setTimeout(() => waitForSend(resolve), 10);
      } else {
        resolve();
      }
    };
    return new Promise((resolve, reject) => {
      try {
        this.socket.send(string);
      } catch (e) {
        return reject(e);
      }
      waitForSend(resolve)
    });
  }
}

export const sendSocketMessage = function (message) {
  if (!(_socketClient && _socketClient.socket.readyState === WebSocket.OPEN)) {
    return Promise.reject(new Error("WebSocket not connected; can't send message."));
  }
  return _socketClient.sendMessage(message);
}
