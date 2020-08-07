import React from "react";
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import moment from 'moment-timezone';


/* Select a date and time and pass to onChange in ISO 8601 format */

export class DateTimePicker extends React.Component {
  constructor(props) {
    super(props);
    let zone = moment.tz.guess();
    let datetime = moment(this.props.value || undefined).tz(zone);
    this.state = {
      zone,
      date: datetime.format('YYYY-MM-DD'),
      time: datetime.format('h:mm a'),
      parsedTime: datetime.format('HH:mm'),
    };
  }

  sendOnChange() {
    let datetime = this.interpretStateAsDate();
    console.log(`sendOnChange datetime=${datetime}`);
    if (this.props.onChange) {
      this.props.onChange(datetime.isValid() ? datetime.format() : '');
    }
  }

  onDateChange(v) {
    console.log(`onDateChange(${v})`);
    this.setState({date: v}, () => this.sendOnChange())
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
        timeError: false,
      }, () => this.sendOnChange());
    } else {
      this.setState({timeError: true, time: v, parsedTime: ''});
    }
  }

  onZoneChange(v) {
    let zone = v ? v.value : null;
    this.setState({zone: zone}, () => this.sendOnChange());
  }

  interpretStateAsDate() {
    let date = moment(this.state.date).toDate();
    if (this.state.parsedTime.indexOf(':') != 2){
      return moment('');
    }
    let hours = parseInt(this.state.parsedTime.split(":")[0], 10);
    let minutes = parseInt(this.state.parsedTime.split(":")[1], 10);
    let m = moment.tz({
      year: date.getFullYear(),
      month: date.getMonth(),
      date: date.getDate(),
      hours, 
      minutes,
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
    let datetime = moment(this.props.value).tz(this.state.zone || moment.tz.guess());

    return (
      <div className='control-group'>
        <div className='form-inline'>
          <input className='form-control'
                 type='date'
                 value={this.state.date}
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
            onChange={this.onZoneChange.bind(this)}
            options={moment.tz.names().map(n => ({
              value: n,
              label: n.replace(/_/g, ' ')
            }))}
          />
        </div>
        <div className='help-block'>
          {datetime.format('LLLL z (Z)')}
        </div>
      </div>
    )
  }
}
