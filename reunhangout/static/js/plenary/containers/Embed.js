import React from "react";
import {connect} from "react-redux";
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
        <BS.Button bsStyle='success'>Play for all</BS.Button>
        <BS.Button bsStyle='danger'>Remove Embed</BS.Button>
        <BS.FormGroup>
          <BS.InputGroup>
            <BS.DropdownButton
              componentClass={BS.InputGroup.Button}
              id="embed-list"
              title="Previous embeds"
            >
              <BS.MenuItem key="1">OK</BS.MenuItem>
              <BS.MenuItem key="2">Yar</BS.MenuItem>
            </BS.DropdownButton>
            <BS.FormControl type="text" />
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
      </form>
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    embeds: state.plenary.embeds || [],
    auth: state.auth || {admin: true},
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


