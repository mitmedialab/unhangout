import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import Embed from './Embed';
import BreakoutList from './BreakoutList';
import Whiteboard from './Whiteboard';
import ContactInfo from './ContactInfo';
import ConnectedUsers from './ConnectedUsers';
import Chat from './Chat';
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';

class Plenary extends React.Component {
  render() {
    return <div className='plenary'>
      <ConnectionStatus />
      <BS.Navbar>
        <BS.Navbar.Header>
          <BS.Navbar.Brand>
            <a href=''>{this.props.plenary.name}</a>
          </BS.Navbar.Brand>
        </BS.Navbar.Header>
        <BS.Nav>
          <BS.NavItem eventKey={1} href='#'>About</BS.NavItem>
        </BS.Nav>
      </BS.Navbar>
      <BS.Grid>
        <BS.Row>
          <BS.Col xs={4}>
            <Embed />
            <BreakoutList />
          </BS.Col>
          <BS.Col xs={4}>
            <Whiteboard />
            <Chat />
          </BS.Col>
          <BS.Col xs={4}>
            <ContactInfo />
            <ConnectedUsers />
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
