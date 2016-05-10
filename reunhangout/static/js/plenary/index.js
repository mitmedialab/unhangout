const React = require("react");
const ReactDOM = require("react-dom");
const {Provider} = require("react-redux");
const {configureStore} = require("../store");
let Plenary = require("./containers/plenary.js")['default'];

console.log("Initial state", window.__INITIAL_STATE__);
const store = configureStore(window.__INITIAL_STATE__);
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
