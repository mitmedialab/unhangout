import {configureStore} from "./store";
import {connectSocket} from "./transport";
import {loadPlenary, loadPlenaryAdd} from "./plenary";
import {loadBreakout} from "./breakout";

const store = configureStore(window.__INITIAL_STATE__);
connectSocket(store);
loadPlenary(store);
loadBreakout(store);
loadPlenaryAdd(store);
