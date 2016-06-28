import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {urlRegex} from "../../utils";

/**
 * Split 'text' into an array of react components or strings that represent the
 * message content, but with URLs transformed into links.
 */
const linkify = (text) => {
  let splitter = new RegExp(urlRegex, 'gim');
  let parts = text.split(splitter);
  return parts.map(function(part, i) {
    if (i % 2 === 1) {
      return <a href={part} target='_blank' rel='nofollow noopener noreferrer'>
        {part}
      </a>
    } else {
      return part;
    }
  });
}

/**
 * Split 'text' into an array of react components or strings, where at-names
 * are highlighted.
 */
const atnamify = (text, users) => {
  let parts = text.split(/((?:\b|^)@[a-z0-9]+)/gim);
  return parts.map(function(part, i) {
    if (i % 2 === 1) {
      var normalized = part.replace(/\s/g, "").toLowerCase();
      var mentioned = _.findWhere(users, (user) => {
        return user.username.indexOf(normalized) === 0;
      });
      if (mentioned) {
        return <AtName text={part} mentioned={mentioned} />
      }
    }
    return part;
  });
}

class AtName extends React.Component {
  render() {
    // TODO: Render popover using this.props.mentioned
    return <span className='atname'>{this.props.text}</span>
  }
}

class ChatMessage extends React.Component {
  render() {
    let msg = this.props.msg;
    let markedUp = this.markup(msg.message);
    return <div>
      <span className='userName'>{msg.user.username}</span>
      <span className='message'>{markedUp}</span>
    </div>
  }

  markup(message) {
    let linked = linkify(message);
    let atnamed = linked.map((part, i) => {
      if (_.isString(part)) {
        return atnamify(part, this.props.present);
      }
      return part;
    });
    let markedUp = _.flatten(atnamed).map((part, i) => {
      return <span key={i}>{part}</span>;
    });
    return markedUp;
  }
};

class Chat extends React.Component {
  onSubmit(event) {
    event.preventDefault();
    console.log(this.props);
    this.props.onSendMessage({message: this.state.value});
    this.setState({value: ""});
  }

  render() {
    return <div>
      {this.props.chat_messages.map((msg, i) => {
        return <ChatMessage msg={msg} plenary={this.props.plenary} present={this.props.present} key={`${i}`} />
      })}
      <form className={
              `chat-input${this.props.plenary.chat.state === "error" ? " has-error" : ""}`
            }
            onSubmit={(e) => this.onSubmit(e)}>
        {this.props.plenary.chat.state === "error" ?
          <BS.HelpBlock>{this.props.plenary.chat.error}</BS.HelpBlock> : "" }
        <BS.FormControl type='text' placeholder='Chat...'
          disabled={this.props.plenary.chat.state === "sending"}
          value={(this.state && this.state.value) || ""}
          onChange={(e) => this.setState({value: e.target.value})} />
      </form>
    </div>
  }
};

export default connect(
  // map state to props
  (state) => ({
    chat_messages: state.chat_messages,
    present: state.present,
    plenary: state.plenary,
    auth: state.auth,
  }),
  (dispatch, ownProps) => ({
    onSendMessage: (details) => dispatch(A.sendChatMessage(details))
  })
)(Chat);
