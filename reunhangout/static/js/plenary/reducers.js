import * as A from './actions';
import deepFreeze from 'deep-freeze';

export const plenary = (state=null, action) => {
  state = state || {};
  if (!state.chat) {
    state = {chat: {}, ...state}
  }
  switch (action.type) {
    case A.CHAT_MESSAGE_SENDING:
      return {chat: {state: "sending", message: action.payload.message}, ...state}
    case A.CHAT_MESSAGE_SENT:
      return {chat: {}, ...state}
    case A.CHAT_MESSAGE_ERROR:
      return {chat: {state: "error", error: action.payload.error}, ...state}
  }
  return state;
};
export const breakouts = (state=null, action) => {
  return state;
};
export const chat_messages = (state=null, action) => {
  state = state || []
  switch (action.type) {
    case A.CHAT_MESSAGE_RECEIVE:
      return [...state, action.payload]
  }
  return state;
};

export const auth = (state=null, action) => {
  return state;
};

export const present = (state=null, action) => {
  if (action.type === A.SET_PRESENT) {
    return action.payload;
  }
  return state || {'path': null, 'members': []}
};
