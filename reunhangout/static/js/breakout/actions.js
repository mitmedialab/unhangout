export const BREAKOUTS_ADD_MESSAGE = 'BREAKOUTS_ADD_MESSAGE';
export const BREAKOUTS_REMOVE_MESSAGE = 'BREAKOUTS_REMOVE_MESSAGE';
export const message = (payload) => {
  return (dispatch) => {
    dispatch({type: BREAKOUTS_ADD_MESSAGE, payload});
    setTimeout(() => {
      dispatch({type: BREAKOUTS_REMOVE_MESSAGE, payload});
    }, 10000);
  }
}


