import _ from 'lodash';
import * as A from './actions';

export const breakout = (state=null, action) => {
  state = state || {};
  switch (action.type) {
    case A.BREAKOUTS_DISCONNECTING_OTHERS:
      return {...state, disconnectingOthers: true};
    case A.SET_BREAKOUT:
      return action.payload;
  }
  return state;
}

export const breakoutMessages = (state=[], action) => {
  switch (action.type) {
    case A.BREAKOUTS_ADD_MESSAGE:
      state = state.slice();
      state.push(action.payload.message);
      return state;
    case A.BREAKOUTS_REMOVE_MESSAGE:
      state = _.without(action.payload.message);
      return state;
    default:
      return state;
  }
}

