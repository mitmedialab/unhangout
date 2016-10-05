import React from "react";
import Pikaday from 'react-pikaday';
import 'pikaday/css/pikaday.css';
import {SimpleSelect} from 'react-selectize';
import 'react-selectize/themes/index.css';
import moment from 'moment-timezone';

export class DateTimePicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  componentWillMount() {
    this.parseValueToState(this.props.value);
  }
  componentWillReceiveProps(newProps) {
    this.parseValueToState(newProps.value);
  }
  sendOnChange(state) {
    state = state || this.state;
    this.props.onChange && this.props.onChange({
      target: {
        value: this.interpretStateAsDate(state).format()
      }
    });
  }
  parseValueToState(value) {
    // zone to interpret the date by. Default to guess.
    let zone = this.state.zone || moment.tz.guess();
    let m = moment(value || undefined).tz(zone);
    this.setState({
      date: new Date(m.year(), m.month(), m.date()),
      time: (this.state && this.state.time) || m.format('h:mm a'),
      parsedTime: m.format('HH:mm'),
      // Reset the zone to default if it is strictly undefined, otherwise use
      // the state zone. We need to allow an empty value so that the select box
      // will be cleared -- in which case we use moment.tz.guess in date
      // interpretation, but not set to state.
      zone: this.state.zone === undefined ? zone : this.state.zone,
    });
  }
  onDateChange(v) {
    let newState = {...this.state, date: v};
    this.sendOnChange(newState);
    this.setState({date: v});
  }
  onTimeChange(v) {
    let match = /^(\d+)(?::(\d+))?\s*(am?|pm?)?$/i.exec(v.trim());
    if (match) {
      let hours = parseInt(match[1], 10) % 24;
      let minutes = parseInt(match[2] || 0, 10) % 60;
      let ampm = (match[3] || "").toLowerCase();
      // Handle ampm.  Assume 24h if not specified.
      if (ampm) {
        if (hours === 12 && ampm.indexOf("a") != -1) {
          // Interpret "12am" as 0 am.
          hours = 0;
        } else if (hours < 12 && ampm.indexOf("p") != -1) {
          // Convert afternoon hours to 24h.
          hours = hours + 12;
        }
      }
      // Left pad.
      if (hours < 10) { hours = "0" + hours; }
      if (minutes < 10) { minutes = "0" + minutes; }

      let parsedTime = `${hours}:${minutes}`;
      let newState = {...this.state, time: v, parsedTime: parsedTime};
      this.sendOnChange(newState);
      this.setState({
        time: v,
        parsedTime: parsedTime,
        "time-error": false,
      });
    } else {
      this.setState({"time-error": true});
      this.setState({time: v});
    }
  }
  onZoneChange(v) {
    let zone = v ? v.value : "";
    let newState = {...this.state, zone: zone};
    this.sendOnChange(newState);
    this.setState({zone: zone});
  }
  interpretStateAsDate(state) {
    state = state || this.state;
    let m = moment.tz({
      year: state.date.getFullYear(),
      month: state.date.getMonth(),
      date: state.date.getDate(),
      hours: parseInt(state.parsedTime.split(":")[0], 10),
      minutes: parseInt(state.parsedTime.split(":")[1], 10),
    }, state.zone || moment.tz.guess());
    return m;
  }
  render() {
    let selectProps = {
      placeholder: "Time zone",
      onValueChange: (v) => this.onZoneChange(v)
    };
    if (this.state.zone) {
      selectProps.value = {label: this.state.zone, value: this.state.zone};
    }
    return (
      <div className='control-group'>
        <div className='form-inline'>
          <Pikaday value={this.state.date}
                 className='form-control'
                 onChange={(v) => this.onDateChange(v)} />
          <span className={this.state['time-error'] ? 'has-error' : ''}>
            <input type='text' value={this.state.time}
                   className='form-control'
                   onChange={(e) => this.onTimeChange(e.target.value)} />
          </span>
        </div>
        <div>
          <SimpleSelect {...selectProps}>
            { moment.tz.names().map((name, i) => {
              return <option value={name} key={i}>{name}</option>
            })}
          </SimpleSelect>
        </div>
        <div className='help-block'>
          {this.interpretStateAsDate().format('LLLL z (Z)')}
        </div>
      </div>
    )
  }
}
