import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState, convertFromHTML, getDefaultKeyBinding, RichUtils} from 'draft-js';
import * as style from "../../../scss/pages/plenary/_whiteboardstyle.scss";
import Spinner from 'react-spinkit';
import {stateToHTML} from 'draft-js-export-html';

class Whiteboard extends React.Component {
  constructor(props) {
    super(props);
    let blockArray = convertFromHTML(this.props.plenary.whiteboard)
    let contentState = ContentState.createFromBlockArray(blockArray)
    this.state = {
      panelOpen: true,
      editorState: EditorState.createWithContent(contentState),
    }
    this.active = false;
    this.onChange = (editorState) => this.setState({editorState});
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
  }
  //Add an event listener that will dispatch the updated content
  componentDidMount() {
    window.addEventListener('click', 
      () => this.handleModify(this.props.onAdminSendPlenaryDetails, this.state.editorState), 
      false);
  }
  componentWillUnmount() {
    window.removeEventListener('click', 
      () => this.handleModify(this.props.onAdminSendPlenaryDetails, this.state.editorState), 
      false);
  }
  componentWillReceiveProps(newProps) {
    let blockArray = convertFromHTML(newProps.plenary.whiteboard)
    let contentState = ContentState.createFromBlockArray(blockArray)
    this.setState ({
      editorState: EditorState.createWithContent(contentState),
    })
    if (newProps.plenary.whiteboard !== this.props.plenary.whiteboard) {
      this.setState({panelOpen: true,})
    }
  }
  keyBindingFn(e, contentLength) {
    if (e.keyCode !== 8 && contentLength >= 800) {
      return 'my-add';
    }
    return getDefaultKeyBinding(e);
  }
  handleKeyCommand (command) {
    const newState = RichUtils.handleKeyCommand(this.state.editorState, command)
    if (command === 'my-add') {
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
  handleModify(onAdminSendPlenaryDetails, updated) {
    if (this.active) {  
      onAdminSendPlenaryDetails({
        whiteboard: stateToHTML(updated.getCurrentContent())
      })
    this.active = false
    }
  }
  render() {
    let isAdmin = this.props.auth.is_admin;
    let whiteboardHasFocus = this.state.editorState.getSelection().getHasFocus();
    if (isAdmin) {
      return <div className="whiteboard">
        <BS.Panel collapsible expanded={this.state.panelOpen}>
          { whiteboardHasFocus ?
                <div 
                  tabIndex="0"
                  className="whiteboard-input whiteboard-focus"
                  onClick={(e) => this.handleClick(e)} >
                    <Editor 
                    editorState={this.state.editorState} 
                    onChange={this.onChange} 
                    handleKeyCommand={this.handleKeyCommand}
                      keyBindingFn={(e) => 
                        this.keyBindingFn(e, this.state.editorState.getCurrentContent().getPlainText().length)} />
                </div>
                :
                <div 
                  tabIndex="0"
                  className="whiteboard-input"
                  onClick={(e) => this.handleClick(e)} >
                    <Editor 
                    editorState={this.state.editorState} 
                    onChange={this.onChange} 
                    handleKeyCommand={this.handleKeyCommand}
                      keyBindingFn={(e) => 
                        this.keyBindingFn(e, this.state.editorState.getCurrentContent().getPlainText().length)} />
                </div>}
        </BS.Panel>
        <BS.Button 
          onClick={() => this.setState({ panelOpen: !this.state.panelOpen })}
          className="whiteboard-button">
        {this.props.plenary.plenaryDetailsState == "sending" ?
          <Spinner spinnerName="circle" noFadeIn />
          : 
          this.state.panelOpen ? 
            <BS.Glyphicon glyph="chevron-up" />
            :
            <BS.Glyphicon glyph="chevron-down" /> }
        </BS.Button>
      </div>
    } else {
      return <div className="whiteboard">
        <BS.Panel collapsible expanded={this.state.panelOpen}>
          <div dangerouslySetInnerHTML={{__html: this.props.plenary.whiteboard}} />
        </BS.Panel>
        <BS.Button 
        onClick={() => this.setState({ panelOpen: !this.state.panelOpen })}
        className="whiteboard-button">
          {this.state.panelOpen ? 
            <BS.Glyphicon glyph="chevron-up" />
            :
            <BS.Glyphicon glyph="chevron-down" /> }
        </BS.Button>
      </div>
    }
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

