import React from "react";
import PropTypes from 'prop-types';
import RichTextEditor from 'react-rte';
import ReactDOM from "react-dom";
import './editor.scss';

class Editor extends React.Component {
  static propTypes = {
    el: PropTypes.object.isRequired
  }

  constructor(props) {
    super(props);
    this.state = {
      value: RichTextEditor.createValueFromString(props.el.value, 'html')
    };
  }

  onChange(value) {
    this.setState({value});
    this.props.el.value = value.toString('html');
  }

  render() {
    return (
      <div style={{width: "600px"}}>
        <RichTextEditor
          value={this.state.value}
          onChange={this.onChange.bind(this)} />
        <pre style={{fontSize: "smaller", whiteSpace: "pre-wrap"}}>{this.state.value.toString('html')}</pre>
      </div>
    )
  }
}

const replaceTextareas = function() {
  let els = document.querySelectorAll(".js-rich-text-editor");
  for (let i = 0; i < els.length; i++) {
    let textarea = els[i];
    textarea.style.display = 'none';
    let container = textarea.previousSibling;
    let className = (container && container.className) || "";
    if (className.indexOf("mounted-rich-text-editor") === -1) {
      container = document.createElement("div");
      container.className = "mounted-rich-text-editor";
      textarea.parentNode.insertBefore(container, textarea);
    }
    ReactDOM.render(<Editor el={textarea} />, container);
  }
}

/** http://youmightnotneedjquery.com/#ready */
function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
};
ready(replaceTextareas);
