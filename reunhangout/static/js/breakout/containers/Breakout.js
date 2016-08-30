import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import {Presence} from '../../plenary/containers/Presence.js';
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss"

class Breakout extends React.Component {
  render() {
    console.log(this.props.breakout)
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
      <BS.Grid fluid>
        <BS.Row>
          <BS.Col xs={2}>
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
          </BS.Col>
          <BS.Col xs={10}>
            <iframe src={`https://meet.jit.si/${this.props.breakout.webrtc_id}`}
              width={800} height={480}></iframe>
          </BS.Col>
        </BS.Row>
      </BS.Grid>
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
