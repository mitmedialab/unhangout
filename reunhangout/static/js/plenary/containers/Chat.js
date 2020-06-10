import React from "react";
import PropTypes from 'prop-types';
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import * as style from "../../../scss/pages/plenary/_chatstyle.scss"
import {Avatar} from './Avatar';

import {EditorState, ContentState, Modifier, getDefaultKeyBinding} from 'draft-js';
import {stateToHTML} from 'draft-js-export-html';
import Editor from 'draft-js-plugins-editor';
import createMentionPlugin from 'draft-js-mention-plugin';
import {defaultSuggestionsFilter} from 'draft-js-mention-plugin';
import 'draft-js-mention-plugin/lib/plugin.css';


class ChatMessage extends React.Component {
  static propTypes = {
    users: PropTypes.object.isRequired,
    messages: PropTypes.array.isRequired,
    auth: PropTypes.object.isRequired,
  }

  render() {
    let firstMsg = this.props.messages[0];
    let user = this.props.users[firstMsg.user];
    return <div className={`chat-message${firstMsg.highlight ? " highlight" : ""}`}>
      <Avatar user={firstMsg.user} 
              idPart={`chat-message-author-${firstMsg.id}`}
              breakoutView={false}
              enableSpeakerStats={false}/>
      <div className="chat-message-text" ref={(el) => this.el = el}>
        <div className='userName'>{user.display_name}</div>
        <div className='message'>
          {this.props.messages.map((msg, i) => (
            <div key={`msg-${i}`}
              dangerouslySetInnerHTML={{__html: msg.message}}
            />
          ))}
        </div>
      </div>
    </div>
  }

  componentDidUpdate() {
    if (this.el) {
      this.el.querySelectorAll("[data-mention-user-id]").forEach(el => {
        const userId = el.getAttribute('data-mention-user-id');
        el.classList.toggle('self', parseInt(userId) === this.props.auth.id);
      });
    }
  }
};

// Taken from https://github.com/draft-js-plugins/draft-js-plugins/blob/master/draft-js-mention-plugin/src/utils/positionSuggestions.js
const getRelativeParent = (element) => {
  if (!element) {
    return null;
  }

  const position = window.getComputedStyle(element).getPropertyValue('position');
  if (position !== 'static') {
    return element;
  }

  return getRelativeParent(element.parentElement);
};

// Taken from https://github.com/draft-js-plugins/draft-js-plugins/blob/master/draft-js-mention-plugin/src/utils/positionSuggestions.js
const positionSuggestionsAbove = ({ decoratorRect, popover, state, props }) => {
  const relativeParent = getRelativeParent(popover.parentElement);
  const relativeRect = {};

  if (relativeParent) {
    relativeRect.scrollLeft = relativeParent.scrollLeft;
    relativeRect.scrollTop = relativeParent.scrollTop;

    const relativeParentRect = relativeParent.getBoundingClientRect();
    relativeRect.left = decoratorRect.left - relativeParentRect.left;
    relativeRect.top = decoratorRect.top - relativeParentRect.top;
  } else {
    relativeRect.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    relativeRect.scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    relativeRect.top = decoratorRect.top;
    relativeRect.left = decoratorRect.left;
  }

  const left = relativeRect.left + relativeRect.scrollLeft;
  const top = relativeRect.top + relativeRect.scrollTop;

  let transform;
  let transition;
  if (state.isActive) {
    if (props.suggestions.size > 0) {
      transform = 'scale(1)';
      transition = 'all 0.25s cubic-bezier(.3,1.2,.2,1)';
    } else {
      transform = 'scale(0)';
      transition = 'all 0.35s cubic-bezier(.3,1,.2,1)';
    }
  }

  return {
    left: `${left}px`,
    bottom: `${top + 22}px`,
    transform,
    transformOrigin: '1em 0%',
    transition,
  };
}


