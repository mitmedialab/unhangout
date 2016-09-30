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
import {Avatar} from './Presence';

class Plenary extends React.Component {
  constructor() {
    super()
    this.state = {
      alertVisible: true,
      contactInfoModalOpen: false,
    }
  }
  handleAlertDismiss() {
    this.setState({alertVisible: false})
  }
  handleSubmitContact(event) {
    event.preventDefault();
    this.props.onSendAuthDetails({
      email: this.state.email,
      twitter_handle: this.state.twitter_handle,
      linkedin_profile: this.state.linkedin_profile,
      share_info: this.state.share_info,
    });
    this.setState({contactInfoModalOpen: false})
  }
  render() {
    if (this.props.plenary.open) {
      return <div className='plenary open'>
        <ConnectionStatus />
        <BS.Grid fluid>
          <BS.Row>
            <BS.Col xs={3} className="column users-col">
            <PlenaryInfo />
            <img src={this.props.settings.LOGO_URL} className="logo"/>
            <Presence presence={this.props.presence} auth={this.props.auth} />

            <div className="user-menu-container">
              <Avatar user={this.props.auth} gridView={true} />
              <h4>{this.props.auth.display_name}</h4>
              <BS.Dropdown
                id="user-menu-button"
                dropup
                pullRight>
                <BS.Dropdown.Toggle
                  noCaret>
                  <BS.Glyphicon glyph="chevron-up" />
                </BS.Dropdown.Toggle>
                <BS.Dropdown.Menu>
                  <BS.MenuItem
                    onClick={(e) => this.setState({contactInfoModalOpen: true})}>
                    My Contact Info
                  </BS.MenuItem>
                </BS.Dropdown.Menu>
              </BS.Dropdown>
            </div>

            <div className="contact-info-dialog">
              <BS.Modal show={this.state.contactInfoModalOpen} >
                <BS.Modal.Header>
                  <BS.Modal.Title>My contact information</BS.Modal.Title>
                </BS.Modal.Header>
                <BS.Modal.Body>
                  <p>What is this for? After the event, we will send you an email with
                  the names and contact information of the people you interacted with
                  (we will send a similar email to each participants). That way you can
                  follow up and continue the conversations you started today.</p>
                  <p>We care about privacy and will never share your contact information
                  with people outside of the event.</p>
                  <p>What is the best way for other participants to reach you?</p>
                  <BS.Form horizontal>
                    <BS.FormGroup controlId="email">
                      <BS.Col sm={2}>Email</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl
                          type="text"
                          placeholder="Email Address"
                          value={(this.state && this.state.email) || ""}
                          onChange={(e) => this.setState({email: e.target.value})} />
                      </BS.Col>
                    </BS.FormGroup>
                    <BS.FormGroup controlId="twitter-handle">
                      <BS.Col sm={2}>Twitter Handle</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl
                          type="text"
                          placeholder="@TwitterHandle"
                          value={(this.state && this.state.twitter_handle) || ""}
                          onChange={(e) => this.setState({twitter_handle: e.target.value})}/>
                      </BS.Col>
                    </BS.FormGroup>
                     <BS.FormGroup controlId="linkedin-profile">
                      <BS.Col sm={2}>LinkedIn Profile</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl
                          type="text"
                          placeholder="LinkedIn Profile URL"
                          value={(this.state && this.state.linkedin_profile) || ""}
                          onChange={(e) => this.setState({linkedin_profile: e.target.value})}/>
                      </BS.Col>
                    </BS.FormGroup>
                    <BS.FormGroup controlId="share-info">
                      <BS.Col sm={2}>
                        <BS.Checkbox
                        checked={this.state.share_info}
                        onChange={() =>
                          this.setState({share_info: !this.state.share_info})}>
                        </BS.Checkbox>
                      </BS.Col>
                      <BS.Col sm={10}>I would rather not share my info with other unhangout participants</BS.Col>
                    </BS.FormGroup>
                  </BS.Form>
                </BS.Modal.Body>
                <BS.Modal.Footer>
                  <BS.Button
                  onClick={(e) => this.handleSubmitContact(e)}>
                  Submit</BS.Button>
                </BS.Modal.Footer>
              </BS.Modal>
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
                  <li>Watch this video to learn more about the platform</li>
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
    presence: state.presence,
    settings: state.settings,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    onSendAuthDetails: (payload) => dispatch(A.sendAuthDetails(payload)),

  })
)(Plenary);
