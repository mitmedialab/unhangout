import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_eventinfostyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

class ContactInfo extends React.Component {
  render() {
    return <div className="event-info-container">
    	<h2>Title</h2>
    	<h4>hosted by Event Organizer</h4>
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    connected_users: state.connected_users
  }),
  (dispatch, ownProps) => ({
  })
)(ContactInfo);
