export const BREAKOUTS_ADD_MESSAGE = 'BREAKOUTS_ADD_MESSAGE';
export const BREAKOUTS_REMOVE_MESSAGE = 'BREAKOUTS_REMOVE_MESSAGE';
import {sendSocketMessage} from '../transport';
export const message = (payload) => {
  return (dispatch) => {
    dispatch({type: BREAKOUTS_ADD_MESSAGE, payload});
    setTimeout(() => {
      dispatch({type: BREAKOUTS_REMOVE_MESSAGE, payload});
    }, 10000);
  }
}

export const SET_BREAKOUT = 'SET_BREAKOUT';
export const setBreakout = (payload) => ({type: SET_BREAKOUT, payload});

export const ERROR_REPORT = 'ERROR_REPORT';
export const errorReport = payload => dispatch => {
  sendSocketMessage({type: ERROR_REPORT, payload: payload});
}
  
