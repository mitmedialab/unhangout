import * as A from './actions';

export const videosync = (state={}, action) => {
  console.log(action);
  state = {...state};
  switch (action.type) {
    case A.TICK:
      let cur = state[action.payload.sync_id] || {};
      state[action.payload.sync_id] = action.payload
      // default synced to true; but preserve previous value.
      if (cur.synced === false) {
        state[action.payload.sync_id].synced = false;
      } else {
        state[action.payload.sync_id].synced = true;
      }
      break;
    case A.SYNC_PLAYBACK:
      state[action.payload.sync_id] = {
        ...state[action.payload.sync_id],
        ...{synced: true}
      }
      break;
    case A.BREAK_SYNC_PLAYBACK:
      state[action.payload.sync_id] = {
        ...state[action.payload.sync_id],
        ...{synced: false}
      }
      break;
  }
  return state;
}

