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
    if (this.props.auth.username === this.props.mentioned.username) {
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
  let parts = text.split(/(?:^|\s)@([a-z0-9]+)/gim);
  return parts.map(function(part, i) {
    if (i % 2 === 1) {
      let normalized = normalizeDisplayName(part);
      let mentioned = _.find(users, (user) => {
        return normalizeDisplayName(user.display_name).indexOf(normalized) === 0;
      });
      if (mentioned) {
        if (self.username === mentioned.username) {
        }
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

class ChatMessage extends React.Component {
  render() {
    let msg = this.props.msg;
    let markedUp = this.markup(msg.message);
    return <div className={`chat-message${msg.highlight ? " highlight" : ""}`}>
      <Avatar user={msg.user} idPart={`chat-message-author-${msg.id}`}/>
      <div className="chat-message-text">
        <span className='userName'>{msg.user.display_name}</span>
        <br></br>
        <span className='message'>{markedUp}</span>
      </div>
    </div>
  }

  markup(message) {
    let atnamed = atnamify(message, this.props.members, this.props.msg.id);
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

class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {highlight: false}
  }
  componentWillReceiveProps(newProps) {
    this._updateMembers(newProps);
  }
  componentWillMount() {
    this._updateMembers(this.props)
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
      latestMessage && latestMessage.user.username === this.props.auth.username
    );
  }
  componentDidUpdate() {
    if (this.shouldScrollBottom) {
      this.refs.chatBox.scrollTop = this.refs.chatBox.scrollHeight
    }
  }
  _updateMembers(props) {
    this.setState({
      members: _.uniqBy(
        props.presence.members.concat(props.chat_messages.map(msg => msg.user)),
        (member) => member.username
      )
    });
  }
  onSubmit(event) {
    event.preventDefault();
    this.props.onSendMessage({
    message: this.state.value,
    highlight: this.state.highlight
    });
    this.setState({
      value: "",
      highlight: false
    });
  }
  render() {
    let is_admin = this.props.auth.is_admin
    return <div className="chat-container">
      <div className="chat-box" ref='chatBox'>
        <div className="chat-log">
          {this.props.chat_messages.map((msg, i) => {
            return <ChatMessage msg={msg} plenary={this.props.plenary}
              members={this.state.members} key={`${i}`} auth={this.props.auth} />
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
                <BS.FormControl
                    className="chat-composer"
                    type='text'
                    placeholder='Chat...'
                    disabled={this.props.plenary.chat.state === "sending"}
                    value={(this.state && this.state.value) || ""}
                    onChange={(e) => this.setState({value: e.target.value})} />
                  <BS.InputGroup.Addon>
                    <input type="checkbox"
                      name="highlight"
                      id="highlight"
                      checked={this.state && this.state.highlight}
                      onChange={(e) => this.setState({highlight: e.target.checked})}
                    />
                      <label htmlFor="highlight">
                        <BS.Glyphicon glyph="exclamation-sign" />
                      </label>
                  </BS.InputGroup.Addon>
              </BS.InputGroup>
            </BS.FormGroup>
          :
            <BS.FormGroup>
                {this.props.plenary.chat.state === "error" ?
                  <BS.HelpBlock>{this.props.plenary.chat.error}</BS.HelpBlock> : "" }
                <BS.FormControl
                  className="chat-composer"
                  type='text'
                  placeholder='Chat...'
                  disabled={this.props.plenary.chat.state === "sending"}
                  value={(this.state && this.state.value) || ""}
                  onChange={(e) => this.setState({value: e.target.value})} />
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
