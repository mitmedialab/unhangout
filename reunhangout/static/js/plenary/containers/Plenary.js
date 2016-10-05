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
import {Avatar} from './Avatar';
import TitleMenu from './TitleMenu';

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
            <TitleMenu />
            <PlenaryInfo plenary={this.props.plenary} />
            <Presence presence={this.props.presence} auth={this.props.auth} />



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
        <BS.Grid fluid>
          <BS.Row>
            <BS.Col xs={3} className="column users-col">
              <TitleMenu />
              <PlenaryInfo plenary={this.props.plenary} />
            </BS.Col>
            <BS.Col xs={8} className="column chat-col">
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
              <div className="guidelines">
                <h4>Get Ready for the Event:</h4>
                <ul>
                  <li>
                    Make sure you have a recent version of Firefox or Chrome.
                    (We're sorry, but breakout sessions don't work with
                    Safari, Internet Explorer/Edge, or on iOS yet. You can
                    watch the event with those browsers.)
                  </li>
                </ul>
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
