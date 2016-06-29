import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";

class Whiteboard extends React.Component {
  render() {
    return <div>{this.props.plenary.whiteboard}</div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    auth: state.auth
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
  })
)(Whiteboard);

