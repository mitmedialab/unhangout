import React from "react";
import * as BS from "react-bootstrap";
import moment from 'moment-timezone';
import {InPlaceRichTextEditor} from './InPlaceRichTextEditor';
import {DateTimePicker} from './DateTimePicker';
import {RelativeTime} from './RelativeTime';
import {ImageInput} from './ImageInput';

export class PlenaryEditor extends React.Component {
  constructor(props) {
    super(props);
    this.plenarySettingsFields = [
      'name', 'organizer', 'start_date', 'end_date', 'doors_open',
      'doors_close', 'description', 'slug', 'public', 'image',
      'canceled',
    ];
    this.plenarySettingsFieldsRequired = ['name', 'slug'];
  }

  componentWillMount() {
    this.plenaryPropsToState(this.props);
  }

  componentWillReceiveProps(newProps) {
    let differ = false;
    this.plenarySettingsFields.forEach((f) => {
      if (newProps.plenary[f] !== this.props.plenary[f]) {
        differ = true;
      }
    });
    if (differ) {
      this.plenaryPropsToState(newProps);
    }
  }

  plenaryPropsToState(props) {
    let update = {};
    this.plenarySettingsFields.forEach((f) => update[f] = props.plenary[f]);
    this.setState(update);
  }

  renderControl(label, stateName, placeholder="", type="text", help="") {
    return (
      <BS.FormGroup
        controlId={`plenary-${stateName}`}
        className='non-margined'
        validationState={this.state[`${stateName}-error`] ? "error" : undefined}
      >
        { type === "checkbox" ?
          <BS.Checkbox checked={this.state[stateName] || false}
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
              onChange={(e) => this.setState({
                [stateName]: e.target.value,
                [`${stateName}-error`]: ''
              })} />

          : type === "slug" ?

            <div className='form-inline'>
              {`${document.location.protocol}//${document.location.host}/event/`}
              <input className='form-control' size={10}
                     value={this.state[stateName] || ""}
                     onChange={(e) => {
                       let doState = () => this.setState({[stateName]: e.target.value});
                       let doError = (err) => this.setState({[`${stateName}-error`]: err});
                       if (!e.target.value) {
                         doState();
                         doError("This field is required.")
                       } else if (/^[0-9]+$/.test(e.target.value)) {
                         doState();
                         doError("At least one letter is required")
                       } else if (/^[-a-z0-9_]+$/.test(e.target.value)) {
                         doState();
                         doError("Checking for availability...");
                         this.checkSlugAvailability(stateName, e.target.value);
                       } else {
                         doError("Only letters, numbers, dash and underscore allowed.");
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
              onChange={(value) => this.setState({[stateName]: value})} />
            
          : type === "before_start_date" ?

            <RelativeTime
              reference={this.state.start_date || moment().format()}
              referenceName='start time'
              defaultDeltaMinutes={30}
              value={this.state[stateName]}
              onChange={(value) => this.setState({[stateName]: value})} />

          : type === "after_start_date" ?

            <RelativeTime after
              reference={this.state.start_date || moment().format()}
              referenceName='start time'
              defaultDeltaMinutes={90}
              value={this.state[stateName]}
              onChange={(value) => this.setState({[stateName]: value})} />

          : type === "after_end_date" ?

            <RelativeTime after
              defaultDeltaMinutes={30}
              reference={this.state.end_date || moment().add(90, 'minutes').format()}
              referenceName='the event ends'
              value={this.state[stateName]}
              onChange={(value) => this.setState({[stateName]: value})} />

          : type === "image" ?

            <ImageInput
              value={this.state[stateName]}
              onChange={(value) => this.setState({[stateName]: value})} />

          : ""
        }
        { this.state[`${stateName}-error`] ?
            <BS.HelpBlock>{this.state[`${stateName}-error`]}</BS.HelpBlock>
          : "" }
        { help ?  <BS.HelpBlock>{help}</BS.HelpBlock> : "" }
      </BS.FormGroup>
    )
  }

  checkSlugAvailability(stateName, slug) {
    if (!this._checkSlugAvailability) {
      this._checkSlugAvailability = _.debounce((stateName, slug) => {
        let urlParts = [
          "/slug-check?slug=",
          encodeURIComponent(slug),
        ];
        if (this.props.plenary.id) {
          urlParts = urlParts.concat([
            "&id=",
            encodeURIComponent(this.props.plenary.id),
          ])
        }
        fetch(urlParts.join("")).then((res) => {
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

  onChange(event) {
    event && event.preventDefault();
    // Do not proceed if there's a validation error.
    for (let i = 0; i < this.plenarySettingsFields.length; i++) {
      let f = this.plenarySettingsFields[i];
      if (this.state[`${f}-error`]) {
        return;
      }
    }
    for (let i = 0; i < this.plenarySettingsFieldsRequired.length; i++) {
      let f = this.plenarySettingsFieldsRequired[i];
      if (!this.state[f]) {
        this.setState({[`${f}-error`]: "This field is required."});
        document.querySelector(`#plenary-${f}`).scrollIntoView();
        return;
      }
    }
    let update = {};
    this.plenarySettingsFields.forEach((f) => update[f] = this.state[f]);
    this.props.onChange(update);
  }

  render() {
    return (
      <BS.Form onSubmit={(e) => this.onChange(e)}>
        <BS.Modal.Body className='form-horizontal'>
            {this.renderControl("Title", "name", "Give your event a catchy title")}
            {this.renderControl("Image", "image", "", "image")}
            {this.renderControl("Host", "organizer", "Tell your attendees who's organizing this event")}
            {this.renderControl("Start time", "start_date", "", "datetime")}
            {this.renderControl("Doors open", "doors_open", "", "before_start_date")}
            {this.renderControl("Event duration", "end_date", "", "after_start_date", "", "")}
            {this.renderControl("Doors close", "doors_close", "", "after_end_date")}
            {this.renderControl("Description", "description", "", "richtext")}
            {this.renderControl("Public calendar", "public", "", "checkbox", "List event on the public events calendar")}
            {this.renderControl("URL", "slug", "Short name for URL", "slug")}
            {this.props.plenary.id ?
              this.renderControl("Cancel event", "canceled", "", "checkbox", "Mark event as canceled?")
            : ""}

        </BS.Modal.Body>
        <BS.Modal.Footer>
          {this.props.onClose ?
            <BS.Button className='pull-left' onClick={() => this.props.onClose()}>
              Close
            </BS.Button>
          : ""}
          <BS.Button bsStyle='primary' type='submit' disabled={this.props.loading}>
            Save
            {this.props.loading ? <i className='fa fa-spinner fa-spin' /> : ""}
          </BS.Button>
        </BS.Modal.Footer>
      </BS.Form>
    )
  }
}

PlenaryEditor.propTypes = {
  plenary: React.PropTypes.object,
  onChange: React.PropTypes.func.isRequired,
  loading: React.PropTypes.bool,
}
PlenaryEditor.defaultProps = {
  plenary: {
    doors_open: moment().subtract(30, 'minutes').format(),
    start_date: moment().format(),
    end_date: moment().add(90, 'minutes').format(),
    doors_close: moment().add(120, 'minutes').format(),
    "public": true,
  },
  loading: false
}
