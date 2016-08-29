import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState, convertFromHTML, convertFromRaw, convertToRaw} from 'draft-js';
import * as style from "../../../scss/pages/plenary/_whiteboardstyle.scss";
import Spinner from 'react-spinkit'

class Whiteboard extends React.Component {
  constructor(props) {
    super(props);
    console.log('constructor', this.props.plenary.whiteboard)
    let blockArray = convertFromHTML(this.props.plenary.whiteboard)
    let contentState = ContentState.createFromBlockArray(blockArray)
    this.state = {
      panelOpen: true,
      editorState: EditorState.createWithContent(contentState),
    }
    this.active = false;
    this.onChange = (editorState) => this.setState({editorState});
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
    this.setState = {
      editorState: EditorState.createWithContent(contentState),
    }
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
        whiteboard: updated.getCurrentContent().getPlainText()
      });
    }
    this.active = false
  }
  render() {
    console.log(convertToRaw(this.state.editorState.getCurrentContent()))
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
                    onChange={this.onChange} />
                </div>
                :
                <div 
                  tabIndex="0"
                  className="whiteboard-input"
                  onClick={(e) => this.handleClick(e)} >
                    <Editor 
                    editorState={this.state.editorState} 
                    onChange={this.onChange} />
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
          {this.props.plenary.whiteboard}
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

