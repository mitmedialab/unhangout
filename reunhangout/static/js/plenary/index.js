import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";

// The weird syntax here is to import as a mutable variable for hot reloading
let Plenary = require("./containers/plenary.js")['default'];

export function loadPlenary(store) {
  const _loadPlenary = function() {
    let plenaryEl = document.querySelector('#plenary')
    if (plenaryEl) {
      ReactDOM.render(
        <Provider store={store}><Plenary /></Provider>,
        plenaryEl
      );
    }
  }
  module.hot && module.hot.accept("./containers/plenary.js", () => {
    if (_store) {
      Plenary = require("./containers/plenary.js")['default'];
      _loadPlenary(store);
    }
  });
  _loadPlenary(store);
}  
