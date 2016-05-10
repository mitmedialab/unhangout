import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";

class ContactInfo extends React.Component {
  render() {
    return <div>{this.props.auth.username}</div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    auth: state.auth
  }),
  (dispatch, ownProps) => ({
  })
)(ContactInfo);
