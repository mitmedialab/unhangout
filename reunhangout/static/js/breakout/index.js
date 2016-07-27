import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";
import {configureStore} from "../store";
import {connectSocket} from "../transport";
let Breakout = require("./containers/Breakout.js")['default'];

// The weird syntax here is to import as a mutable variable for hot reloading

export function loadBreakout(store) {
  const _loadBreakout = function() {
    let breakoutEl = document.querySelector('#breakout')
    if (breakoutEl) {
      ReactDOM.render(
        <Provider store={store}><Breakout /></Provider>,
        breakoutEl
      );
    }
  }
  module.hot && module.hot.accept("./containers/Breakout.js", () => {
    Breakout = require("./containers/Breakout.js")['default'];
    _loadBreakout(store);
  });
  _loadBreakout(store);
}  
