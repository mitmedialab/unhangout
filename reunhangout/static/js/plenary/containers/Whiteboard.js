import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {EditorState, ContentState, convertFromHTML, getDefaultKeyBinding, RichUtils} from 'draft-js';
import {default as PluginEditor} from 'draft-js-plugins-editor';
import createLinkifyPlugin from 'draft-js-linkify-plugin';
import * as style from "../../../scss/pages/plenary/_whiteboardstyle.scss";
import 'draft-js-linkify-plugin/lib/plugin.css';
import Spinner from 'react-spinkit';
import {stateToHTML} from 'draft-js-export-html';
import { Map } from 'immutable';

const linkifyPlugin = createLinkifyPlugin({target: '_blank'});
const BACKSPACE_KEY_CODE = 8;
const DELETE_KEY_CODE = 46;

class Whiteboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      panelOpen: true,
      editorState: EditorState.createWithContent(
        this.getContentState(props.plenary.whiteboard)
      ),
      maxLength: this.props.maxLength || 800,
    }
    this.active = false;
    this.onChange = (editorState) => this.setState({editorState});
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
    this.handleModify = this.handleModify.bind(this);
  }

  getContentState(html) {
    let blockArray = convertFromHTML(html);
    return ContentState.createFromBlockArray(blockArray)
  }

  //Add an event listener that will dispatch the updated content
  componentDidMount() {
    window.addEventListener('click', this.handleModify, false);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleModify, false);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.plenary.whiteboard !== this.props.plenary.whiteboard) {
      // It's necessary to use 'push' if we have previously initialized an editor
      // state. https://github.com/draft-js-plugins/draft-js-plugins/issues/210
      let editorState = EditorState.push(
        this.state.editorState,
        this.getContentState(newProps.plenary.whiteboard)
      );
      this.setState({panelOpen: true, editorState})
    }
  }

  keyBindingFn(e) {
    let length = this.state.editorState.getCurrentContent().getPlainText().length;
    let blockAddingNewChars = (
      length >= this.state.maxLength &&
      e.keyCode !== BACKSPACE_KEY_CODE &&
      e.keyCode !== DELETE_KEY_CODE &&
      this.state.editorState.getSelection().isCollapsed()
    )
    if (blockAddingNewChars) {
      return 'block-adding-new';
    }
    return getDefaultKeyBinding(e);
  }

  handleKeyCommand (command) {
    const newState = RichUtils.handleKeyCommand(this.state.editorState, command)
    if (command === 'block-adding-new') {
      return 'handled';
    } else if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  //prevent dispatch for clicks on input bar
  handleClick(event) {
    event.stopPropagation();
    this.active = true;
  }

  //dispatch updated title upon click outside
  handleModify() {
    if (this.active) {
      this.props.onAdminSendPlenaryDetails({
        whiteboard: stateToHTML(this.state.editorState.getCurrentContent())
      });
      this.active = false;
    }
  }

  render() {
    let isAdmin = this.props.auth.is_admin;
    let classes = ['whiteboard-input'];
    let hasFocus = this.state.editorState.getSelection().getHasFocus();
    if (isAdmin && hasFocus) {
      classes.push('whiteboard-focus');
    }
    return (
      <div className="whiteboard">
        <BS.Panel collapsible expanded={this.state.panelOpen}>
          { isAdmin ?
            <div tabIndex="0"
                 className={classes.join(" ")}
                 onClick={(e) => this.handleClick(e)} >
              <PluginEditor
                editorState={this.state.editorState}
                onChange={this.onChange}
                handleKeyCommand={this.handleKeyCommand}
                plugins={[linkifyPlugin]}
                keyBindingFn={(e) => this.keyBindingFn(e)} />
            </div>
          :
            <div dangerouslySetInnerHTML={{__html: this.props.plenary.whiteboard}} />
          }
        </BS.Panel>
        <BS.Button
            onClick={() => this.setState({ panelOpen: !this.state.panelOpen })}
            className="whiteboard-button">
          {this.props.plenary.plenaryDetailsState == "sending" ?
            <Spinner spinnerName="circle" noFadeIn />
          :
            <BS.Glyphicon glyph={this.state.panelOpen ? "chevron-up" : "chevron-down"} />
          }
        </BS.Button>
      </div>
    );
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    auth: state.auth
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    onAdminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
  })
)(Whiteboard);

