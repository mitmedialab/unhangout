import * as A from './actions';
import deepFreeze from 'deep-freeze';

export const plenary = (state=null, action) => {
  state = state || {};
  if (!state.chat) {
    state = {chat: {}, ...state}
  }
  switch (action.type) {
    case A.CHAT_MESSAGE_SENDING:
      return {...state, chat: {state: "sending", message: action.payload.message}}
    case A.CHAT_MESSAGE_SENT:
      return {...state, chat: {}}
    case A.CHAT_MESSAGE_ERROR:
      return {...state, chat: {state: "error", error: action.payload.error}}
    case A.ADMIN_EMBEDS_SENDING:
      return {...state, embedsSending: {state: "sending", payload: action.payload}}
    case A.ADMIN_EMBEDS_SENT:
      return {...state, embedsSending: null}
    case A.ADMIN_EMBEDS_ERROR:
      return {...state, embedsSending: {state: "error", error: action.payload.error}}
    case A.SET_EMBEDS:
      let state = {...state, embedsSending: null, embeds: action.payload};
      return state;
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
