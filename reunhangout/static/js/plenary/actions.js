import {sendSocketMessage} from '../transport';
import * as youtube from './youtube';

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
export const REQUEST_EMBED_DETAILS = 'REQUEST_EMBED_DETAILS'
function requestEmbedDetails(embed) {
  return {
    type: REQUEST_EMBED_DETAILS,
    payload: {embed}
  }
}
export const RECEIVE_EMBED_DETAILS = 'RECEIVE_EMBED_DETAILS'
function receiveEmbedDetails(embed, details) {
  return {
    type: RECEIVE_EMBED_DETAILS,
    payload: {
      embed: embed,
      details: details
    }
  }
}
export function fetchEmbedDetails(embed) {
  return dispatch => {
    dispatch(requestEmbedDetails(embed));
    if (embed.type === "youtube") {
      youtube.fetchVideoDetails(embed.props.src)
        .then(details => dispatch(receiveEmbedDetails(embed, details)));
    }
  }
}

//Breakouts
export const BREAKOUT_CHANGING = 'BREAKOUT_CHANGING';
export const BREAKOUT_CREATED = 'BREAKOUT_CHANGED';
export const BREAKOUT_ERROR = 'BREAKOUT_ERROR';
export const changeBreakouts = (payload) => {
  return (dispatch) => {
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
  return (dispatch) => {
    dispatch({type: BREAKOUT_RECEIVE, payload});
  }
};
export const BREAKOUT_MODE = 'BREAKOUT_MODE';
export const BREAKOUT_MODE_CHANGING = 'BREAKOUT_MODE_CHANGING';
export const changeBreakoutMode = (payload) => {
  return (dispatch) => {
    dispatch({type: BREAKOUT_MODE_CHANGING, payload});

    sendSocketMessage({
      type: "plenary",
      payload: payload
    });
  }
}

export const messageBreakouts = (payload) => {
  return (dispatch) => {
    sendSocketMessage({type: "message_breakouts", payload});
  }
}

// Plenary details
export const SET_PLENARY = 'SET_PLENARY';
export const setPlenary = (payload) => ({type: SET_PLENARY, payload});
export const ADMIN_PLENARY_DETAILS_SENDING = 'ADMIN_PLENARY_DETAILS_SENDING';
export const ADMIN_PLENARY_DETAILS_SENT = 'ADMIN_PLENARY_DETAILS_SENT';
export const ADMIN_PLENARY_DETAILS_ERROR = 'ADMIN_PLENARY_DETAILS_ERROR';
export const adminSendPlenaryDetails = (payload) => {
  return (dispatch) => {
    dispatch({type: ADMIN_PLENARY_DETAILS_SENDING, payload});
    sendSocketMessage({type: "plenary", payload})
      .then(() => {
        dispatch({type: ADMIN_PLENARY_DETAILS_SENT, payload});
      })
      .catch((err) => {
        dispatch({type: ADMIN_PLENARY_DETAILS_ERROR, payload});
      });
  };
};

// Auth details
export const AUTH_DETAILS_SENDING = 'AUTH_DETAILS_SENDING';
export const AUTH_DETAILS_SENT = 'AUTH_DETAILS_SENT';
export const AUTH_DETAILS_ERROR = 'AUTH_DETAILS_ERROR';
export const sendAuthDetails = (payload) => {
  return (dispatch) => {
    dispatch({type: AUTH_DETAILS_SENDING, payload});
    sendSocketMessage({type: "auth", payload})
      .then(() => {
        dispatch({type: AUTH_DETAILS_SENT, payload});
      })
      .catch((err) => {
        dispatch({type: AUTH_DETAILS_ERROR, payload});
      });
  };
};