class ChatInput extends React.Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    mentionable: PropTypes.array.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    autoFocus: PropTypes.bool,
    disabled: PropTypes.bool,
    placeholder: PropTypes.string,
  }

  constructor(props) {
    super(props);
    this.mentionPlugin = createMentionPlugin({
      positionSuggestions: positionSuggestionsAbove
    })
    this.state = {
      editorState: EditorState.createEmpty(),
      suggestions: props.mentionable,
    }
  }

  clear() {
    // XXX Clearing state in draft-js-plugins editor is a bit involved. You
    // can't just create a new empty state, because the plugin decorators are
    // stored in the editor state. The FAQ used to describe this approach:
    //
    //   this.setState({editorState: EditorState.push(
    //     this.state.editorState, ContentState.createFromText('')
    //   )});
    //
    // But this no longer seems to work; and draft-js has removed documentation
    // of that from its FAQ.  The gobbledy-gook below is a workaround posted in
    // this issue comment:
    // https://github.com/draft-js-plugins/draft-js-plugins/issues/552#issuecomment-266134768
    // There are multiple issues open about this problem.
    const contentState = this.state.editorState.getCurrentContent();
    const firstBlock = contentState.getFirstBlock();
    const lastBlock = contentState.getLastBlock();
    const selectionState = this.state.editorState.getSelection().merge({
      anchorKey: firstBlock.getKey(),
      anchorOffset: 0,
      focusKey: lastBlock.getKey(),
      focusOffset: lastBlock.getLength(),
      hasFocus: true
    });
    const editorState = EditorState.push(
      this.state.editorState,
      Modifier.removeRange(contentState, selectionState, "backward")
    );
    this.setState({editorState});
  }

  onChange = (editorState) => {
    this.setState({editorState});
    const html = stateToHTML(editorState.getCurrentContent(), {
      entityStyleFn: (entity) => {
        const entityType = entity.get('type');
        if (entityType === 'mention') {
          const data = entity.getData();
          return {
            element: 'span',
            attributes: {
              "class": "mention",
              "data-mention-user-id": data.mention.get('id'),
            }
          }
        }
      }
    });
    this.props.onChange(html);
  }

  // Send 'submit' command if enter is pressed without shift key.
  submitOnEnterKeyBinding = (event, string) => {
    // Capture enter key
    if ((event.keyCode === 13 || event.keyCode === 10) && !event.shiftKey) {
      return 'submit';
    }
    return getDefaultKeyBinding(event);
  }

  // Send submit and clear input on 'submit' command.
  handleKeyCommand = (command) => {
    if (command === 'submit') {
      this.props.onSubmit();
      this.clear();
      return 'handled';
    }
    return 'not-handled';
  }

  // Update mention suggestions
  onSearchChange = ({value}) => {
    this.setState({
      suggestions: defaultSuggestionsFilter(value, this.props.mentionable)
    });
  }

  render() {
    const { MentionSuggestions } = this.mentionPlugin;
    const plugins = [this.mentionPlugin];
    return (
      <div className='chat-input-draft-js form-control' onClick={this.focus}>
        <MentionSuggestions
          onSearchChange={this.onSearchChange}
          suggestions={this.state.suggestions}
          onAddMention={this.onAddMention}
        />
        <Editor
          editorState={this.state.editorState}
          onChange={this.onChange}
          onFocus={this.props.onFocus}
          onBlur={this.props.onBlur}
          autoFocus={this.props.autoFocus}
          readOnly={this.props.disabled}
          plugins={plugins}
          suggestions={this.state.suggestions}
          onAddMention={this.onAddMention}
          handleKeyCommand={this.handleKeyCommand}
          keyBindingFn={this.submitOnEnterKeyBinding}
          placeholder={this.props.placeholder}
          className='form-control'
        />
      </div>
    )
  }
}

@connect(
  // map state to props
  (state) => ({
    chat_messages: _.filter(state.chat_messages, (m) => !m.archived),
    presence: state.presence,
    plenary: state.plenary,
    auth: state.auth,
    users: state.users,
  }),
  (dispatch, ownProps) => ({
    onSendMessage: (payload) => dispatch(A.sendChatMessage(payload))
  })
)
class Chat extends React.Component {
  static propTypes = {
    chat_messages: PropTypes.array.isRequired,
    presence: PropTypes.object.isRequired,
    plenary: PropTypes.object.isRequired,
    auth: PropTypes.object.isRequired,
    onSendMessage: PropTypes.func.isRequired,
  }

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
  onSubmit = (event) => {
    event && event.preventDefault();
    const empty = (
      /^<p>(&nbsp;|<br>)*<\/p>$/.test(this.state.value.trim()) ||
      !this.state.value.trim()
    );
    if (!empty) {
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
    let mentionable = this.props.presence.members.map(u => ({
      id: u.id, name: u.display_name,
    }));

    let chatInput = <ChatInput
      onChange={(html) => this.setState({value: html})}
      onSubmit={this.onSubmit}
      mentionable={mentionable}
      placeholder='Type a message&hellip;'
      disabled={this.props.plenary.chat.state === "sending"}
    />;

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
            return <ChatMessage key={`${i}`}
                      users={this.props.users}
                      messages={msgGroup}
                      auth={this.props.auth} />
          })}
        </div>
      </div>
      <form className={
          `chat-input${this.props.plenary.chat.state === "error" ? " has-error" : ""}`
      } onSubmit={this.onSubmit}>
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

export default Chat;
