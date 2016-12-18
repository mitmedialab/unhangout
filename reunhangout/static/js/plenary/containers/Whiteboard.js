import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";

import Spinner from 'react-spinkit';
import {InPlaceRichTextEditor} from './InPlaceRichTextEditor';

import * as style from "../../../scss/pages/plenary/_whiteboardstyle.scss";

const BACKSPACE_KEY_CODE = 8;
const DELETE_KEY_CODE = 46;

class Whiteboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {panelOpen: true}
  }

  //dispatch updated title upon click outside
  handleChangeWhiteboard(event) {
    this.props.onAdminSendPlenaryDetails({
      whiteboard: event.target.value
    });
  }

  render() {
    let showWhiteboard = (
      this.props.plenary.whiteboard.length > 7 ||
      this.props.auth.is_admin
    );
    if (!showWhiteboard) {
      return null;
    }
    return (
      <div className="whiteboard">
        <BS.Panel collapsible expanded={this.state.panelOpen}>
          <div>
            <InPlaceRichTextEditor
                className='whiteboard-input in-place-editor'
                readOnly={!this.props.auth.is_admin}
                value={this.props.plenary.whiteboard}
                onChange={(event) => this.handleChangeWhiteboard(event)} />
          </div>
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

