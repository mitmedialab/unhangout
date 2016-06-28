import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";

class BreakoutList extends React.Component {
  render() {
    return <div>{this.props.breakouts}</div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    breakouts: state.breakouts,
    breakouts_open: state.breakouts_open,
    breakout_mode: state.breakout_mode,
    auth: state.auth
  }),
  (dispatch, ownProps) => ({
  })
)(BreakoutList);
