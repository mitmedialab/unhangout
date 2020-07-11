import React from "react";
import RichTextEditor from 'react-rte';

export class RichTextInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: RichTextEditor.createValueFromString(props.value || '', 'html'),
    }
  }

  onChange = (value) => {
    this.setState({value});
    this.props.onChange(value.toString('html'));
  }

  render() {
    let classes = [this.props.className];
    return (
          <RichTextEditor
            value={this.state.value}
            onChange={this.onChange}
          />
    );
  }
}
