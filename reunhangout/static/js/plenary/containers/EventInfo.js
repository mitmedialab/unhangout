import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_eventinfostyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

class EventInfo extends React.Component {
  render() {
    return <div className="event-info-container">
    	<h2>{this.props.plenary.title}</h2>
    	<h4>{this.props.plenary.organizer}</h4>
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary
  }),
  (dispatch, ownProps) => ({
  })
)(EventInfo);
