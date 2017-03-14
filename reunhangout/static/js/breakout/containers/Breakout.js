import React from "react";
import {connect} from "react-redux";
import _ from 'lodash';
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import * as PRESENCE_ACTIONS from '../../transport/actions';
import {Presence} from '../../plenary/containers/Presence.js';
import WebRTCStatus from '../../plenary/containers/WebRTCStatus';
import JitsiMeetExternalAPI from "../../vendor/jitsi-meet/external_api";
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss";
import {getErrorData} from '../../utils';

class JitsiVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      jitsiTimeout: false,
      showReportModal: false
    };
  }

  setupJitsiFrame(div, props) {
    props = props || this.props;
    // API alternative to:
    // <iframe src={`https://${props.breakout.jitsi_server}/${props.breakout.webrtc_id}`} frameBorder={0}></iframe>
    this.api = new JitsiMeetExternalAPI(
      // domain
      props.breakout.jitsi_server,
      // room_name
      props.breakout.webrtc_id,
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
        APP_NAME: JSON.stringify(props.settings.BRANDING.name),
        SHOW_JITSI_WATERMARK: JSON.stringify(false),
        DEFAULT_LOCAL_DISPLAY_NAME: JSON.stringify(props.auth.display_name),
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
    this.api.executeCommand("displayName", props.auth.display_name);
    // Listen to everything.
    ["incomingMessage", "outgoingMessage", "displayNameChange",
      "participantJoined", "participantLeft", "videoConferenceJoined",
      "videoConferenceLeft", "readyToClose"].forEach(evt => {
      this.api.addEventListener(evt, (obj) => this.jitsiEvent(evt, obj))
    });
    window.__jitsiApi = this.api;
    this.jitsiLoadTimeout = setTimeout(
      () => {
        this.setState({jitsiTimeout: true});
        this.props.jitsiEvent && this.props.jitsiEvent("error", "timeout");
      },
      10000
    );
  }
  jitsiEvent(eventType, object) {
    console.log("JITSI-EVENT", eventType, object);
    if (this.jitsiLoadTimeout) {
      clearTimeout(this.jitsiLoadTimeout);
      this.setState({jitsiTimeout: false});
    }
    this.props.jitsiEvent && this.props.jitsiEvent(eventType, object);
  }
  componentDidMount() {
    if (!this.props.hide) {
      this.setupJitsiFrame(this.iframeHolder);
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
    if (this.iframeHolder) {
      this.iframeHolder.className = this.getJitsiClasses(nextProps.hide);
    }
    if (this.errorHolder) {
      this.errorHolder.className = this.getErrorClasses(nextProps.hide);
    }
    if (nextProps.hide && !this.props.hide) {
      if (this.api) {
        this.api.dispose();
      }
    } else if (!nextProps.hide && this.props.hide) {
      this.setupJitsiFrame(this.iframeHolder);
    } else if (nextProps.breakout.jitsi_server != this.props.breakout.jitsi_server) {
      this.api.dispose();
      this.setupJitsiFrame(this.iframeHolder, nextProps);
    }
  }

  /**
   * Only auto-render based on changes in props/state if jitsi load times out.
   */
  shouldComponentUpdate(nextProps, nextState) {
    return (
      !!nextState.jitsiTimeout !== !!this.state.jitsiTimeout ||
      !!nextState.showReportModal !== !!this.state.showReportModal
    );
  }

  getJitsiClasses(hide) {
    let classes = ['jitsi-video']
    if (hide) {
      classes.push('hide');
    }
    return classes.join(" ");
  }

  getErrorClasses(hide) {
    let classes = ['jitsi-error'];
    if (hide || !this.state.jitsiTimeout) {
      classes.push('hide');
    }
    return classes.join(" ");
  }

  showErrorModal(event) {
    event && event.preventDefault();
    getErrorData().then(errorData => {
      this.setState({
        reportErrorJson: JSON.stringify(errorData, null, 2),
        showReportModal: true,
      });
    });
  }

  submitErrorReport(event) {
    event && event.preventDefault();
    console.log(this.state);
    this.setState({showReportModal: false});
    this.props.errorReport({
      collected_data: this.state.reportErrorJson,
      additional_info: this.state.reportExtraInfo,
    });
    alert("Thanks! Report submitted.");
  }

  render() {
    return <div className='jitsi-video-holder'>
      <div className={this.getErrorClasses(this.props.hide)}
           ref={(el) => this.errorHolder = el}>
        <h2>Video conference connection problem</h2>
        <p>Hmmm, it appears that the breakout conference is having trouble loading.</p>
        <ul>
          <li>
            Do you have 3rd party cookies disabled?  Third party cookies
            are required for the video conferencing to work.
          </li>
          <li>
            Are you using a recent version of Firefox or Chrome?  Video
            conferencing is currently not available in Safari, Internet
            Explorer, iPads or iPhones.
          </li>
          <li>
            Did you grant permission for your browser to use the camera and microphone?
          </li>
          <li>
            Think it should work, but it still doesn't?
            <div className='form-group'>
              <button className='btn btn-default'
                      onClick={this.showErrorModal.bind(this)}>
                Submit a report
              </button>
            </div>
          </li>
        </ul>
      </div>
      <BS.Modal show={this.state.showReportModal}
                onHide={() => this.setState({showReportModal: false})}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title>Submit report</BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Form onSubmit={this.submitErrorReport.bind(this)}>
          <BS.Modal.Body className='form'>
            <BS.FormGroup>
              <BS.ControlLabel>Automatically collected data</BS.ControlLabel>
              <BS.FormControl
                componentClass='textarea'
                placeholder='Error info'
                value={this.state.reportErrorJson}
                onChange={(e) => this.setState({reportErrorJson: e.target.value})} />
            </BS.FormGroup>
            <BS.FormGroup>
              <BS.ControlLabel>Additional info</BS.ControlLabel>
              <BS.FormControl
                componentClass='textarea'
                placeholder='Additional info'
                value={this.state.reportExtraInfo}
                onChange={(e) => this.setState({reportExtraInfo: e.target.value})} />
              <BS.HelpBlock>
                Please include any extra info you can about your system, setup
                and internet connection. If you know how to paste errors from
                your browser's javascript console, that is <b>especially</b>{' '}
                helpful.
              </BS.HelpBlock>
            </BS.FormGroup>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button onClick={() => this.setState({showReportModal: false})}>
              Cancel
            </BS.Button>
            <BS.Button bsStyle='primary' type='submit'>Submit report</BS.Button>
          </BS.Modal.Footer>
        </BS.Form>
      </BS.Modal>
      <div ref={(el) => this.iframeHolder = el}
           className={this.getJitsiClasses(this.props.hide)} />
    </div>
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
                    <img src={`${this.props.settings.MEDIA_URL}${this.props.settings.BRANDING.logo}`} alt="Unhangout logo"></img>
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
    breakout: state.breakout,
    breakoutMessages: state.breakoutMessages,
    auth: state.auth,
    settings: state.settings,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    disconnectOthers: (payload) => dispatch(PRESENCE_ACTIONS.disconnectOthers(payload)),
    errorReport: (payload) => dispatch(A.errorReport(payload))
  })
)(Breakout);
