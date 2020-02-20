import React from "react";
import PropTypes from 'prop-types';
import {connect} from "react-redux";
import _ from 'lodash';
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import * as PRESENCE_ACTIONS from '../../transport/actions';
import {sortPresence} from '../../plenary/containers/Presence.js';
import {Avatar} from "../../plenary/containers/Avatar";
import JitsiVideo from "./JitsiVideo";
import WebRTCStatus from '../../plenary/containers/WebRTCStatus';
import JitsiMeetExternalAPI from "../../vendor/jitsi-meet/external_api";
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss";
import {getErrorData} from '../../utils';

class Etherpad extends React.Component {
  static propTypes = {
    server: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    auth: PropTypes.object.isRequired,
  }

  getUrl(props) {
    return `https://${this.props.server}/p/${this.props.id}?userName=${this.props.auth.display_name}&showChat=false`;
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.getUrl(this.props) !== this.getUrl(nextProps); 
  }
  
  render() {
    return <div className='etherpad-holder'>
      <iframe src={this.getUrl(this.props)} />
    </div>
  }
}

class Presence extends React.Component {
  static propTypes = {
    presence: PropTypes.object.isRequired,
    auth: PropTypes.object.isRequired,
  }

  render() {
    return (
      <div className='breakout-presence'>
        <span className='count'>
          <i className='fa fa-child' />
          {this.props.presence.members.length}
        </span>
        {
          sortPresence(this.props.presence, this.props.auth).map((user => (
            <div className='present' key={user.username}>
              <Avatar user={user}
                      detailView={false}
                      idPart={`breakout-presence-${user.username}`} />
              <span className='name'>{user.display_name}</span>
            </div>
          )))
        }
      </div>
    );
  }
}

class Breakout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showEtherpad: props.breakout.etherpad_start_open,
      splitBasis: "50%",
      handleWidth: "20px",
      dragging: false,
    }
  }

  componentDidMount() {
    this.boundResizeOnMouseUp = this.resizeOnMouseUp.bind(this);
    this.boundResizeOnMouseMove = this.resizeOnMouseMove.bind(this);
    document.addEventListener('mouseup', this.boundResizeOnMouseUp, false);
    document.addEventListener('mousemove', this.boundResizeOnMouseMove, false);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.boundResizeOnMouseUp, false);
    document.removeEventListener('mousemove', this.boundResizeOnMouseMove, false);
  }

  handleDisconnectOthers(event) {
    event && event.preventDefault();
    this.props.disconnectOthers();
  }

  resizeOnMouseDown(event) {
    this.setState({dragging: true});
    this.videoDiv.style.pointerEvents = 'none';
    if (this.etherpadDiv) {
      this.etherpadDiv.style.pointerEvents = 'none';
    }
  }

  resizeOnMouseMove(event) {
    if (!this.state.dragging) {
      return;
    }
    this.setState({
      splitBasis: ((event.clientX / this.interactionDiv.offsetWidth) * 100) + "%"
    });
  }

  resizeOnMouseUp(event) {
    this.setState({dragging: false});
    this.videoDiv.style.pointerEvents = 'auto';
    if (this.etherpadDiv) {
      this.etherpadDiv.style.pointerEvents = 'auto';
    }
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
    const handleStyle = {width: "5px"};
    const videoStyle = {
      width: (
        this.state.showEtherpad ?
           `calc(${this.state.splitBasis} - ${handleStyle.width} / 2)`
        : "100%"
      )
    };
    const etherpadStyle = {
      width: `calc(100% - ${this.state.splitBasis} - ${handleStyle.width} / 2)`
    };

    return <div className='breakout-detail' onMouseMove={this.resizeOnMouseMove.bind(this)}>
      {/* Utility div to capture drag events when we're over iframes. */}
      <ConnectionStatus />
      <WebRTCStatus />
      {this.props.breakoutMessages.length > 0 ?
        <ul className='breakout-messages'>
          {
            this.props.breakoutMessages.map((message, i) => {
              return <li key={`message-${i}`}>{message}</li>
            })
          }
        </ul>
      : null }
      <div className='breakout-layout'>
        <div className='titlebar'>
          <span className='title'><span>{this.props.breakout.title}</span></span>
          <Presence presence={this.props.presence} auth={this.props.auth} />
          <span className='logo'>
            <a href="/" target="_blank">
              <img src={`${this.props.settings.MEDIA_URL}${this.props.settings.BRANDING.logo}`} alt="Unhangout logo"></img>
            </a>
          </span>
          <button className='btn btn-default'
                  title='Show or hide shared document'
                  onClick={(e) => this.setState({showEtherpad: !this.state.showEtherpad})}>
            <i className='fa fa-file-text-o fa-2x' />
          </button>
        </div>
        <div className='interaction' ref={(el) => this.interactionDiv = el}>
          <div className='video' style={videoStyle} ref={(el) => this.videoDiv = el}>
            { errorMessage ? <div className='container'>{errorMessage}</div> : "" }
            <JitsiVideo {...this.props} hide={!!errorMessage} />
          </div>
          {this.state.showEtherpad ? [
            <div className='handle' key='1' style={handleStyle}
                 onMouseDown={this.resizeOnMouseDown.bind(this)}
            />,
            <div className='etherpad' key='2' style={etherpadStyle}
                 ref={(el) => this.etherpadDiv = el}>
              <Etherpad id={this.props.breakout.etherpad_id}
                        server={this.props.settings.ETHERPAD_SERVER}
                        auth={this.props.auth} />
            </div>
          ] : null}
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
