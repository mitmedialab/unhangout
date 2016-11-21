import React from "react";
import {connect} from "react-redux";
import moment from 'moment-timezone';
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
import PlenaryStatusBanner from './PlenaryStatusBanner';
import Whiteboard from './Whiteboard';

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
  isOpen() {
    let now = moment();
    return (
      !this.props.plenary.canceled &&
      moment(this.props.plenary.doors_open) < now &&
      moment(this.props.plenary.doors_close) > now
    );
  }
  componentWillMount() {
    this.openClockInterval = setInterval(() => {
      if (this.isOpen() !== this.state.open) {
        this.setState({open: this.isOpen()})
      }
    }, 1000);
    this.setState({open: this.isOpen()});
  }
  componentWillUnmount() {
    this.openClockInterval && this.clearInterval(this.openClock);
  }
  render() {
    if (this.state.open || this.props.auth.is_admin) {
      if (!this.props.auth.is_authenticated) {
        document.location.href = `/accounts/login/?next=${encodeURIComponent(document.location.pathname)}`;
      }
      return <div className='plenary open'>
        { this.props.auth.is_admin ? <PlenaryStatusBanner /> : "" }
        <ConnectionStatus />
        <div className='plenary-grid'>
          <div className='column users-col'>
            <TitleMenu />
            <PlenaryInfo plenary={this.props.plenary} />
            <Presence presence={this.props.presence} auth={this.props.auth} />
          </div>
          <div className='column chat-col'>
            <Whiteboard />
            <Chat />
          </div>
          <div className='column breakout-col'>
            <Embed />
            <BreakoutList />
          </div>
        </div>
      </div>
    } else {
      let startDate = moment(this.props.plenary.start_date).tz(moment.tz.guess());
      let endDate = moment(this.props.plenary.end_date).tz(moment.tz.guess());
      let doorsOpen = moment(this.props.plenary.doors_open).tz(moment.tz.guess());
      let doorsClose = moment(this.props.plenary.doors_close).tz(moment.tz.guess());
      let now = moment();
      let upcoming = !this.props.plenary.canceled && doorsOpen > now;
      return <div className="plenary closed">
        { this.props.auth.is_admin ? <PlenaryStatusBanner /> : "" }
        <BS.Grid fluid>
          <BS.Row>
            <BS.Col xs={3} className="column">
              <TitleMenu />
              { this.props.plenary.image ?
                  <img src={this.props.plenary.image} alt='' className='img-responsive' />
                : "" }
            </BS.Col>
            <BS.Col xs={8}>
              <div className="details">
                <h1>{this.props.plenary.name}</h1>
                { this.props.plenary.organizer ?
                    <p>hosted by <em>{this.props.plenary.organizer}</em></p>
                  : "" }
                { this.props.plenary.canceled ?
                  <p><b>CANCELED</b>. This event has been canceled by the organizer.</p>
                :
                  <p><b>{startDate.format('dddd LL, LT')} to {endDate.format('LT')}</b></p>
                }
                { upcoming ?
                  <p>Doors open at {doorsOpen.format('LT')}</p>
                : this.props.plenary.canceled ?
                  ""
                :
                  <p><em>This event has ended.</em></p>
                }
                <div dangerouslySetInnerHTML={{__html: this.props.plenary.description}} />
                { upcoming ? 
                  <div>
                    <h3>Get Ready for the Event:</h3>
                    <ul>
                      {
                        this.props.auth.is_authenticated ? "" :
                          <li>
                            <div className='alert alert-success'>
                              <a href='/accounts/login'>Login</a> or{' '}
                              <a href='/accounts/signup'>sign up</a>. You must be
                              signed in to attend this event.
                            </div>
                          </li>
                      }
                      <li>
                        <p>
                        Make sure you have a recent version of Firefox or Chrome.
                        </p>
                        <div className='text-muted'>
                          <p>
                          (We're sorry, but breakout sessions don't work with
                          Safari, Internet Explorer/Edge, or on iOS yet. You can
                          still watch the event with those browsers.)
                          </p>
                        </div>
                      </li>
                      <li>
                        <p>
                          Check your <a href='/accounts/settings/account/'>account settings</a> and
                          update your profile image
                          (<img src={this.props.auth.image} width={24} height={24} alt='' />)
                          or display name (<em>{this.props.auth.display_name}</em>).
                        </p>
                      </li>
                    </ul>
                  </div>
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
