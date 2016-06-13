import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {configureStore} from "../store";
import {connectSocket} from "../transport";
let Plenary = require("./containers/plenary.js")['default'];

const store = configureStore(window.__INITIAL_STATE__);
connectSocket(store);

let loadPlenary = function() {
  let plenaryEl = document.querySelector('#plenary')
  if (plenaryEl) {
    ReactDOM.render(
      <Provider store={store}><Plenary /></Provider>,
      plenaryEl
    );
  }
}  
module.hot && module.hot.accept("./containers/plenary.js", () => {
  Plenary = require("./containers/plenary.js")['default'];
  loadPlenary();
});
loadPlenary();
