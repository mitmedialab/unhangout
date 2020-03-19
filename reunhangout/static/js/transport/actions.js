import {sendSocketMessage} from './index.js'

export const CONNECTING = 'CONNECTING';
export const connecting = (payload) => ({type: CONNECTING, payload});
export const OPEN = 'OPEN';
export const open = (payload) => ({type: OPEN, payload});
export const CLOSING = 'CLOSING';
export const closing = (payload) => ({type: CLOSING, payload});
export const CLOSED = 'CLOSED';
export const closed = (payload) => ({type: CLOSED, payload});
export const ERROR = 'ERROR';
export const error = (payload) => ({type: ERROR, payload});

// Presence
export const SET_PRESENCE = 'SET_PRESENCE';
export const setPresence = (payload) => ({type: SET_PRESENCE, payload});
export const DISCONNECTING_OTHERS = 'DISCONNECTING_OTHERS';
export const disconnectOthers = (payload) => {
  return (dispatch) => {
    dispatch({type: DISCONNECTING_OTHERS, payload});
    sendSocketMessage({type: DISCONNECTING_OTHERS, payload});
  }
};
export const UPDATE_SPEAKER_STATS = 'UPDATE_SPEAKER_STATS';
export const updateSpeakerStats = (payload) => {
  return (dispatch) => {
    dispatch({type: UPDATE_SPEAKER_STATS, payload});
  }
};

// tells the clients to save speaker stats to the backend
export const REQUEST_SPEAKER_STATS = 'REQUEST_SPEAKER_STATS';
export const requestSpeakerStats = (payload) => {
  return (dispatch) => {
    dispatch({type: REQUEST_SPEAKER_STATS, payload});
  }
}  

export const recordSpeakerStats = (payload) => {
  return (dispatch) => {
    sendSocketMessage({type: "record_speaker_stats", payload});
  }
}