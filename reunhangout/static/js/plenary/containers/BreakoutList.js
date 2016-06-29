import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

class Breakout extends React.Component {
  render() {
    return <div className="breakout"> 
          <h5>Title</h5>
          <BS.Button>Join</BS.Button>
          { this.props.auth.is_admin ? <BS.Button bsStyle="danger">Delete</BS.Button> : "" }
        </div>
  }
}

class BreakoutList extends React.Component {
  render() {
    return <div>
      <div className="breakout-header">
        <h4>Breakout Rooms</h4>
        { this.props.auth.is_admin ? this.renderCreateSessionButton() : "" }
      </div>
      <div className="breakouts-container">
      <div className="breakout"> 
          <h5>Title</h5>
          <BS.Button>Join</BS.Button>
          { this.props.auth.is_admin ? <BS.Button bsStyle="danger">Delete</BS.Button> : "" }
        </div>
      </div>
    </div>
  }
  renderCreateSessionButton() {
    return <BS.Button>CREATE A SESSION</BS.Button>
  }
}
      

export default connect(
  // map state to props
  (state) => ({
    breakouts: state.breakouts,
    plenary: state.plenary,
    auth: state.auth
  }),
  (dispatch, ownProps) => ({
  })
)(BreakoutList);
