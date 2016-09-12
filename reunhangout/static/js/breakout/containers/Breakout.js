import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import * as PRESENCE_ACTIONS from '../../transport/actions';
import {Presence} from '../../plenary/containers/Presence.js';
import JitsiMeetExternalAPI from "../../vendor/jitsi-meet/external_api";
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss";

class Breakout extends React.Component {
  handleDisconnectOthers(event) {
    event && event.preventDefault();
    this.props.disconnectOthers();
  }

  setupJitsiFrame(div) {
    // <iframe src={`https://meet.jit.si/${this.props.breakout.webrtc_id}`} frameBorder={0}></iframe>
    let api = new JitsiMeetExternalAPI(
      // domain
      "meet.jit.si",
      // room_name
      this.props.breakout.webrtc_id,
      // width
      undefined,
      // height
      undefined,
      // parentNode
      div,
      // configOverwrite
      undefined, 
      // interfaceConfigOvewrite
      {
        APP_NAME: JSON.stringify("foo"),
        SHOW_JITSI_WATERMARK: JSON.stringify(false),
        DEFAULT_LOCAL_DISPLAY_NAME: JSON.stringify(this.props.auth.username),
        DEFAULT_REMOTE_DISPLAY_NAME: JSON.stringify("Fellow breakouter"),
        SHOW_POWERED_BY: JSON.stringify(true),
        TOOLBAR_BUTTONS: JSON.stringify("microphone,camera,etherpad,sharedvideo,settings"),
      },
      // noSSL
      false
    );
    setTimeout(() => {
      api.executeCommand("displayName", this.props.auth.username);
    }, 10000);
  }

  render() {
    if (!this.props.presence || !this.props.presence.channel_name) {
      return this.renderStatusMessage("Loading...");
    }
    if (this.props.presence.error_code === 'over-capacity') {
      return this.renderStatusMessage("We're sorry, but this breakout room is over capacity.  Please try another.");
    }
    if (this.props.presence.error_code === 'already-connected') {
      let disconnecting = this.props.presence.action === PRESENCE_ACTIONS.DISCONNECTING_OTHERS;
      return this.renderStatusMessage(<div>
        <h2>Already connected</h2>
        <p>You seem to be connected to this breakout room in another window.</p>
        <BS.Button
            bsStyle='primary'
            onClick={(e) => this.handleDisconnectOthers(e)}
            disabled={disconnecting}>
          { disconnecting ? "..." : "Disconnect Others" }
        </BS.Button>
      </div>);
    }

    return <div className='breakout-detail'>
      <ConnectionStatus />
      <div className='breakout-columns'>
        <div className='breakout-left-col'>
          <div className="breakout-title-container">
            <span>{this.props.breakout.title}</span>
          </div>
          <Presence presence={this.props.presence} auth={this.props.auth} />
          { this.props.breakoutMessages.length > 0 ?
              <ul className='breakout-messages'>
                {
                  this.props.breakoutMessages.map((message, i) => {
                    return <li key={`message-${i}`}>{message}</li>
                  })
                }
              </ul>
            : "" }
        </div>
        <div className='breakout-right-col' ref={(div) => this.setupJitsiFrame(div)}></div>
      </div>
    </div>;
  }

  renderStatusMessage(msg) {
    return <div className='breakout-detail'>
      <ConnectionStatus />
      <BS.Grid fluid>
        <BS.Col sm={6} offset-sm={3}>
          {msg}
        </BS.Col>
      </BS.Grid>
    </div>
  }

}

export default connect(
  // map state to props
  (state) => ({
    presence: state.presence,
    plenary: state.plenary,
    breakout: state.breakout,
    breakoutMessages: state.breakoutMessages,
    auth: state.auth,
    settings: state.settings,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    disconnectOthers: (payload) => dispatch(PRESENCE_ACTIONS.disconnectOthers(payload))
  })
)(Breakout);
