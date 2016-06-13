import * as A from './actions';

// Reducer for the "socket" namespace.  Holds state for connection status and
// message error status for the socket.
export const socket = (state=null, action) => {
  state = state || {state: WebSocket.CLOSED};
  switch (action.type) {
    case A.CONNECTING:
      return {state: WebSocket.CONNECTING, url: action.payload.url}
    break;
    case A.OPEN:
      return {state: WebSocket.OPEN, url: action.payload.url};
    break;
    case A.CLOSING:
      return {state: WebSocket.CLOSING, url: action.payload.url};
    break;
    case A.CLOSED:
      return {state: WebSocket.CLOSED, url: action.payload.url};
    break;
    case A.ERROR:
      return {state: "ERROR", error: action.payload.error, ...state}
    break;
  }
  return state;
}
