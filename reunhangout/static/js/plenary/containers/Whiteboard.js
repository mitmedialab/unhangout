import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState} from 'draft-js';


class Whiteboard extends React.Component {
  constructor(props) {
    super(props);
    this.active = false;
    this.state = {
      panelOpen: true,
      editorState: EditorState.createWithContent(ContentState.createFromText(this.props.plenary.whiteboard)),
    }
    this.onChange = (editorState) => this.setState({editorState});
  }
  //Add an event listener that will dispatch the updated content
  componentDidMount() {
    window.addEventListener('click', 
      () => this.handleModify(this.props.onAdminSendsPlenaryDetails, this.state.editorState), 
      false);
  }
  componentWillUnmount() {
    window.removeEventListener('click', 
      () => this.handleModify(this.props.onAdminSendsPlenaryDetails, this.state.editorState), 
      false);
  }
  componentWillReceiveProps(newProps) {
    this.setState({
      editorState: EditorState.createWithContent(ContentState.createFromText(newProps.plenary.whiteboard))
    })
  }
  //prevent dispatch for clicks on input bar
  handleClick(event) {
    event.stopPropagation();
    this.active = true;
  }
  //dispatch updated title upon click outside 
  handleModify(onAdminSendsPlenaryDetails, updated) {
    if (this.active) {  
      onAdminSendsPlenaryDetails({
        whiteboard: updated.getCurrentContent().getPlainText()
      });
    }
    this.active = false
  }
  render() {
    let isAdmin = this.props.auth.is_admin;
    let whiteboardHasFocus = this.state.editorState.getSelection().getHasFocus();

    if (isAdmin) {
      return <div>
        <BS.Button onClick={ ()=> this.setState({ panelOpen: !this.state.panelOpen })}>
          <BS.Glyphicon glyph="chevron-down" />
        </BS.Button>
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
      </div>
    } else {
      return <div>
        <BS.Button onClick={ ()=> this.setState({ open: !this.state.panelOpen })}>
          click
        </BS.Button>
        <BS.Panel collapsible expanded={this.state.panelOpen}>
          {this.props.plenary.whiteboard}
        </BS.Panel>
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

