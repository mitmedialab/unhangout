import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_videocontainerstyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

class VideoContainer extends React.Component {
  render() {
    return <div className="video-container">
              <iframe
              src="https://www.youtube.com/embed/x1sXE2o3Urc"
              frameborder="0" 
              allowfullscreen>
              </iframe>
            </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    video_source: state.video_source
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
  })
)(VideoContainer);

