import React from "react";
import {connect} from "react-redux";
import Switch from 'react-toggle-switch';
import * as switchStyle from "react-toggle-switch/dist/css/switch.min.css"
import * as BS from "react-bootstrap";
import * as style from "../../../scss/pages/plenary/_titleMenu.scss"
import * as A from "../actions";
import {Avatar} from './Avatar';
import {InPlaceRichTextEditor} from './InPlaceRichTextEditor';
import {DateTimePicker} from './DateTimePicker';

class LabeledSwitch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {on: props.on};
  }
  componentWillReceiveProps(newProps) {
    if (newProps.on !== undefined) {
      this.setState({on: newProps.on});
    }
  }
  toggle(event) {
    event && event.stopPropagation();
    event && event.preventDefault();

    this.setState({on: !this.state.on});
    this.props.onClick && this.props.onClick();
  }
  render() {
    return (
      <div className='labeled-switch' style={{cursor: "pointer"}}
          onClick={(e) => this.toggle(e)}>
        <Switch on={this.state.on}
          onClick={() => this.props.onClick && this.props.onClick()} />
        {this.state.on ? this.props.onLabel : this.props.offLabel}
        <div style={{clear: "both"}} />
      </div>
    );
  }
}

export class TitleMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show: false,
      plenarySettingsModalOpen: false
    };
  }

  componentWillMount() {
    this.plenaryPropsToState(this.props);
  }

  componentWillReceiveProps(newProps) {
    this.plenaryPropsToState(newProps);
  }

  plenaryPropsToState(props) {
    this.setState({
      name: props.plenary.name,
      organizer: props.plenary.organizer,
      start_date: props.plenary.start_date,
      description: props.plenary.description
    });
  }

  toggle() {
    this.setState({show: !this.state.show});
  }

  togglePlenaryOpen() {
    this.props.onAdminSendPlenaryDetails({
      open: !this.props.plenary.open
    });
  }

  toggleBreakoutsOpen() {
    this.props.onAdminSendPlenaryDetails({
      breakouts_open: !this.props.plenary.breakouts_open
    });
  }

  showPlenarySettingsModal() {
    this.setState({
      show: false,
      plenarySettingsModalOpen: true
    });
  }

  updatePlenaryFromModal(event) {
    event && event.preventDefault();
    this.props.onAdminSendPlenaryDetails({
      name: this.state.name,
      organizer: this.state.organizer,
      start_date: this.state.start_date,
      description: this.state.description,
    });
    this.setState({
      plenarySettingsModalOpen: false
    });
  }

  renderControl(label, stateName, placeholder="", type="text", help="") {
    return (
      <BS.FormGroup controlId={`plenary-${stateName}`} className='non-margined'>
        <BS.ControlLabel>{label}</BS.ControlLabel>
        { type === "text" ?
            <BS.FormControl
              type={type}
              placeholder={placeholder}
              value={this.state[stateName] || ""}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : type === "richtext" ?
            <InPlaceRichTextEditor
              value={this.state[stateName] || ""}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : type === "datetime" ?
            <DateTimePicker
              value={this.state[stateName] || ""}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
            
          : ""
        }
        { help ?  <BS.HelpBlock>{help}</BS.HelpBlock> : "" }
      </BS.FormGroup>
    )
  }


  render() {
    return (
      <div style={{'position': 'relative', 'width': '100%'}}
           onClick={(e) => e.preventDefault()}>
        <div ref='target' className='title-button' onClick={(e) => this.toggle(e)}>
          <div className='title'>
            {this.props.plenary.name} <i className='fa fa-caret-down' />
          </div>
          <div className='user'>
            {this.props.auth.display_name}
          </div>
        </div>

        <BS.Overlay
          show={this.state.show}
          onHide={() => this.setState({show: false})}
          placement='bottom'
          container={this}
          target={() => this.refs.target}
        >
          <div className='title-menu-overlay' onClick={(e) => e.stopPropagation()}>
            <div className='user'>
              <Avatar idPart={'title-menu-overlay'} user={this.props.auth} />
              {this.props.auth.display_name}
              <div style={{clear: 'both'}} />
            </div>
            <div className='menu-item'>
              <a href='/accounts/profile/'>
                <i className='fa fa-user' /> Profile
              </a>
            </div>
            <div className='menu-item'>
              <a href='/accounts/settings/account'>
                <i className='fa fa-cog' /> Account settings
              </a>
            </div>
            <div className='menu-item'>
              <a href='/accounts/logout/'>Logout</a>
            </div>
            {this.props.auth.is_admin ? 
              <div>
                <hr />
                <div className='menu-item'>
                  <LabeledSwitch
                      on={this.props.plenary.open}
                      onLabel='Plenary open'
                      offLabel='Plenary closed'
                      onClick={() => this.togglePlenaryOpen()} />
                </div>
                <div className='menu-item'>
                  <LabeledSwitch
                      on={this.props.plenary.breakouts_open}
                      onLabel='Breakouts open'
                      offLabel='Breakouts closed'
                      onClick={() => this.toggleBreakoutsOpen()} />
                </div>
                <div className='menu-item'>
                  <a href='#' onClick={(e) => this.showPlenarySettingsModal(e)}>
                    <i className='fa fa-cogs' /> Plenary settings
                  </a>
                </div>
              </div>
            : ""}
          </div>
        </BS.Overlay>
        <BS.Modal show={this.state.plenarySettingsModalOpen} >
          <BS.Form onSubmit={(e) => this.updatePlenaryFromModal(e)}>
            <BS.Modal.Body className='form-horizontal'>
                {this.renderControl("Title", "name",
                    "Give your event a catchy title")}
                {this.renderControl("Organizer", "organizer",
                    "Tell your attendees who's organizing this event")}
                {this.renderControl("Start Date/Time", "start_date", "", "datetime", 
                    "When will the plenary start?")}
                {this.renderControl("Description", "description", "", "richtext")}
            </BS.Modal.Body>
            <BS.Modal.Footer>
              <BS.Button onClick={() => this.setState({plenarySettingsModalOpen: false})}>
                Close
              </BS.Button>
              <BS.Button bsStyle='primary' type='submit'>Save</BS.Button>
            </BS.Modal.Footer>
          </BS.Form>
        </BS.Modal>
      </div>
    )
  }
}
/*
        { is_admin ?
          <BS.Button
            onClick={() =>
              this.setState({plenaryInfoModalOpen: true})
            }>
            <BS.Glyphicon glyph="cog"></BS.Glyphicon>
          </BS.Button>
          : ""}

 --------------------------

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
*/

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    auth: state.auth,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    onAdminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
    onSendAuthDetails: (payload) => dispatch(A.sendAuthDetails(payload)),
  })
)(TitleMenu);
