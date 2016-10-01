import React from "react";

import * as style from "../../../scss/partials/_inPlaceEditor.scss";

export class InPlaceEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
      value: this.props.value,
    }

    this.globalClick = (e) => this.stopEditing(e);
  }

  componentWillReceiveProps(newProps) {
    this.setState({value: newProps.value});
  }

  componentDidMount() {
    window.addEventListener('click', this.globalClick, false);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.globalClick, false);
  }

  onChange(event) {
    let value = event.target.value;
    if (this.props.maxLength === undefined || value.length < this.props.maxLength) {
      this.setState({value});
    }
  }

  onSubmit(event) {
    event && event.preventDefault();
    this.stopEditing();
  }

  startEditing(event) {
    if (!this.props.readOnly && !this.state.editing) {
      event && event.stopPropagation();
      this.setState({editing: true});
    }
  }

  stopEditing(event) {
    if (!this.props.readOnly && this.state.editing) {
      event && event.preventDefault();
      this.setState({editing: false});
      if (this.state.value !== this.props.value) {
        this.props.onChange && this.props.onChange({
          target: {value: this.state.value}
        });
      }
    }
  }

  render() {
    let classes = [this.props.className || 'in-place-editor'];
    if (this.state.editing) {
      classes.push('editing');
      return <div className={classes.join(" ")} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => this.onSubmit(e)}>
          <input type='text'
                 value={this.state.value}
                 onChange={(e) => this.onChange(e)} />
        </form>
      </div>
    } else {
      if (!this.props.readOnly) {
        classes.push('editable');
      }
      return <div className={classes.join(" ")} onClick={(e) => this.startEditing(e)}>
        {this.state.value}
      </div>
    }
  }
}
