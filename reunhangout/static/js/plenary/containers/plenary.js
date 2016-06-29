import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_plenarystyle.scss"
import * as BS from "react-bootstrap";
import Embed from './Embed';
import BreakoutList from './BreakoutList';
import Whiteboard from './Whiteboard';
import Presence from './Presence';
import Chat from './Chat';
import VideoContainer from './VideoContainer';
import EventInfo from './EventInfo'
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';

class Plenary extends React.Component {
  render() {
    return <div className='plenary'>
      <ConnectionStatus />
      <BS.Grid fluid>
        <BS.Row>
          <BS.Col xs={3} className="column users-col">
          <EventInfo />
            <Presence />
            <img src="../../../../media/assets/unhangout-logo-blue-full.png" className="logo"/>
          </BS.Col>
          <BS.Col xs={5} className="column chat-col">
            <Whiteboard />
            <Chat />
          </BS.Col>
          <BS.Col xs={4} className="column breakout-col">
          <VideoContainer />
          <Embed />
            <BreakoutList />
          </BS.Col>
        </BS.Row>
      </BS.Grid>
    </div>;
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
)(Plenary);
