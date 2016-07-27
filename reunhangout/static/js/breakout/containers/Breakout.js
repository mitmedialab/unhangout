import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';
import * as style from "../../../scss/pages/breakout/_breakoutstyle.scss"

class Breakout extends React.Component {
  render() {
    if (!this.props.present || !this.props.present.path) {
      return this.renderStatusMessage("Loading...");
    }
    if (this.props.present.error_code === 'over-capacity') {
      return this.renderStatusMessage("We're sorry, but this breakout room is over capacity.  Please try another.");
    }
    if (this.props.present.error_code === 'already-connected') {
      return this.renderStatusMessage("You seem to be connected to this breakout room in another window.");
    }

    return <div className='breakout-detail'>
      <ConnectionStatus />
      <BS.Grid fluid>
        <BS.Row>
          <BS.Col xs={2}>
            <ul>
              {this.props.present.members.map((m, i) => {
                return <li key={`${i}`}>{m.username}</li>
              })}
            </ul>
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
    present: state.present,
    plenary: state.plenary,
    breakout: state.breakout,
    auth: state.auth
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
  })
)(Breakout);
