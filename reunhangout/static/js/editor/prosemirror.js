const prosemirror = require("prosemirror");
require("prosemirror/dist/menu/menubar");
//require("prosemirror/dist/menu/tooltipmenu");

/** http://youmightnotneedjquery.com/#ready */
function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
};

const replaceTextarea = function (textarea) {
  textarea.style.display = "none";
  let container = document.createElement("div");
  container.className = textarea.className + " rich-text-editor";
  textarea.parentNode.insertBefore(container, textarea);

  let editor = new prosemirror.ProseMirror({
    place: container,
    menuBar: true,
    //tooltipMenu: true,
    doc: textarea.value,
    docFormat: "html"
  });
  editor.on("change", () => textarea.value = editor.getContent("html"))
};
const replaceAllTextareas = function() {
  ready(function() {
    let els = document.querySelectorAll(".js-rich-text-editor");
    for (let i = 0; i < els.length; i++) {
      replaceTextarea(els[i]);
    }
  });
}
replaceAllTextareas()
