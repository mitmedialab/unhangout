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
