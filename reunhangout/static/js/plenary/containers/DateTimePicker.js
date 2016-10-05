import React from "react";
import Pikaday from 'react-pikaday';
import 'pikaday/css/pikaday.css';
import {SimpleSelect} from 'react-selectize';
import 'react-selectize/themes/index.css';
import moment from 'moment-timezone';

export class DateTimePicker extends React.Component {
  constructor(props) {
    super(props);
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
    let zone = moment.tz.guess();
    let m = moment(value || undefined).tz(moment.tz.guess());
    this.setState({
      date: new Date(m.year(), m.month(), m.date()),
      time: (this.state && this.state.time) || m.format('h:mm a'),
      parsedTime: m.format('HH:mm'),
      zone: zone,
    });
  }
  onDateChange(v) {
    let newState = {...this.state, date: v};
    this.sendOnChange(newState);
    this.setState({date: v});
  }
  onTimeChange(v) {
    let match = /^(\d+):(\d+)\s*(am?|pm?)?$/i.exec(v.trim());
    if (match) {
      let hours = parseInt(match[1], 10) % 24;
      let minutes = parseInt(match[2], 10) % 60;
      let ampm = match[3];
      if (hours < 12 && ampm && ampm.indexOf("p") != -1) {
        hours = (hours + 12);
      } else if (hours < 10) {
        hours = "0" + hours;
      }
      if (minutes < 10) {
        minutes = "0" + minutes;
      }
      let parsedTime = `${hours}:${minutes}`;
      console.log(parsedTime);
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
    let newState = {...this.state, zone: (v ? v.value : moment.tz.guess())};
    this.props.onChange(this.interpretStateAsDate(newState).format());
    this.setState({zone: (v ? v.value : "")});
  }
  interpretStateAsDate(state) {
    state = state || this.state;
    console.log(state.parsedTime);
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
          <SimpleSelect placeholder="Time zone"
                 onValueChange={(v) => this.onZoneChange(v)}
                 value={{label: this.state.zone, value: this.state.zone}}>
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
