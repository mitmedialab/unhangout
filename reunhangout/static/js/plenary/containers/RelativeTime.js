import React from "react";
import Pikaday from 'react-pikaday';
import 'pikaday/css/pikaday.css';
import 'react-selectize/themes/index.css';
import moment from 'moment-timezone';

export class RelativeTime extends React.Component {
  constructor(props) {
    super(props);
    if (props.value) {
      this.state = {
        deltaMinutes: this.timeToDelta(props.reference, props.value, props.after),
        value: moment(props.value)
      };
    } else {
      this.state = {
        deltaMinutes: props.defaultDeltaMinutes,
        value: this.deltaToTime(
          props.reference, props.defaultDeltaMinutes, props.after),
      }
    }
  }

  componentWillReceiveProps(newProps) {
    if (moment(newProps.value).diff(this.state.value, 'seconds', true) > 1) {
      this.setState({
        deltaMinutes: this.timeToDelta(
          newProps.reference, newProps.value, newProps.after),
        value: moment(newProps.value)
      })
    } else if (newProps.reference !== this.props.reference) {
      let newValue = this.deltaToTime(
        newProps.reference, this.state.deltaMinutes, newProps.after
      );
      let changed = newValue !== this.state.value;
      this.setState({
        deltaMinutes: this.state.deltaMinutes,
        value: newValue
      }, () => {
        // If our value is different after a change in reference, trigger.
        if (changed) {
          this.onChange(this.state.deltaMinutes);
        }
      });
    }
  }

  deltaToTime(reference, delta, after) {
    let method = after ? "add" : "subtract";
    return moment(reference)[method](delta, 'minutes')
  }

  timeToDelta(reference, value, after) {
    let diff = Math.round(moment(reference).diff(moment(value), 'minutes', true));
    if (after) {
      return -diff;
    }
    return diff;
  }

  onChange(deltaMinutesStr) {
    let num = parseInt(deltaMinutesStr || 0, 10);
    if (isNaN(num) || num < 0) {
      this.setState({
        deltaMinutes: deltaMinutesStr,
        "deltaMinutes-error": "Must be a positive number"
      });
      return;
    }
    let valueNum = num;
    let time = this.deltaToTime(this.props.reference, valueNum, this.props.after);
    this.setState({
      deltaMinutes: deltaMinutesStr,
      value: time,
      "deltaMinutes-error": false,
    }, () => {
      this.props.onChange && this.props.onChange(time.format())
    });
  }

  render() {
    let classes = ["form-inline"];
    if (this.state['deltaMinutes-error']) {
      classes.push('has-error');
    }
    return (
      <span className={classes.join(" ")}>
        {' '}
        <input className='form-control'
               type='text'
               size={3}
               value={this.state.deltaMinutes}
               onChange={(e) => this.onChange(e.target.value)} />
        {this.state.deltaMinutes === 1 ? ' minute ' : ' minutes '}
        {this.props.after ? " after " : " before "}
        {this.props.referenceName}: {this.state.value.format("h:mma")}
        { this.state['deltaMinutes-error'] ?
            <span className='help-block'>{this.state['deltaMinutes-error']}</span>
          : ""}
      </span>
    )
  }
}
RelativeTime.propTypes = {
  reference: React.PropTypes.string.isRequired,
  referenceName: React.PropTypes.string.isRequired,
  defaultDeltaMinutes: React.PropTypes.number,
  value: React.PropTypes.string,
  onChange: React.PropTypes.func,
  after: React.PropTypes.bool,
}
RelativeTime.defaultProps = {
  defaultDeltaMinutes: 0,
  after: false
}
