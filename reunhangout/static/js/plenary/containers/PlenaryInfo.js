import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as style from "../../../scss/pages/plenary/_plenaryinfostyle.scss"
import * as A from "../actions";
import {Avatar} from './Avatar';

export default class PlenaryInfo extends React.Component {
  render() {
    return (
      <div className="plenary-info-container">
        <div className='title'>
            {this.props.plenary.name}
        </div>
        { this.props.plenary.organizer ?
          <div className='hosted'>
            hosted by {this.props.plenary.organizer}
          </div>
        : ""}
      </div>
    );
  }
}
