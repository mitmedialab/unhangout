import React from "react";
import Select from 'react-select';
import 'react-select/dist/react-select.css';
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
  sendOnChange() {
    this.props.onChange && this.props.onChange(this.interpretStateAsDate().format());
  }
  parseValueToState(value) {
    // zone to interpret the date by. Default to guess.
    let zone = this.state.zone || moment.tz.guess();
    let m = moment(value || undefined).tz(zone);
    this.setState({
      date: new Date(m.year(), m.month(), m.date()),
      time: this.state.time === undefined ? m.format('h:mm a') : this.state.time,
      parsedTime: m.format('HH:mm'),
      // Reset the zone to default if it is strictly undefined, otherwise use
      // the state zone. We need to allow an empty value so that the select box
      // will be cleared -- in which case we use moment.tz.guess in date
      // interpretation, but not set to state.
      zone: this.state.zone === undefined ? zone : this.state.zone,
    });
  }
  onDateChange(v) {
    let date = moment(v).toDate();
    this.setState({date: date}, () => this.sendOnChange())
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
      this.setState({
        time: v,
        parsedTime: parsedTime,
        "time-error": false,
      }, () => this.sendOnChange());
    } else {
      this.setState({"time-error": true});
      this.setState({time: v});
    }
  }
  onZoneChange(v) {
    let zone = v ? v.value : "";
    this.setState({zone: zone}, () => this.sendOnChange());
  }
  interpretStateAsDate() {
    let m = moment.tz({
      year: this.state.date.getFullYear(),
      month: this.state.date.getMonth(),
      date: this.state.date.getDate(),
      hours: parseInt(this.state.parsedTime.split(":")[0], 10),
      minutes: parseInt(this.state.parsedTime.split(":")[1], 10),
    }, this.state.zone || moment.tz.guess());
    return m;
  }
  render() {
    let selectProps = {
      placeholder: "Time zone",
      value: this.state.zone,
      onChange: (opt) => this.setState({zone: opt.value}),
      options: moment.tz.names().map((name, i) => ({
        value: name, label: name
      }))
    };
    if (this.state.zone) {
      selectProps.value = {label: this.state.zone, value: this.state.zone};
    }
    return (
      <div className='control-group'>
        <div className='form-inline'>
          <input className='form-control'
                 type='date'
                 value={moment(this.state.date).format('YYYY-MM-DD')}
                 onChange={(e) => this.onDateChange(e.target.value)} />
          <span className={this.state['time-error'] ? 'has-error' : ''}>
            <input type='text' value={this.state.time}
                   className='form-control'
                   onChange={(e) => this.onTimeChange(e.target.value)} />
          </span>
        </div>
        <div>
          Timezone:
          <Select
            placeholder="Time zone"
            value={this.state.zone}
            onChange={(opt) => this.setState({zone: opt ? opt.value : null})}
            options={moment.tz.names().map(n => ({
              value: n,
              label: n.replace(/_/g, ' ')
            }))}
          />
        </div>
        <div className='help-block'>
          {this.interpretStateAsDate().format('LLLL z (Z)')}
        </div>
      </div>
    )
  }
}
