import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import * as PRESENCE_ACTIONS from '../../transport/actions';
import {Presence} from '../../plenary/containers/Presence.js';
import WebRTCStatus from '../../plenary/containers/WebRTCStatus';
import JitsiMeetExternalAPI from "../../vendor/jitsi-meet/external_api";
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss";

class JitsiVideo extends React.Component {
  setupJitsiFrame(div) {
    // API alternative to:
    // <iframe src={`https://jitsi.unhangout.io/${this.props.breakout.webrtc_id}`} frameBorder={0}></iframe>
    this.api = new JitsiMeetExternalAPI(
      // domain
      "jitsi.unhangout.io",
      // room_name
      this.props.breakout.webrtc_id,
      // width
      undefined,
      // height
      undefined,
      // parentNode
      div,
      // configOverwrite
      {
        disableStats: JSON.stringify(true),
        enableWelcomePage: JSON.stringify(false),
        callStatsID: JSON.stringify(""),
        callStatsSecret: JSON.stringify(""),
        disableThirdPartyRequests: JSON.stringify(true),
        logStats: JSON.stringify(false)
      }, 
      // interfaceConfigOvewrite
      {
        APP_NAME: JSON.stringify(this.props.settings.BRANDING.name),
        SHOW_JITSI_WATERMARK: JSON.stringify(false),
        DEFAULT_LOCAL_DISPLAY_NAME: JSON.stringify(this.props.auth.display_name),
        DEFAULT_REMOTE_DISPLAY_NAME: JSON.stringify("Fellow breakouter"),
        SHOW_POWERED_BY: JSON.stringify(true),
        TOOLBAR_BUTTONS: JSON.stringify([
          "microphone","camera",
          //"desktop", // May be able to enable; need more tests
          "chat", "etherpad", "filmstrip",
          "sharedvideo","settings",
          "recording" // As of 2016-11-27, jitsi fails if recording button isn't included
        ]),
      },
      // noSSL
      false
    );
    this.api.executeCommand("displayName", this.props.auth.display_name);
  }
  componentDidMount() {
    if (!this.props.hide) {
      this.setupJitsiFrame(this.refs.iframeHolder);
    }
  }
  componentWillUnmount() {
    if (this.api) {
      this.api.dispose();
    }
  }
  /**
   * When receiving props, manually add the 'hide' class if we are
   * transitioning to hidden.  `shouldComponentUpdate` will prevent a render in
   * this case, so that we have time for `api.dispose` to run.
   */
  componentWillReceiveProps(nextProps) {
    if (nextProps.hide && !this.props.hide) {
      if (this.api) {
        this.api.dispose();
      }
      this.refs.iframeHolder.className = this.getClasses(nextProps.hide);
    } else if (!nextProps.hide && this.props.hide) {
      this.refs.iframeHolder.className = this.getClasses(nextProps.hide);
      this.setupJitsiFrame(this.refs.iframeHolder);
    }
  }

  /**
   * Never auto-render based on changes in props/state.
   */
  shouldComponentUpdate(nextProps, nextState) {
    return false;
  }

  getClasses(hide) {
    let classes = ['jitsi-video']
    if (hide) {
      classes.push('hide');
    }
    return classes.join(" ");
  }

  render() {
    return <div className={this.getClasses(this.props.hide)} ref='iframeHolder'></div>
  }
}

class Breakout extends React.Component {
  handleDisconnectOthers(event) {
    event && event.preventDefault();
    this.props.disconnectOthers();
  }

  render() {
    let errorMessage;
    if (!this.props.presence || !this.props.presence.channel_name) {
      errorMessage = "Loading...";
    }
    if (this.props.presence.error_code === 'over-capacity') {
      errorMessage = "We're sorry, but this breakout room is over capacity.  Please try another.";
    }
    if (this.props.presence.error_code === 'already-connected') {
      let disconnecting = this.props.presence.action === PRESENCE_ACTIONS.DISCONNECTING_OTHERS;
      errorMessage = <div>
        <h2>Already connected</h2>
        <p>You seem to be connected to a breakout room in another window.</p>
        <BS.Button
            bsStyle='primary'
            onClick={(e) => this.handleDisconnectOthers(e)}
            disabled={disconnecting}>
          { disconnecting ? "..." : "Disconnect Others" }
        </BS.Button>
      </div>;
    }

    return <div className='breakout-detail'>
      <ConnectionStatus />
      <WebRTCStatus />
      <div className='breakout-columns'>
        <div className={'breakout-left-col' + (errorMessage ? ' hide' : '')}>
          { errorMessage ?
              ""
            :
              <div className="breakout-sidebar-container">
                <div className="breakout-title-container">
                  <span>{this.props.breakout.title}</span>
                </div>
                <Presence presence={this.props.presence} auth={this.props.auth} />
                <div className='logo-container'>
                  <a href="/" target="_blank">
                    <img src="../../../media/assets/unhangout-logo-FULL.svg" alt="Unhangout logo"></img>
                  </a>
                </div>
              </div>
          }
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
        <div className='breakout-right-col'>
          { errorMessage ? <div className='container'>{errorMessage}</div> : "" }
          <JitsiVideo {...this.props} hide={!!errorMessage} />
        </div>
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
