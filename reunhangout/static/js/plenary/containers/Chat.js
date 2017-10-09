import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import * as style from "../../../scss/pages/plenary/_chatstyle.scss"
import {Avatar} from './Avatar';

class AtName extends React.Component {
  render() {
    let classes = ['atname'];
    if (this.props.auth.id === this.props.mentioned.id) {
      classes.push('self');
    }
    return <span className={classes.join(" ")}>
      <BS.OverlayTrigger trigger={['hover', 'focus']} placement='right' overlay={
        <BS.Popover id={this.props.id}>
          {this.props.mentioned.display_name}
        </BS.Popover>
      }>
        <span>{this.props.text}</span>
      </BS.OverlayTrigger>
    </span>
  }
}
const ConnectedAtName = connect(
  (state) => ({
    auth: state.auth
  }),
  (dispatch, ownProps) => ({
  })
)(AtName);

/**
 * Split 'text' into an array of react components or strings, where at-names
 * are highlighted.
 */
const atnamify = (text, users, msgId) => {
  // Match @Name, @Name-name, @Name.name, but leave trailing period out.
  let parts = text.split(/(?:^|\s)@((?:\w|[^\s\w](?!$|\s))+)/gim);
  return parts.map(function(part, i) {
    if (i % 2 === 1) {
      let normalized = normalizeDisplayName(part);
      let mentioned = _.find(users, user => {
        return normalizeDisplayName(user.display_name).indexOf(normalized) === 0;
      });
      if (mentioned) {
        return <span>
          {' '}
          <ConnectedAtName text={`@${part}`}
                           mentioned={mentioned}
                           id={`atname-${msgId}-${i}`}/>
        </span>
      } else {
        return ` @${part}`;
      }
    }
    return part;
  });
}
const normalizeDisplayName = (name) => name.replace(/\s/g, "").toLowerCase();

class RawChatMessage extends React.Component {
  render() {
    let firstMsg = this.props.messages[0];
    let user = this.props.users[firstMsg.user];
    return <div className={`chat-message${firstMsg.highlight ? " highlight" : ""}`}>
      <Avatar user={firstMsg.user} idPart={`chat-message-author-${firstMsg.id}`}/>
      <div className="chat-message-text">
        <div className='userName'>{user.display_name}</div>
        <div className='message'>
          {this.props.messages.map((msg, i) => (
            <div key={`msg-${i}`}>
              {this.markup(msg)}
            </div>
          ))}
        </div>
      </div>
    </div>
  }

  markup(msg) {
    let atnamed = atnamify(msg.message, this.props.users, msg.id);
    let markedUp = _.flatten(atnamed).map((part, i) => {
      if (_.isString(part)) {
        return <span key={i} dangerouslySetInnerHTML={{__html: part}} />
      } else {
        return <span key={i}>{part}</span>;
      }
    });
    return markedUp;
  }
};
const ChatMessage = connect(state => ({users: state.users}))(RawChatMessage)

class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {highlight: false, focus: false}
  }
  componentDidMount() {
    let chatBox = this.refs.chatBox;
    chatBox.scrollTop = chatBox.scrollHeight
  }
  componentWillUpdate() {
    let chatBox = this.refs.chatBox;
    let latestMessage = this.props.chat_messages[this.props.chat_messages.length - 1];
    this.shouldScrollBottom = (
      ((chatBox.scrollTop + chatBox.offsetHeight + 15) >= chatBox.scrollHeight) ||
      latestMessage && latestMessage.user === this.props.auth.id
    );
  }
  componentDidUpdate() {
    if (this.shouldScrollBottom) {
      this.refs.chatBox.scrollTop = this.refs.chatBox.scrollHeight
    }
    if (this.state.focusOnUpdate && !this.state.focus) {
      this.setState({focus: true, focusOnUpdate: false});
    }
  }
  onSubmit(event) {
    event && event.preventDefault();
    if (this.state.value.trim()) {
      this.props.onSendMessage({
        message: this.state.value,
        highlight: this.state.highlight
      });
      this.setState({
        value: "",
        highlight: false,
        focusOnUpdate: true,
      });
    }
  }
  render() {
    let is_admin = this.props.auth.is_admin
    let chatInput = <BS.FormControl
      className="chat-composer"
      onFocus={(e) => this.setState({focus: true})}
      onBlur={(e) => this.setState({focus: false})}
      autoFocus={this.state.focus}
      inputRef={input => input && this.state.focus && input.focus()}
      type='text'
      placeholder='Type a message&hellip;'
      disabled={this.props.plenary.chat.state === "sending"}
      value={(this.state && this.state.value) || ""}
      onChange={(e) => this.setState({value: e.target.value})} />;

    // Group messages by author.
    let messagesGrouped = [];
    this.props.chat_messages.forEach(msg => {
      let prevGroup = messagesGrouped[messagesGrouped.length - 1];
      if (prevGroup && prevGroup[0].user === msg.user &&
                       prevGroup[0].highlight === msg.highlight) {
        prevGroup.push(msg);
      } else {
        messagesGrouped.push([msg]);
      }
    })

    return <div className="chat-container">
      <div className="chat-box" ref='chatBox'>
        <div className="chat-log">
          {messagesGrouped.map((msgGroup, i) => {
            return <ChatMessage
                      messages={msgGroup}
                      plenary={this.props.plenary}
                      key={`${i}`}
                      auth={this.props.auth} />
          })}
        </div>
      </div>
      <form className={
          `chat-input${this.props.plenary.chat.state === "error" ? " has-error" : ""}`
      } onSubmit={(e) => this.onSubmit(e)}>
        { is_admin ?
            <BS.FormGroup>
              <BS.InputGroup>
                {this.props.plenary.chat.state === "error" ?
                  <BS.HelpBlock>{this.props.plenary.chat.error}</BS.HelpBlock> : "" }
                  {chatInput}
                  <BS.InputGroup.Addon>
                    <input type="checkbox"
                      name="highlight"
                      id="highlight"
                      checked={this.state && this.state.highlight}
                      onChange={(e) => this.setState({highlight: e.target.checked})}
                    />
                      <label htmlFor="highlight">
                        <i className='fa fa-exclamation-circle' />
                      </label>
                  </BS.InputGroup.Addon>
              </BS.InputGroup>
            </BS.FormGroup>
          :
            <BS.FormGroup>
                {this.props.plenary.chat.state === "error" ?
                  <BS.HelpBlock>{this.props.plenary.chat.error}</BS.HelpBlock> : "" }
                {chatInput}
            </BS.FormGroup>
        }
      </form>
    </div>
  }
};

export default connect(
  // map state to props
  (state) => ({
    chat_messages: _.filter(state.chat_messages, (m) => !m.archived),
    presence: state.presence,
    plenary: state.plenary,
    auth: state.auth,
  }),
  (dispatch, ownProps) => ({
    onSendMessage: (payload) => dispatch(A.sendChatMessage(payload))
  })
)(Chat);
