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
export const CHAT_MESSAGE_REPLACE = 'CHAT_MESSAGE_REPLACE';
export const chatMessageReplace = (payload) => {
  return (dispatch) => {
    dispatch({type: CHAT_MESSAGE_REPLACE, payload});
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
export function fetchEmbedDetails(embed, settings) {
  return dispatch => {
    dispatch(requestEmbedDetails(embed));
    if (embed.type === "youtube") {
      youtube.fetchVideoDetails(embed.props.src, settings)
        .then(details => dispatch(receiveEmbedDetails(embed, details)));
    }
  }
}

// Live broadcasts
export const JOIN_LIVE_BROADCAST_SENDING = 'JOIN_LIVE_BROADCAT_SENDING';
export const JOIN_LIVE_BROADCAST_SENT = 'JOIN_LIVE_BROADCAT_SENT';
export const JOIN_LIVE_BROADCAST_ERROR = 'JOIN_LIVE_BROADCAT_ERROR';
export const LEAVE_LIVE_BROADCAST_SENDING = 'LEAVE_LIVE_BROADCAT_SENDING';
export const LEAVE_LIVE_BROADCAST_SENT = 'LEAVE_LIVE_BROADCAT_SENT';
export const LEAVE_LIVE_BROADCAST_ERROR = 'LEAVE_LIVE_BROADCAT_ERROR';
export const SET_LIVE_PARTICIPANTS = 'SET_LIVE_PARTICIPANTS';
export const adminJoinLiveBroadcast = (payload) => {
  return (dispatch) => {
    dispatch({type: JOIN_LIVE_BROADCAST_SENDING, payload});
    sendSocketMessage({type: 'add_live_participant', payload})
      .then(() => dispatch({type: JOIN_LIVE_BROADCAST_SENT, payload}))
      .catch(() => dispatch({type: JOIN_LIVE_BROADCAST_ERROR, payload}))
  }
}
export const leaveLiveBroadcast = (payload) => {
  return (dispatch) => {
    dispatch({type: LEAVE_LIVE_BROADCAST_SENDING, payload});
    sendSocketMessage({type: 'remove_live_participant', payload})
      .then(() => dispatch({type: LEAVE_LIVE_BROADCAST_SENT, payload}))
      .catch(() => dispatch({type: LEAVE_LIVE_BROADCAST_ERROR, payload}))
  }
}
export const setLiveParticipants = (payload) => ({type: SET_LIVE_PARTICIPANTS, payload});

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

export const requestSpeakerStats = (payload) => {
  return (dispatch) => {
    sendSocketMessage({type: "request_speaker_stats", payload});
  }
}

export const enableSpeakerStats = (payload) => {
  return (dispatch) => {
    sendSocketMessage({type: "enable_speaker_stats", payload});
  }
}

export const SET_BREAKOUT_PRESENCE = 'SET_BREAKOUT_PRESENCE';
export const setBreakoutPresence = (payload) => ({type: SET_BREAKOUT_PRESENCE, payload});

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

export const ADMIN_ARCHIVE_CHAT_SENDING = 'ADMIN_ARCHIVE_CHAT_SENDING';
export const ADMIN_ARCHIVE_CHAT_SENT = 'ADMIN_ARCHIVE_CHAT_SENT';
export const ADMIN_ARCHIVE_CHAT_ERROR = 'ADMIN_ARCHIVE_CHAT_ERROR';
export const adminArchiveChatMessages = (payload) => {
  return (dispatch) => {
    dispatch({type: ADMIN_ARCHIVE_CHAT_SENDING, payload})
    sendSocketMessage({type: "archive_chat", payload})
    .then(() => dispatch({type: ADMIN_ARCHIVE_CHAT_SENT, payload}))
    .catch((err) => dispatch({type: ADMIN_ARCHIVE_CHAT_ERROR, payload}))
  }
}

// Auth details
export const CONTACT_CARD_SENDING = 'CONTACT_CARD_SENDING';
export const CONTACT_CARD_SENT = 'CONTACT_CARD_SENT';
export const CONTACT_CARD_ERROR = 'CONTACT_CARD_ERROR';
export const updateContactCard = (payload) => {
  return (dispatch) => {
    dispatch({type: CONTACT_CARD_SENDING, payload});
    sendSocketMessage({type: "contact_card", payload})
      .then(() => {
        dispatch({type: CONTACT_CARD_SENT, payload});
      })
      .catch((err) => {
        dispatch({type: CONTACT_CARD_ERROR, payload});
      });
  };
};
export const SET_AUTH = 'SET_AUTH';
export const setAuth = (payload) => {
  return {type: SET_AUTH, payload};
}
export const SET_USERS = 'SET_USERS';
export const setUsers = (payload) => {
  return {type: SET_USERS, payload}
}
