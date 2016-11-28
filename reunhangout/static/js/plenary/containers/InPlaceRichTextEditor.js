import React from "react";

import Draft from 'draft-js';
import PluginEditor from 'draft-js-plugins-editor';
import createLinkifyPlugin from 'draft-js-linkify-plugin';
import {stateToHTML} from 'draft-js-export-html';

import 'draft-js-linkify-plugin/lib/plugin.css';
import * as style from "../../../scss/partials/_inPlaceEditor.scss";

const linkifyPlugin = createLinkifyPlugin({target: '_blank'});
const blockRenderMap = Draft.DefaultDraftBlockRenderMap.set('p', {
  element: 'p',
});

export class InPlaceRichTextEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      //editing: false,
      editing: true, // FIXME
      editorState: Draft.EditorState.createWithContent(
        this.getContentState(props.value)
      ),
      value: props.value,
      maxLength: this.props.maxLength || 800,
    }

    this.globalClick = (e) => this.stopEditing(e);
  }

  componentDidMount() {
    window.addEventListener('click', this.globalClick, false);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.globalClick, false);
  }

  getContentState(html) {
    let blockArray = Draft.convertFromHTML(html, Draft.getSafeBodyFromHTML, blockRenderMap);
    // Workaround for contents of paragraph tags getting merged:
    // https://github.com/facebook/draft-js/issues/523#issuecomment-258193649
    blockArray = blockArray.map((block) => {
      return block.get('type') === 'p' ? block.set('type', 'unstyled') : block
    });
    return Draft.ContentState.createFromBlockArray(blockArray);
  }

  onChange(editorState) {
    this.setState({
      editorState: editorState,
      value: stateToHTML(this.state.editorState.getCurrentContent())
    });
  }

  componentWillReceiveProps(newProps) {
    if (newProps.value !== this.props.value) {
      let editorState = Draft.EditorState.push(
        this.state.editorState,
        this.getContentState(newProps.value)
      );
      this.setState({editorState, value: newProps.value});
    }
  }

  startEditing(event) {
    if (!this.props.readOnly) {
      event && event.stopPropagation();
      this.setState({editing: true});
    }
  }

  stopEditing(event) {
    if (!this.props.readOnly && this.state.editing) {
      event && event.stopPropagation();
      this.setState({editing: false});
      if (this.state.value !== this.props.value) {
        if (this.props.onChange) {
          this.props.onChange({
            target: {
              value: this.state.value
            }
          });
        }
      }
    }
  }

  handleKeyCommand(command) {
    const newState = Draft.RichUtils.handleKeyCommand(this.state.editorState, command);
    if (newState) {
      this.onChange(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  render() {
    let className = this.props.className || "";
    let classes = [this.props.className || "in-place-editor"];
    if (this.props.readOnly || !this.state.editing) {
      if (!this.props.readOnly) {
        classes.push("editable");
      }

      return <div className={classes.join(" ")} onClick={(e) => this.startEditing(e)}>
        <div dangerouslySetInnerHTML={{__html: this.state.value}} />
      </div>
    } else {
      classes.push("editing");
      return <div className={classes.join(" ")}
                  tabIndex='0'
                  onClick={(e) => e.stopPropagation()}>
        <PluginEditor
          editorState={this.state.editorState}
          onChange={(editorState) => this.onChange(editorState)}
          plugins={[linkifyPlugin]}
          handleKeyCommand={(e) => this.handleKeyCommand(e)} />
      </div>
    }
  }

}
