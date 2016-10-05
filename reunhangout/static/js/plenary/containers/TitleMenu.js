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
import {RelativeTime} from './RelativeTime';
import moment from 'moment-timezone';

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
    this.plenarySettingsFields = [
      'name', 'organizer', 'start_date', 'end_date', 'doors_open',
      'doors_close', 'description', 'slug', 'public'
    ];
    this.state = {
      show: false,
      plenarySettingsModalOpen: true
    };
  }

  componentWillMount() {
    this.plenaryPropsToState(this.props);
  }

  componentWillReceiveProps(newProps) {
    this.plenaryPropsToState(newProps);
  }

  plenaryPropsToState(props) {
    let update = {};
    this.plenarySettingsFields.forEach((f) => update[f] = props.plenary[f]);
    this.setState(update);
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

  checkSlugAvailability(stateName, slug) {
    if (!this._checkSlugAvailability) {
      this._checkSlugAvailability = _.debounce((stateName, slug) => {
        let url = [
          "/slug-check?slug=", encodeURIComponent(slug),
          "&id=", encodeURIComponent(this.props.plenary.id),
        ].join("");
        fetch(url).then((res) => {
          if (res.status === 200) {
            res.json().then((json) => {
              if (json.slug === this.state[stateName]) {
                if (json.available) {
                  this.setState({[`${stateName}-error`]: ""});
                } else {
                  this.setState({[`${stateName}-error`]: "This URL is not available."});
                }
              }
            });
          }
        })
      }, 100)
    }
    this._checkSlugAvailability.cancel();
    this._checkSlugAvailability(stateName, slug);
  }

  showPlenarySettingsModal(event) {
    event && event.preventDefault();
    this.setState({
      show: false,
      plenarySettingsModalOpen: true
    });
  }

  updatePlenaryFromModal(event) {
    event && event.preventDefault();
    // Do not proceed if there's a validation error.
    for (let i = 0; i < this.plenarySettingsFields.length; i++) {
      let f = this.plenarySettingsFields[i];
      if (this.state[`${f}-error`]) {
        return;
      }
    }
    let update = {};
    this.plenarySettingsFields.forEach((f) => update[f] = this.state[f]);
    this.props.onAdminSendPlenaryDetails(update);
    this.setState({
      plenarySettingsModalOpen: false
    });
  }

  toggleCanceled(event) {
  }

  renderControl(label, stateName, placeholder="", type="text", help="") {
    return (
      <BS.FormGroup controlId={`plenary-${stateName}`} className='non-margined'
        validationState={this.state[`${stateName}-error`] ? "error" : undefined}
      >
        { type === "checkbox" ?
          <BS.Checkbox checked={this.state[stateName]}
              onChange={(e) => this.setState({[stateName]: e.target.checked})}>
            {label}
          </BS.Checkbox>
        :
          <BS.ControlLabel>{label}</BS.ControlLabel>
        }
        { type === "text" ?
            <BS.FormControl
              type={type}
              placeholder={placeholder}
              value={this.state[stateName] || ""}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : type === "slug" ?
            <div className='form-inline'>
              {`${document.location.protocol}//${document.location.host}/event/`}
              <input className='form-control' size={10}
                     value={this.state[stateName]}
                     onChange={(e) => {
                       let doState = () => this.setState({[stateName]: e.target.value});
                       let doError = (err) => this.setState({[`${stateName}-error`]: err});
                       if (!e.target.value) {
                         doState();
                         doError("This field is required.")
                       } else if (/^[0-9]+$/.test(e.target.value)) {
                         doState();
                         doError("At least one letter is required")
                       } else if (/^[-a-z0-9]+$/.test(e.target.value)) {
                         doState();
                         doError("Checking for availability...");
                         this.checkSlugAvailability(stateName, e.target.value);
                       } else {
                         doError("Only letters, numbers, and - allowed.");
                       }
                     }}/>
               {"/"}
               <div className='text-muted'>
                 Changing URL causes all participants to reload, interupting video.
               </div>
            </div>
          : type === "richtext" ?
            <InPlaceRichTextEditor
              value={this.state[stateName] || ""}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : type === "datetime" ?
            <DateTimePicker
              value={this.state[stateName] || ""}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
            
          : type === "before_start_date" ?
            <RelativeTime
              reference={this.state.start_date || moment().format()}
              referenceName='start time'
              defaultDeltaMinutes={30}
              value={this.state[stateName]}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : type === "after_start_date" ?
            <RelativeTime after
              reference={this.state.start_date || moment().format()}
              referenceName='start time'
              defaultDeltaMinutes={90}
              value={this.state[stateName]}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : type === "after_end_date" ?
            <RelativeTime after
              defaultDeltaMinutes={30}
              reference={this.state.end_date || moment().add(90, 'minutes').format()}
              referenceName='the event ends'
              value={this.state[stateName]}
              onChange={(e) => this.setState({[stateName]: e.target.value})} />
          : ""
        }
        { this.state[`${stateName}-error`] ?
            <BS.HelpBlock>{this.state[`${stateName}-error`]}</BS.HelpBlock>
          : "" }
        { help ?  <BS.HelpBlock>{help}</BS.HelpBlock> : "" }
      </BS.FormGroup>
    )
  }


  render() {
    return (
      <div style={{'position': 'relative', 'width': '100%'}}
           >
        <div ref='target' className='title-button' onClick={(e) => this.toggle(e)}>
          <div className='title'>
            {this.props.plenary.name} <i className='fa fa-caret-down' />
          </div>
          <div className='user'>
            {this.props.auth.display_name}
          </div>
        </div>

        <BS.Overlay rootClose
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
        <BS.Modal
          show={this.state.plenarySettingsModalOpen}
          onHide={() => this.setState({plenarySettingsModalOpen: false})}
        >
          <BS.Form onSubmit={(e) => this.updatePlenaryFromModal(e)}>
            <BS.Modal.Body className='form-horizontal'>
                {this.renderControl("Title", "name", "Give your event a catchy title")}
                {this.renderControl("Organizer", "organizer", "Tell your attendees who's organizing this event")}
                {this.renderControl("Start time", "start_date", "", "datetime")}
                {this.renderControl("Doors open", "doors_open", "", "before_start_date")}
                {this.renderControl("Event duration", "end_date", "", "after_start_date", "", "")}
                {this.renderControl("Doors close", "doors_close", "", "after_end_date")}
                {this.renderControl("Description", "description", "", "richtext")}
                {this.renderControl("Public", "public", "", "checkbox", "Should event be listed publicly?")}
                {this.renderControl("URL", "slug", "Short name for URL", "slug")}
                {this.renderControl("Cancel event", "canceled", "", "checkbox", "Mark event as canceled?")}
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
