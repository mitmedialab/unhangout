import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import {Presence} from '../../plenary/containers/Presence.js';
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss"

class Breakout extends React.Component {
  render() {
    if (!this.props.presence || !this.props.presence.channel_name) {
      return this.renderStatusMessage("Loading...");
    }
    if (this.props.presence.error_code === 'over-capacity') {
      return this.renderStatusMessage("We're sorry, but this breakout room is over capacity.  Please try another.");
    }
    if (this.props.presence.error_code === 'already-connected') {
      return this.renderStatusMessage("You seem to be connected to this breakout room in another window.");
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
        <div className='breakout-right-col'>
          <iframe src={`https://meet.jit.si/${this.props.breakout.webrtc_id}`} frameBorder={0}></iframe>
        </div>
      </div>
    </div>;
  }

  renderStatusMessage(msg) {
    return <div className='breakout-detail'>
      <ConnectionStatus />
      <BS.Grid fluid>
        <BS.Col xs={3}>
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
    auth: state.auth
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
  })
)(Breakout);
