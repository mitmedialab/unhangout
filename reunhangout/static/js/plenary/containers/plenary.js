import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_plenarystyle.scss"
import * as BS from "react-bootstrap";
import Embed from './Embed';
import BreakoutList from './BreakoutList';
import {Presence} from './Presence';
import Chat from './Chat';
import PlenaryInfo from './PlenaryInfo';
import {ConnectionStatus} from '../../transport';
import * as A from '../actions';

class Plenary extends React.Component {
  constructor() {
    super()
    this.state = {alertVisible: true}
  }
  handleAlertDismiss() {
    this.setState({alertVisible: false})
  }
  render() {
    if (this.props.plenary.open) {
      return <div className='plenary open'>
        <ConnectionStatus />
        <BS.Grid fluid>
          <BS.Row>
            <BS.Col xs={3} className="column users-col">
            <PlenaryInfo />
              <Presence presence={this.props.presence} auth={this.props.auth} />
              <div className="logo-container">
                <img src="../../../../media/assets/unhangout-logo-blue-full.png" className="logo"/>
              </div>
            </BS.Col>
            <BS.Col xs={5} className="column chat-col">
              <Chat />
            </BS.Col>
            <BS.Col xs={4} className="column breakout-col">
            <Embed />
              <BreakoutList />
            </BS.Col>
          </BS.Row>
        </BS.Grid>
      </div>
    } else {
      return <div className="plenary closed">
        <BS.Navbar>
          <BS.Navbar.Header>
            <BS.Navbar.Brand>
              <a href=''>{this.props.plenary.name}</a>
            </BS.Navbar.Brand>
          </BS.Navbar.Header>
          <BS.Nav>
            <BS.NavItem eventKey={1} href='#'>About</BS.NavItem>
            <BS.NavItem eventKey={1} href='#'>Events</BS.NavItem>
            <BS.NavItem eventKey={1} href='#'>FAQ</BS.NavItem>
            <BS.NavItem eventKey={1} href='#'>Blog</BS.NavItem>
          </BS.Nav>
        </BS.Navbar>
        <BS.Grid>
          <BS.Row>
            <BS.Col xs={8} className="column users-col">
              <div className="closed-plenary-info">
                <h2>{this.props.plenary.name}</h2>
                <h3>hosted by</h3>
                <h4>{this.props.plenary.organizer}</h4>
                <p>{this.props.plenary.description}</p>
              </div>
              <div className="guidelines">
                <h4>Get Ready for the Event:</h4>
                <ul>
                  <li>You'll need a Google Account (if you don't have one) to login</li>
                  <li>Install the Google Hangout plugin if you don't already have it</li>
                  <li>Watch this Unhangout video to learn more about the platform</li>
                  <li>For tips and tricks, checkout our participant guide'</li>
                </ul>
              </div>
            </BS.Col>
            <BS.Col xs={4} className="column chat-col">
            <div>
              {this.state.alertVisible ?
                this.props.auth.is_authenticated ?
                <BS.Alert 
                  bsStyle="success"  
                  onDismiss={() => {
                    this.handleAlertDismiss()}
                  }>
                  <h4>Thanks for logging in. Come back at the posted start time to participate!</h4>
                </BS.Alert>
                :
                <BS.Alert 
                  bsStyle="warning" 
                  onDismiss={() => {
                    this.handleAlertDismiss()}
                  }>
                  <h4>Please log-in above, and you will be automatically connected when the event starts.</h4>
                </BS.Alert>
    
              : ""}
            </div>
            </BS.Col>
          </BS.Row>
        </BS.Grid>
      </div>
    }
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    auth: state.auth,
    presence: state.presence
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
  })
)(Plenary);
