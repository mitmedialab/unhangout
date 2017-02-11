import {configureStore} from "./store";
import {connectSocket} from "./transport";
import {loadPlenary, loadPlenaryAdd} from "./plenary";
import {loadBreakout} from "./breakout";

const store = configureStore(window.__INITIAL_STATE__);
if (!window.NO_SOCKET) {
  connectSocket(store);
}
loadPlenary(store);
loadBreakout(store);
loadPlenaryAdd(store);
