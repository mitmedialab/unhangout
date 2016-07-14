import {sendSocketMessage} from '../transport';

// Video playback
export const ADMIN_PLAY_FOR_ALL = 'ADMIN_PLAY_FOR_ALL';
export const adminPlayForAll = (payload) => ({type: ADMIN_PLAY_FOR_ALL, payload})

export const ADMIN_PAUSE_FOR_ALL = 'ADMIN_PAUSE_FOR_ALL';
export const adminPauseForAll = (payload) => ({type: ADMIN_PAUSE_FOR_ALL, payload});

export const ADMIN_REMOVE_EMBED = 'ADMIN_REMOVE_EMBED';
export const adminRemoveEmbed = (payload) => ({type: ADMIN_REMOVE_EMBED, payload});

export const ADMIN_ADD_EMBED = 'ADMIN_ADD_EMBED';
export const adminAddEmbed = (payload) => ({type: ADMIN_ADD_EMBED, payload});

export const ADMIN_CREATE_HOA = 'ADMIN_CREATE_HOA';
export const adminCreateHoA = (payload) => ({type: ADMIN_CREATE_HOA, payload});

export const SYNC_PLAYBACK = 'SYNC_PLAYBACK';
export const syncPlayback = (payload) => ({type: SYNC_PLAYBACK, payload});

export const BREAK_SYNC_PLAYBACK = 'BREAK_SYNC';
export const breakSyncPlayback = (payload) => ({type: BREAK_SYNC_PLAYBACK, payload});

// Chat
export const CHAT_MESSAGE_SENDING = 'CHAT_MESSAGE_SENDING';
export const CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT';
export const CHAT_MESSAGE_ERROR = 'CHAT_MESSAGE_ERROR';
export const sendChatMessage = (payload) => {
  return (dispatch) => {
    dispatch({type: CHAT_MESSAGE_SENDING, payload});
    sendSocketMessage({type: "chat", payload})
      .then(() => {
        dispatch({type: CHAT_MESSAGE_SENT, payload})
      })
      .catch((err) => {
        dispatch({type: CHAT_MESSAGE_ERROR, payload})
      });
  }
};
export const CHAT_MESSAGE_RECEIVE = 'CHAT_MESSAGE_RECEIVE';
export const chatMessageReceive = (payload) => {
  return (dispatch) => {
    dispatch({type: CHAT_MESSAGE_RECEIVE, payload});
  }
};

// Presence
export const SET_PRESENT = 'SET_PRESENT';
export const setPresent = (payload) => ({type: SET_PRESENT, payload});

// Embeds
export const SET_EMBEDS = 'SET_EMBEDS';
export const setEmbeds = (payload) => ({type: SET_EMBEDS, payload});
export const ADMIN_EMBEDS_SENDING = 'ADMIN_EMBEDS_SENDING';
export const ADMIN_EMBEDS_SENT = 'ADMIN_EMBEDS_SENT';
export const ADMIN_EMBEDS_ERROR = 'ADMIN_EMBEDS_ERROR';
export const adminEmbedsError = (payload) => ({type: ADMIN_EMBEDS_ERROR, payload});
export const adminSendEmbeds = (payload) => {
  return (dispatch) => {
    dispatch({type: ADMIN_EMBEDS_SENDING, payload});
    sendSocketMessage({type: "embeds", payload})
      .then(() => {
        dispatch({type: ADMIN_EMBEDS_SENT, payload});
      })
      .catch((err) => {
        dispatch({type: ADMIN_EMBEDS_ERROR, payload});
      });
  };
};
//Breakouts
export const BREAKOUT_CHANGING = 'BREAKOUT_CHANGING';
export const BREAKOUT_CREATED = 'BREAKOUT_CHANGED';
export const BREAKOUT_ERROR = 'BREAKOUT_ERROR';
export const changeBreakouts = (payload) => {
    return (dispatch) => {
      console.log('sending action fired')
    dispatch({type: BREAKOUT_CHANGING, payload});
    sendSocketMessage({type: "breakout", payload})
    .then(() => {
        dispatch({type: BREAKOUT_CHANGED, payload})
      })
    .catch((err) => {
        dispatch({type: BREAKOUT_ERROR, payload})
      });
  }
};
export const BREAKOUT_RECEIVE = 'BREAKOUT_RECEIVE';
export const breakoutReceive = (payload) => {
  console.log("receiving action fired")
  return (dispatch) => {
    dispatch({type: BREAKOUT_RECEIVE, payload});
  }
};
export const BREAKOUT_MODE = 'BREAKOUT_MODE';
export const breakoutMode = (payload) => {
  return (dispatch) => {
    dispatch({type: BREAKOUT_MODE, payload})
  }
}


