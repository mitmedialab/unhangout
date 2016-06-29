import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_embedstyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

class Embed extends React.Component {
  render() {
    return <div>
      { this.props.embeds[0] ?  <iframe {...this.props.embeds[0]} /> : "" }
      { this.props.auth.is_admin ? this.renderAdminControls() : "" }
    </div>;
  }
  renderAdminControls() {
    return <div className='embed-admin-controls'>
      <form>
      <div className="button-flex-container">
        <BS.Button bsStyle='success' className="play-button">Play for all</BS.Button>
        <BS.Button bsStyle='danger' className="remove-button">Remove Embed</BS.Button>
      </div>
        <BS.FormGroup>
          <BS.InputGroup>
            <BS.DropdownButton
              componentClass={BS.InputGroup.Button}
              id="embed-list input"
              title="Previous embeds"
            >
              <BS.MenuItem key="1">OK</BS.MenuItem>
              <BS.MenuItem key="2">Yar</BS.MenuItem>
            </BS.DropdownButton>
            <BS.FormControl type="text" 
            placeholder="YouTube URL"/>
            <BS.DropdownButton
              componentClass={BS.InputGroup.Button}
              id="input-dropdown-addon"
              title="Action"
            >
              <BS.MenuItem key="1">Set</BS.MenuItem>
              <BS.MenuItem key="2">Enqueue</BS.MenuItem>
            </BS.DropdownButton>
          </BS.InputGroup>
          </BS.FormGroup>
        <div className="button-flex-container">
        <BS.Button className="hangout-on-air-button">Create Hangout-on-Air</BS.Button>
        </div>
      </form>
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    embeds: state.plenary.embeds || [],
    auth: state.auth,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    // admin
    onAdminPlayForAll: () => dispatch(A.adminPlayForAll()),
    onAdminPauseForAll: () => dispatch(A.adminPauseForAll()),
    onAdminRemoveEmbed: (embed) => dispatch(A.adminRemoveEmbed(embed)),
    onAdminAddEmbed: (embed) => dispatch(A.adminAddEmbed(embd)),
    onAdminCreateHoA: () => dispatch(A.adminCreateHoA()),
    // user
    onSyncPlayback: () => dispatch(A.syncPlayback()),
    onBreakSyncPlayback: () => dispatch(A.breakSyncPlayback()),
  })
)(Embed);


