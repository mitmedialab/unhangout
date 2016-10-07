import React from "react";
import ReactDOM from "react-dom";
import {Provider} from "react-redux";

// The weird syntax here is to import as a mutable variable for hot reloading
let Plenary = require("./containers/Plenary.js")['default'];
let PlenaryAdd = require("./containers/PlenaryAdd.js")['default'];

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
  module.hot && module.hot.accept("./containers/Plenary.js", () => {
    if (store) {
      Plenary = require("./containers/Plenary.js")['default'];
      _loadPlenary(store);
    }
  });
  _loadPlenary(store);
}  

export function loadPlenaryAdd(store) {
  const _loadPlenaryAdd = function() {
    let plenaryEl = document.querySelector('#plenary-add')
    if (plenaryEl) {
      ReactDOM.render(
        <Provider store={store}><PlenaryAdd /></Provider>,
        plenaryEl
      );
    }
  }
  module.hot && module.hot.accept("./containers/PlenaryAdd.js", () => {
    if (store) {
      Plenary = require("./containers/PlenaryAdd.js")['default'];
      _loadPlenaryAdd(store);
    }
  });
  _loadPlenaryAdd(store);
}

