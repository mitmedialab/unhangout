import React from "react";
import {connect} from "react-redux";
import {LabeledSwitch} from './LabeledSwitch';
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import Breakout from './Breakout';

const MAX_BREAKOUT_SIZE = 25;

class BreakoutList extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      "create-session-dialog": false,
      "message-breakouts-dialog": false,
      "breakout-mode-dialog": false,
      "breakout_mode": this.props.plenary.breakout_mode,
      "max_attendees": 10,
      "etherpad_initial_text": this.props.plenary.etherpad_initial_text,
    }
  }
  componentWillReceiveProps(newProps) {
    this.setState({
      "breakout_mode": newProps.plenary.breakout_mode,
      "etherpad_initial_text": newProps.plenary.etherpad_initial_text,
    })
  }
  handleCreateBreakout(event, isProposal) {
    event.preventDefault();
    if (!this.state.title) {
      this.setState({"title-error": "Title is required"});
      return;
    } else if (this.state.title.length > 80) {
      this.setState({"title-error": "Maximum length 80 characters"});
      return;
    } else {
      this.setState({"title-error": ""});
    }
    let maxAttendees = parseInt(this.state.max_attendees);
    if (isNaN(maxAttendees) || maxAttendees < 2 || maxAttendees > MAX_BREAKOUT_SIZE) {
      this.setState({"max_attendees-error": `Must be a number between 2 and ${MAX_BREAKOUT_SIZE}.`});
      return;
    } else {
      this.setState({"max_attendees-error": ""});
    }
    this.props.onChangeBreakouts({
      action: "create",
      title: this.state.title,
      max_attendees: this.state.max_attendees,
      etherpad_initial_text: this.state.etherpad_initial_text,
      is_proposal: isProposal,
    });
    this.setState({
      title: "",
      'create-session-dialog': false,
    });
  }

  handleModeChange(event) {
    event.preventDefault();
    let update = {breakout_mode: this.state.breakout_mode};
    this.props.onChangeBreakoutMode({breakout_mode: this.state.breakout_mode})
    this.setState({"breakout-mode-dialog": false})
  }

  handleMessageBreakouts(event) {
    event.preventDefault();
    if (this.state.breakoutMessage) {
      this.props.onMessageBreakouts({
        message: `${this.props.auth.display_name} says: ${this.state.breakoutMessage}`
      })
      this.setState({"message-breakouts-dialog": false});
    }
  }

  toggleBreakoutsOpen() {
    this.props.onAdminSendPlenaryDetails({
      breakouts_open: !this.props.plenary.breakouts_open
    });
  }

  sortBreakouts(breakouts) {
    let approved = breakouts.filter((b) => {
      return !b.is_proposal
    })
    let unapproved = breakouts.filter((b) => {
      return b.is_proposal
    })
    return [...approved, ...unapproved]
  }

  renderModalForm(name, title, body, actionName, handler) {
    return <div className={name}>
      <BS.Modal show={this.state[name]}
                onHide={() => this.setState({[name]: false})}>
        <BS.Form onSubmit={handler}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>{title}</BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body className='form-horizontal'>
            {body}
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button onClick={() => this.setState({[name]: false})}>
              Close
            </BS.Button>
            <BS.Button bsStyle='primary' type='submit'>{actionName}</BS.Button>
          </BS.Modal.Footer>
        </BS.Form>
      </BS.Modal>
    </div>
  }

  render() {
    let breakout_mode = this.props.plenary.breakout_mode
    let breakouts = this.props.breakouts;
    if (breakout_mode === "admin") {
      breakouts = breakouts.filter(breakout => !breakout.is_proposal)
    }
    if (breakout_mode === "user") {
      breakouts = this.sortBreakouts(breakouts)
    }
    let showCreateSession = (
      breakout_mode === "user" ||
      (this.props.auth.is_admin && breakout_mode === "admin")
    );

    return <div className='breakout-list-component'>
      <div className="breakout-list-header">
        <span className='pull-right'>
          { showCreateSession ?
              <BS.OverlayTrigger placement='left' overlay={
                <BS.Tooltip id='add-breakout-tooltip'>
                  {breakout_mode === "user" ? "Propose breakout" : "Add breakout"}
                </BS.Tooltip>
              }>
                <BS.Button onClick={() => this.setState({"create-session-dialog": true})}
                    className="create-session-btn">
                  <i className='fa fa-plus' />
                </BS.Button>
              </BS.OverlayTrigger>
            : "" }
          { this.props.auth.is_admin && !this.props.auth.is_superuser ?
              <BS.OverlayTrigger placement='left' overlay={
                <BS.Tooltip id='configure-breakouts-tooltip'>
                  Breakout settings
                </BS.Tooltip>
              }>
                <BS.Dropdown
                  id="breakout-settings-button"
                  pullRight>
                  <BS.Dropdown.Toggle
                    noCaret>
                    <i className='fa fa-wrench' />
                  </BS.Dropdown.Toggle>
                  <BS.Dropdown.Menu>
                    <li className='menu-item'>
                      <LabeledSwitch
                          on={this.props.plenary.breakouts_open}
                          onLabel='Breakouts Open'
                          offLabel='Breakouts Closed'
                          onClick={() => this.toggleBreakoutsOpen()} />
                    </li>
                    <BS.MenuItem
                      onClick={() => this.setState({"breakout-mode-dialog": true})}
                      className='menu-item'>
                      <span><i className='fa fa-sliders' /> Breakout Mode</span>
                    </BS.MenuItem>
                    <BS.MenuItem
                      onClick={() => this.setState({"message-breakouts-dialog": true})}
                      className='menu-item'>
                      <span><i className='fa fa-paper-plane' /> Message Breakouts</span>
                    </BS.MenuItem>
                  </BS.Dropdown.Menu>
                </BS.Dropdown>
              </BS.OverlayTrigger>
            : "" }
            { this.props.auth.is_superuser ?
              <BS.OverlayTrigger placement='left' overlay={
                <BS.Tooltip id='configure-breakouts-tooltip'>
                  Breakout settings
                </BS.Tooltip>
              }>
                <BS.Dropdown
                  id="breakout-settings-button"
                  pullRight>
                  <BS.Dropdown.Toggle
                    noCaret>
                    <i className='fa fa-wrench' />
                  </BS.Dropdown.Toggle>
                  <BS.Dropdown.Menu>
                    <li className='menu-item'>
                      <LabeledSwitch
                          on={this.props.plenary.breakouts_open}
                          onLabel='Breakouts Open'
                          offLabel='Breakouts Closed'
                          onClick={() => this.toggleBreakoutsOpen()} />
                    </li>
                    <BS.MenuItem
                      onClick={() => this.setState({"breakout-mode-dialog": true})}
                      className='menu-item'>
                      <span><i className='fa fa-sliders' /> Breakout Mode</span>
                    </BS.MenuItem>
                    <BS.MenuItem
                      onClick={() => this.setState({"message-breakouts-dialog": true})}
                      className='menu-item'>
                      <span><i className='fa fa-paper-plane' /> Message Breakouts</span>
                    </BS.MenuItem>
                    <BS.MenuItem
                      onClick={() => this.props.onEnableSpeakerStats({enableSpeakerStats: true})}
                      className='menu-item'>
                      <span><i className='fa fa-flask' /> Enable Speaker Stats</span>
                    </BS.MenuItem>
                    <BS.MenuItem
                      onClick={() => this.props.onRequestSpeakerStats({requestSpeakerStats: true})}
                      className='menu-item'>
                      <span><i className='fa fa-microphone' /> Record Speaker Stats</span>
                    </BS.MenuItem>
                  </BS.Dropdown.Menu>
                </BS.Dropdown>
              </BS.OverlayTrigger>
            : "" }
        </span>
        <h4>Breakouts</h4>
        { this.props.breakoutCrud.error ?
            <div className="breakout-error">
              {this.props.breakoutCrud.error.message}
            </div>
          : "" }
      </div>

      <div className="breakout-list-container">
        { breakouts.map((breakout, i) => {
            return <Breakout
              plenary={this.props.plenary}
              breakout={breakout}
              presence={this.props.breakout_presence[breakout.id] || {}}
              auth={this.props.auth}
              users={this.props.users}
              key={`${i}`}
              onChangeBreakouts={this.props.onChangeBreakouts}
              MAX_BREAKOUT_SIZE={MAX_BREAKOUT_SIZE}
            />
          })
        }
      </div>

      { this.renderModalForm(
          "create-session-dialog",
          "Create Breakout",
          <div>
            <BS.FormGroup controlId="session-name" className='non-margined'
                validationState={this.state['title-error'] ? 'error' : undefined}>
              <BS.ControlLabel>Breakout Name</BS.ControlLabel>
              <BS.FormControl type="text"
                  placeholder="Breakout Name"
                  title={(this.state && this.state.title) || ""}
                  onChange={(e) => this.setState({title: e.target.value})}
                  autoFocus={true} />
              { this.state['title-error'] ?
                  <BS.HelpBlock>{this.state['title-error']}</BS.HelpBlock>
              : null }
            </BS.FormGroup>
            {this.props.auth.is_admin ?
              <BS.FormGroup
                className='non-margined'
                controlId="participant-limit"
                validationState={
                  this.state['max_attendees-error'] ? 'error' : undefined
                }
              >
                <BS.ControlLabel>Participant Limit</BS.ControlLabel>
                <BS.FormControl type="text"
                  placeholder={`Max ${MAX_BREAKOUT_SIZE}, Min 2`}
                  min={2}
                  max={MAX_BREAKOUT_SIZE}
                  value={this.state.max_attendees || ""}
                  onChange={(e) => this.setState({max_attendees: e.target.value})} />
                <BS.HelpBlock>
                  { this.state['max_attendees-error'] ?
                      this.state['max_attendees-error']
                    : `Minimum 2, Maximum ${MAX_BREAKOUT_SIZE}` }
                </BS.HelpBlock>
              </BS.FormGroup>
            : null}
            {this.props.auth.is_admin ?
              <BS.FormGroup
                className='non-margined'
                controlId='etherpad-initial-text'
                validationState={
                  this.state['etherpad_initial_text-error'] ? 'error' : undefined
                }
              >
                <BS.ControlLabel>Etherpad initial text</BS.ControlLabel>
                <BS.FormControl
                  componentClass='textarea'
                  rows={6}
                  value={this.state.etherpad_initial_text}
                  onChange={(e) => this.setState({etherpad_initial_text: e.target.value})} />
              </BS.FormGroup>
            : null}
          </div>,
          breakout_mode === "user" ? "Propose Breakout" : "Create Breakout",
          (e) => this.handleCreateBreakout(e, breakout_mode === "user")
        )
      }

      { this.renderModalForm(
          "message-breakouts-dialog",
          "Message All Breakouts",
          <BS.FormGroup controlId='breakout-message' className='non-margined'>
            <BS.HelpBlock>
              Send a notification message to all breakouts.
            </BS.HelpBlock>
            <BS.ControlLabel>Message</BS.ControlLabel>
            <BS.FormControl
              componentClass='textarea'
              placeholder='Message'
              value={this.state.breakoutMessage}
              onChange={(e) => this.setState({breakoutMessage: e.target.value})} />
            <h5>Preview</h5>
            <div className='breakout-message-preview'>
              <strong>{this.props.auth.display_name} says</strong>: {this.state.breakoutMessage}
            </div>
          </BS.FormGroup>,
          "Send Message",
          (e) => this.handleMessageBreakouts(e)
        ) }

        { this.renderModalForm(
            "breakout-mode-dialog",
            "Breakout Mode",
            <div>
              <BS.FormGroup controlId="admin-mode" className='non-margined'>
                <BS.Radio
                    checked={this.state.breakout_mode==="admin"}
                    onChange={() => this.setState({"breakout_mode": "admin"})}>
                  <strong>Host-Proposed Breakouts</strong>
                </BS.Radio>
                <BS.HelpBlock>
                  Hosts can create breakout sessions.
                </BS.HelpBlock>
                <BS.Radio checked={this.state.breakout_mode==="user"}
                    onChange={() => this.setState({"breakout_mode": "user"})}>
                  <strong>Participant-Proposed Breakouts</strong>
                </BS.Radio>
                <BS.HelpBlock>
                  Unconference mode. All participants can propose and vote on breakouts.
                </BS.HelpBlock>
              </BS.FormGroup>
            </div>,
            "Set",
            (e) => this.handleModeChange(e)
          ) }
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    breakouts: state.breakouts,
    breakoutCrud: state.breakoutCrud,
    plenary: state.plenary,
    auth: state.auth,
    users: state.users,
    breakout_presence: state.breakout_presence,
  }),
  (dispatch, ownProps) => ({
    onChangeBreakouts: (payload) => dispatch(A.changeBreakouts(payload)),
    onChangeBreakoutMode: (payload) => dispatch(A.changeBreakoutMode(payload)),
    onMessageBreakouts: (payload) => dispatch(A.messageBreakouts(payload)),
    onAdminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
    onRequestSpeakerStats: (payload) => dispatch(A.requestSpeakerStats(payload)),
    onEnableSpeakerStats: (payload) => dispatch(A.enableSpeakerStats(payload)),
  })
)(BreakoutList);
