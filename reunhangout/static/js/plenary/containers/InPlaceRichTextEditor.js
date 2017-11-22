import React from "react";
import RichTextEditor from 'react-rte';

import * as style from "../../../scss/partials/_inPlaceEditor.scss";

export class InPlaceRichTextEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
      value: RichTextEditor.createValueFromString(`<span>${props.value}</span>` || '', 'html'),
      maxLength: this.props.maxLength || 800,
    }
    this.globalClick = (e) => this.stopEditing(e);
  }

  componentDidMount() {
    window.addEventListener('click', this.globalClick, false);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.globalClick, false);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.value !== this.props.value) {
      this.setState({
        value: RichTextEditor.createValueFromString(newProps.value, 'html')
      });
    }
  }

  startEditing(event) {
    if (!this.props.readOnly) {
      event && event.stopPropagation();
      this.setState({editing: true});
    }
  }

  stopEditing(event) {
    if (!this.props.readOnly && this.state.editing) {
      event && event.stopPropagation();
      this.setState({editing: false});
      if (this.state.value !== this.props.value) {
        if (this.props.onChange) {
          this.props.onChange({
            target: {value: this.state.value.toString('html')}
          });
        }
      }
    }
  }

  render() {
    let classes = [this.props.className || "in-place-editor"];
    if (this.props.readOnly || !this.state.editing) {
      if (!this.props.readOnly) {
        classes.push("editable");
      }

      return (
        <div className={classes.join(" ")}
             onClick={(e) => this.startEditing(e)}>
          <div dangerouslySetInnerHTML={{
            __html: this.state.value.toString('html')
          }} />
        </div>
      );
    } else {
      classes.push("editing");
      return (
        <div className={classes.join(" ")}
                    tabIndex='0'
                    onClick={(e) => e.stopPropagation()}>
          <RichTextEditor
            value={this.state.value}
            onChange={(v) => this.setState({value: v})}
            toolbarConfig={{display: []}}
          />
        </div>
      );
    }
  }

}
