import * as A from './actions';
import deepFreeze from 'deep-freeze';

export const plenary = (state=null, action) => {
  state = state || {};
  if (!state.chat) {
    state = {chat: {}, ...state}
  }
  if (!state.embedDetails) {
    state = {embedDetails: {}, ...state}
  }
  let newstate;
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
      newstate = {...state, embedsSending: null, embeds: action.payload};
      return newstate;
    case A.REQUEST_EMBED_DETAILS:
      newstate = {...state}
      newstate.embedDetails[action.payload.embed.props.src] = {loading: true};
      return newstate
    case A.RECEIVE_EMBED_DETAILS:
      newstate = {...state}
      newstate.embedDetails[action.payload.embed.props.src] = action.payload.details
      return newstate
    }
  return state;
};
export const breakouts = (state=null, action) => {
  state = state || []
  switch (action.type) {
    case A.BREAKOUT_RECEIVE:
    console.log('reducer received new breakouts', action.payload)
      return action.payload;
  }
  return state;
};
export const breakoutMode = (state=null, action) => {
  state = state || {}
  switch(action.type) {
    case A.BREAKOUT_MODE:
      return action.payload;
  }
  return state
};
export const breakoutCrud = (state={}, action) => {
  switch (action.type) {
    case A.BREAKOUT_ERROR:
      return {error: action.payload}
    case A.BREAKOUT_CHANGING:
      return {state: "changing", payload: action.payload}
    case A.BREAKOUT_CHANGED:
      return {state: "changed", payload: action.payload}
  }
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
