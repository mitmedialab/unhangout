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

export const presence = (state=null, action) => {
  state = state ||  {'path': null, 'members': []};
  switch (action.type) {
    case A.SET_PRESENCE:
      return action.payload;
    case A.DISCONNECTING_OTHERS:
      state['action'] = A.DISCONNECTING_OTHERS;
      return state;
  }
  return state;
}

export const speakerStats = (state=null, action) => {
  state = state || {}
  switch (action.type) {
    case A.UPDATE_SPEAKER_STATS:
      state['speaker_stats'] = action.payload;
      return state;
    default:
      return state;
  }
}

export const requestSpeakerStats = (state=null, action) => {
  state = state || false
  switch (action.type) {
    case A.REQUEST_SPEAKER_STATS:
      state = action.payload.requestSpeakerStats;
      return state;
    default:
      return state;
  }
}
