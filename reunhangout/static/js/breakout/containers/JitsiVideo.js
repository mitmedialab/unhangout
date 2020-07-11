import React from "react";
import {connect} from "react-redux";
import _ from 'lodash';
import * as BS from "react-bootstrap";
import * as PRESENCE_ACTIONS from '../../transport/actions';
import JitsiMeetExternalAPI from "../../vendor/jitsi-meet/external_api";
import {getErrorData} from '../../utils';

class JitsiVideo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      jitsiTimeout: false,
      showReportModal: false,
      speakerStats: {}, // in seconds
      lastDominantSpeaker: null,
      startTimeLastSpeaker: null
    };
  }

  setupJitsiFrame(div, props) {
    props = props || this.props;
    // API alternative to:
    // <iframe src={`https://${props.breakout.jitsi_server}/${props.breakout.webrtc_id}`} frameBorder={0}></iframe>
    this.api = new JitsiMeetExternalAPI(
      // domain
      props.breakout.jitsi_server,
      {
        width: "100%",
        height: "100%",
        parentNode: div,
        roomName: props.breakout.webrtc_id,
        configOverwrite: {
          subject: props.breakout.title,
          enableWelcomePage: false,
          gatherStats: false,
          disableThirdPartyRequests: true
        }, 
        interfaceConfigOverwrite: {
          APP_NAME: props.settings.BRANDING.name,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_LOCAL_DISPLAY_NAME: props.auth.username,
          DEFAULT_REMOTE_DISPLAY_NAME: "Fellow breakouter",
          SHOW_POWERED_BY: false,
          MOBILE_APP_PROMO: false,
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "desktop",
            "chat", "filmstrip",
            "sharedvideo","settings",
            "recording", "raisehand", 'videoquality', 'tileview',
          ],
          MAIN_TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop'],
        }
      },
    );

    // Delay this in case it fails so we don't error hard.
    setTimeout(() => {
      try {
        this.api.executeCommand("displayName", props.auth.username);
      } catch (e) {
        console.error(e);
      }
    }, 10000);

    // Listen to everything.
    ["incomingMessage", "outgoingMessage", "displayNameChange",
      "participantJoined", "participantLeft", "videoConferenceJoined", 
      "dominantSpeakerChanged", "videoConferenceLeft", "readyToClose"].forEach(evt => {
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
    if (eventType === 'dominantSpeakerChanged') {
      this.handleDominantSpeakerChange(object);
    }
    this.props.jitsiEvent && this.props.jitsiEvent(eventType, object);
  }

  handleDominantSpeakerChange(object) {
    let userNames = Object.keys(this.props.users).map(key => this.props.users[key].username);
    const newDominantSpeakerUsername = this.api.getDisplayName(object.id);

    if (userNames.includes(newDominantSpeakerUsername)) {
      this.setState(prevState => {
        if (prevState.lastDominantSpeaker === null) {
          return { lastDominantSpeaker: newDominantSpeakerUsername, 
                    startTimeLastSpeaker: Date.now() }
        }            
        // Add the elapsed time to speakerStats for lastDominantSpeaker
        let speakingTime = (Date.now() - prevState.startTimeLastSpeaker) / 1000; // convert to seconds
        let speakerStats = Object.assign({}, prevState.speakerStats); 
        if (speakerStats.hasOwnProperty(prevState.lastDominantSpeaker)) {
          speakerStats[prevState.lastDominantSpeaker] += speakingTime 
        } else {
          speakerStats[prevState.lastDominantSpeaker] = speakingTime 
        }
        
        return { lastDominantSpeaker: newDominantSpeakerUsername, 
                  startTimeLastSpeaker: Date.now(),
                  speakerStats }
      })
      this.props.updateSpeakerStats({speakerStats: this.state.speakerStats});
    } else {
      // We don't track the speaking time of anyone accessing Jitsi Meet outside of Unhangout
      console.log("JITSI-EVENT user NOT present newDomSpeakerName:", newDominantSpeakerUsername);
      this.setState(prevState => {
        return { lastDominantSpeaker: null }
      })
    }
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
   * If requestSpeakerStats props have changed to true, then dispatch the speakerStats.
   */
  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.requestSpeakerStats !== this.props.requestSpeakerStats 
        && nextProps.requestSpeakerStats === true) {
      this.props.recordSpeakerStats({speakerStats: this.state.speakerStats});
      this.props.onRequestSpeakerStats({requestSpeakerStats: false})
    }

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
    this.setState({showReportModal: false});
    this.props.errorReport({
      collected_data: this.state.reportErrorJson || "{}",
      additional_info: this.state.reportExtraInfo || "",
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
            Are you using a recent version of Firefox or Chrome?  Video
            conferencing is currently <b>not available in Safari</b>, Internet
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

export default connect(
  // map state to props
  (state) => ({
    requestSpeakerStats: state.requestSpeakerStats,
    users: state.users,
  }),
  // map dispatch to props
  (dispatch) => ({
    updateSpeakerStats: (payload) => dispatch(PRESENCE_ACTIONS.updateSpeakerStats(payload)),
    recordSpeakerStats: (payload) => dispatch(PRESENCE_ACTIONS.recordSpeakerStats(payload)),
    onRequestSpeakerStats: (payload) => dispatch(PRESENCE_ACTIONS.requestSpeakerStats(payload)),
  })
)(JitsiVideo);
