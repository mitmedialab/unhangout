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
import UserMenu from './UserMenu';
import PlenaryStatusAlert from './PlenaryStatusAlert';
import Whiteboard from './Whiteboard';
import WebRTCStatus from './WebRTCStatus';

class Plenary extends React.Component {
  constructor() {
    super()
    this.state = {
      alertVisible: true,
    }
  }
  handleAlertDismiss() {
    this.setState({alertVisible: false})
  }
  showContactInfoModal() {
    return (
      this.props.plenary.wrapup_emails &&
      this.props.auth.receive_wrapup_emails === null
    )
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
        <ContactInfoModal auth={this.props.auth}
                          show={this.showContactInfoModal()}
                          onChange={this.props.updateContactCard.bind(this)} />

        <WebRTCStatus />
        <ConnectionStatus />
        <div className='plenary-grid'>
          <div className='column users-col'>
            { this.props.auth.is_admin ? <PlenaryStatusAlert /> : "" }
            <PlenaryInfo plenary={this.props.plenary} />
            <UserMenu />
            <Presence
              presence={this.props.presence}
              auth={this.props.auth}
              muteOthers={!this.state.open ? this.props.plenary.admins : undefined}/>
            <div className='logo-container'>
              <a href="/" target="_blank">
                <img src={`${this.props.settings.MEDIA_URL}${this.props.settings.BRANDING.logo}`} alt="Unhangout logo"></img>
              </a>
            </div>
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
        <WebRTCStatus />
        <BS.Grid fluid>
          <BS.Row>
            <BS.Col xs={3} className="column">
              <PlenaryInfo plenary={this.props.plenary} />
              <UserMenu />
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

class ContactInfoModal extends React.Component {
  static propTypes = {
    onChange: React.PropTypes.func.isRequired,
    auth: React.PropTypes.object.isRequired,
  }
  constructor(props) {
    super(props);
    this.contactInfoFields = [
      'email', 'receive_wrapup_emails', 'contact_card_email',
      'contact_card_twitter'
    ];
    this.state = {
      errors: {}
    }
    this.contactInfoFields.forEach(field => (
      this.state[field] = this.props.auth[field]
    ));
    if (this.state.receive_wrapup_emails === null) {
      this.state.receive_wrapup_emails = true;
    }
    if (!this.state.contact_card_email && this.props.auth.email) {
      this.state.contact_card_email = this.props.auth.email;
    }
  }

  errors(state) {
    state = state || this.state;
    const errors = {};
    if (state.receive_wrapup_emails && !state.email) {
      errors.email = "Email is required if you want to receive one.";
    } else if (state.email && !/^.+@.+$/.test(state.email)) {
      errors.email = "Hmm, that doesn't look like an email address.";
    } else if (state.contact_card_email && !/^.+@.+$/.test(state.contact_card_email)) {
      errors.contact_card_email = "Hmm, that doesn't look like an email address.";
    } else if (state.contact_card_twitter && !/^@?\S+$/.test(state.contact_card_twitter)) {
      errors.contact_card_twitter = "Hmmm, that doesn't look like a twitter handle.";
    }
    if (_.size(errors) === 0) {
      return false;
    }
    return errors;
  }

  onSubmit(event) {
    event && event.preventDefault();
    const errors = this.errors();
    if (errors) {
      this.setState(errors);
    } else {
      this.setState({loading: true});
      const update = {};
      this.contactInfoFields.forEach(
        field => update[field] = this.state[field]
      )
      this.props.onChange(update);
    }
  }

  setValue(key, val) {
    const update = {
      [key]: val,
    };
    update.errors = this.errors({...this.state, ...update});
    this.setState(update);
  }

  renderFormControl(key, type, label, help) {
    let value = this.state[key];
    return (
      <BS.FormGroup controlId={`contact-info-${key}`}
        validationState={this.state.errors[key] ? 'error' : undefined}>
        {type !== "checkbox" && label ?
          <BS.ControlLabel>{label}</BS.ControlLabel>
        : null}
        {type === "text" || type === "email" ?
          <BS.FormControl
            type={type}
            label={label || undefined}
            placeholder={label}
            value={value || ""}
            onChange={(e) => this.setValue(key, e.target.value)} />
        : type === "checkbox" ?
          <BS.Checkbox
              checked={!!value}
              onChange={(e) => this.setValue(key, e.target.checked)}>
            {label}
          </BS.Checkbox>
        : `Unhandled type ${type}`}

        {this.state.errors[key] ?
          <BS.HelpBlock>{this.state.errors[key]}</BS.HelpBlock>
        : null}
        {help ?
          <BS.HelpBlock>{help}</BS.HelpBlock>
        : null}
      </BS.FormGroup>
    )
  }

  render() {
    return (
      <BS.Modal show={this.props.show} backdrop="static">
        <form onSubmit={this.onSubmit.bind(this)}>
          <BS.Modal.Header>
            <BS.Modal.Title>Contact Info</BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            <p>
              <b>
                The moderators of this event would like to introduce you to
                other participants when the event is over.
              </b>
            </p>
            {this.renderFormControl(
              "receive_wrapup_emails",
              "checkbox",
              <span>
                Receive wrap-up emails for unhangout events.{' '}
                {this.props.auth.email ?
                  <span>
                    Emails will be sent to {this.props.auth.email}.{' '}
                    (<a href='/accounts/settings/email'>change</a>)
                  </span>
                : null}
              </span>,
              null,
              true
            )}
            {!this.props.auth.email ?
              this.renderFormControl(
                "email",
                "email",
                "Account email",
                "Email address for account management. Not shared with other participants."
              )
            : null}

            <div className='contact-card-form'>
              <h3>Contact Card</h3>
              <p>This contact info will be shared with other participants.</p>
              <p>
                Name:{' '}
                <b>{this.props.auth.display_name}</b>{' '}
                (<a href='/accounts/settings/account'>change</a>)
              </p>
              {this.renderFormControl(
                "contact_card_email",
                "email",
                "Email",
                "Optional. Shared with co-participants in unhangouts."
              )}
              {this.renderFormControl(
                "contact_card_twitter",
                "text",
                "Twitter",
                "Optional. Shared with co-participants in unhangouts.",
              )}
            </div>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button bsStyle='primary' type='submit'
                disabled={!!this.errors() || this.state.loading}>
              { this.state.loading ?
                <i className='fa fa-spinner fa-spin' />
              :
                "Save"
              }
            </BS.Button>
          </BS.Modal.Footer>
        </form>
      </BS.Modal>
    )
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
    updateContactCard: (payload) => dispatch(A.updateContactCard(payload)),

  })
)(Plenary);
