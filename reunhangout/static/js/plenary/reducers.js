import * as A from './actions';
import * as TRANSPORT_ACTIONS from '../transport/actions';

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
      newstate.embedDetails = {
        ...state.embedDetails,
        [action.payload.embed.props.src]: action.payload.details
      }
      return newstate
    case A.ADMIN_PLENARY_DETAILS_SENDING:
      newstate = {...state, plenaryDetailsState: "sending"}
      return newstate
    case A.ADMIN_PLENARY_DETAILS_SENT:
      newstate = {...state, plenaryDetailsState: "sent"}
      return newstate
    case A.SET_PLENARY:
      newstate = {...state, ...action.payload.plenary};
      // Special case: rewrite slug if given. We can't just replace state here,
      // because we'd also have to reconnect the socket.  Full page load is
      // easier.
      if (state && state.slug && newstate.slug && state.slug !== newstate.slug) {
        window.location.href = `/event/${newstate.slug}/`;
      }
      return newstate
    case A.SET_LIVE_PARTICIPANTS:
      newstate = {
        ...state,
        live_participants: action.payload.live_participants
      }
      return newstate
  }
  return state;
};
export const breakouts = (state=null, action) => {
  state = state || []
  switch (action.type) {
    case A.BREAKOUT_RECEIVE:
      return action.payload;
  }
  return state;
};

export const breakout_presence = (state=null, action) => {
  state = state || {};
  switch (action.type) {
    case A.SET_BREAKOUT_PRESENCE:
      state = {...state, [action.payload.breakout_id]: action.payload};
      return state;
   }
  return state;
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
    case A.CHAT_MESSAGE_REPLACE:
      let messages = {}
      state.forEach(msg => { messages[msg.id] = msg });
      action.payload.forEach(msg => { messages[msg.id] = msg })
      return _.values(messages)
  }
  return state;
};

export const users = (state=null, action) => {
  state = state || {}
  switch (action.type) {
    case TRANSPORT_ACTIONS.SET_PRESENCE:
      action.payload.members.forEach(user => state[user.id] = user);
      break;
    case A.SET_USERS:
      for (let id in action.payload) {
        state[id] = action.payload[id];
      }
      break;
  }
  return state;
};

export const auth = (state=null, action) => {
  return state;
};
