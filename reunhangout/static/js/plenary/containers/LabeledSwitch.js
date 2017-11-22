import React from "react";
import Switch from 'react-toggle-switch';
import * as style from '../../../scss/partials/_labeledSwitch.scss';
import "react-toggle-switch/dist/css/switch.min.css";

export class LabeledSwitch extends React.Component {
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
        <span className='switch-label'>
          <strong>{this.state.on ? this.props.onLabel : this.props.offLabel}</strong>
        </span>
        <Switch on={this.state.on}
          onClick={() => this.props.onClick && this.props.onClick()} />
      </div>
    );
  }
}
