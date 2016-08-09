import {sendSocketMessage} from '../transport';

// video sync
export const TICK = 'SYNC_TICK';
export const tick = (payload) => ({type: TICK, payload});

export const SYNC_PLAYBACK = 'SYNC_PLAYBACK';
export const syncPlayback = (payload) => ({type: SYNC_PLAYBACK, payload});

export const BREAK_SYNC_PLAYBACK = 'BREAK_SYNC';
export const breakSyncPlayback = (payload) => ({type: BREAK_SYNC_PLAYBACK, payload});

export const PLAY_FOR_ALL = 'PLAY_FOR_ALL';
export const playForAll = (payload) => {
  return (dispatch) => {
    sendSocketMessage({
      type: "videosync",
      payload: {action: "play", sync_id: payload.sync_id}
    })
  }
}

export const PAUSE_FOR_ALL = 'PAUSE_FOR_ALL';
export const pauseForAll = (payload) => {
  return (dispatch) => {
    sendSocketMessage({
      type: "videosync",
      payload: {action: "pause", sync_id: payload.sync_id}
    })
  }
}
