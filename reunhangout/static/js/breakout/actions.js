export const BREAKOUTS_ADD_MESSAGE = 'BREAKOUTS_ADD_MESSAGE';
export const BREAKOUTS_REMOVE_MESSAGE = 'BREAKOUTS_REMOVE_MESSAGE';
import {sendSocketMessage} from '../transport';
export const message = (payload) => {
  return (dispatch) => {
    dispatch({type: BREAKOUTS_ADD_MESSAGE, payload});
    // Timeout is 150 words per minute + 5 second buffer, or minimum 10
    // seconds.
    const timeout = Math.max(
      10000,
      payload.message.split(/\s/g).length / 150 * 60000 + 5000
    );
    setTimeout(() => {
      dispatch({type: BREAKOUTS_REMOVE_MESSAGE, payload});
    }, timeout);
  }
}

export const SET_BREAKOUT = 'SET_BREAKOUT';
export const setBreakout = (payload) => ({type: SET_BREAKOUT, payload});

export const ERROR_REPORT = 'ERROR_REPORT';
export const errorReport = payload => dispatch => {
  sendSocketMessage({type: ERROR_REPORT, payload: payload});
}
  
