import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState, getDefaultKeyBinding, KeyBindingUtil} from 'draft-js';
import {Avatar, sortPresence} from './Presence';

export default class Breakout extends React.Component {
  constructor(props) {
    super(props);
    this.active = false;
    this.state = {
      editorState: EditorState.createWithContent(ContentState.createFromText(this.props.breakout.title))
    };
    this.onChange = (editorState) => {
        this.setState({editorState});
    }
  }
  //Add an event listener that will dispatch the updated title
  componentDidMount() {
    window.addEventListener('click',
      () => this.handleModify(this.props.onChangeBreakouts, this.state.editorState),
      false);
  }
  componentWillUnmount() {
    window.removeEventListener('click',
      () => this.handleModify(this.props.onChangeBreakouts, this.state.editorState),
      false);
  }
  componentWillReceiveProps(newProps) {
    this.setState({
      editorState: EditorState.createWithContent(ContentState.createFromText(newProps.breakout.title))
    })
  }
  keyBindingFn(e, contentLength) {
    console.log('contentLength', contentLength)
    if (e.keyCode !== 8 && contentLength >= 50) {
      console.log('not backspace and length greater than 80 chars')
      return 'my-add';
    }
    console.log('default keybinding')
    return getDefaultKeyBinding(e);
  }
  handleKeyCommand (command) {
    if (command === 'my-add') {
      console.log('return handled and dont do shit')
      return 'handled';
    }
    console.log('not handled so do default hopefully')
  }
  //dispatch updated title upon click outside
  handleModify(onChangeBreakouts, updatedTitle) {
    if (this.active) {
      onChangeBreakouts({
        action: "modify",
        id: this.props.breakout.id,
        title: updatedTitle.getCurrentContent().getPlainText()
      });
    }
    this.active = false
  }
  //dispatch updated title upon return
  handleReturn(onChangeBreakouts, updatedTitle) {
    if (this.active) {
      onChangeBreakouts({
        action: "modify",
        id: this.props.breakout.id,
        title: updatedTitle.getCurrentContent().getPlainText()
      });
    }
    this.active = false
    this.refs.editor.blur()
    return 'handled' 
  }
  //prevent dispatch for clicks on input bar
  handleClick(event) {
    event.stopPropagation();
    this.active = true;
  }
  //dispatch delete breakout
  handleDelete(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      action: "delete",
      id: this.props.breakout.id,
    });
  }
  handleApprove(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      action: "approve",
      id: this.props.breakout.id,
    });
  }
  handleVote(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      action: "vote",
      id: this.props.breakout.id,
    });
  }
  render() {
    console.log('render plaintext', this.state.editorState.getCurrentContent().getPlainText())
    let showProposer = (
      this.props.breakout.mode === "user" &&
      !this.props.breakout.is_random &&
      !!this.props.breakout.proposed_by
    );
    let showApprove = (
      this.props.auth.is_admin &&
      this.props.breakout.is_proposal &&
      this.props.breakout.mode == "user"
    );
    let showUnapprove = (
      this.props.auth.is_admin &&
      !this.props.breakout.is_proposal &&
      this.props.breakout.mode == "user"
    );
    let showDelete = this.props.auth.is_admin;
    let showEditTitle = this.props.auth.is_admin && !this.props.breakout.is_random;
    let showVote = this.props.breakout.is_proposal;
    let showJoin = this.props.breakout.open && (
      this.props.breakout.mode !== "user" ||
      !this.props.breakout.is_proposal
    );
    let votedForThis = !!_.find(this.props.breakout.votes, (vote) => {
      return vote.username === this.props.auth.username
    });
    let titleHasFocus = this.state.editorState.getSelection().getHasFocus();
    let showPresence = this.props.breakout.open && !this.props.breakout.is_proposal;
    let showMembers = this.props.breakout.is_random;
    let classes = ['breakout'];
    if (this.props.breakout.is_proposal) {
      classes.push('proposal');
    }
    return <div className={classes.join(" ")}>
      { showMembers ?
        <div className="members-container">
          <span>Assigned Participants:</span>
          <div className="members-avatars-container">
            {this.props.breakout.members.map((member) => {
              return <Avatar user={member} gridView={true}/>
            })}
          </div>
        </div>
        : ""}
      <div className="main-breakout-container">
        { showDelete ?
            <BS.Button bsStyle="danger" onClick= {(e) => this.handleDelete(e)} className="delete-btn">
              <i className='fa fa-trash' />
            </BS.Button>
          : ""
        }
        { showEditTitle ?
          titleHasFocus ?
            <div tabIndex="0"
                 className="title-input title-focus"
                 onClick={(e) => this.handleClick(e)}>
              <Editor editorState={this.state.editorState}
                      onChange={this.onChange} 
                      handleReturn={() => this.handleReturn(this.props.onChangeBreakouts, this.state.editorState)} 
                      ref="editor"
                      handleKeyCommand={this.handleKeyCommand}
                      keyBindingFn={(e) => 
                        this.keyBindingFn(e, this.state.editorState.getCurrentContent().getPlainText().length)} />
            </div>
            :
            <div tabIndex="0"
                 className="title-input"
                 onClick={(e) => this.handleClick(e)}>
              <Editor editorState={this.state.editorState}
                      onChange={this.onChange}
                      handleReturn={() => this.handleReturn(this.props.onChangeBreakouts, this.state.editorState)} 
                      ref="editor" 
                      handleKeyCommand={this.handleKeyCommand}
                      keyBindingFn={(e) => 
                        this.keyBindingFn(e, this.state.editorState.getCurrentContent().getPlainText().length)} />
            </div>
          :
            <h5>{this.props.breakout.title}</h5>
        }
        { showPresence ?  <BreakoutPresence {...this.props} /> : "" }
        { showProposer ? 
            <div className="proposed-by-container">
              <div className="proposed-by-label">
                <span>Proposed</span>
                <br></br>
                <span>by:</span>
              </div>
              <Avatar user={this.props.breakout.proposed_by} gridView={true} />
            </div>
          : "" }
        { showApprove ?
            <BS.Button onClick={(e) => this.handleApprove(e)} className="approve-btn">
              <i className="fa fa-check" aria-hidden="true"></i>
            </BS.Button>
          : ""
        }
        { showUnapprove ?
            <BS.Button onClick={(e) => this.handleApprove(e)} className="approve-btn">
              <i className="fa fa-undo" aria-hidden="true"></i>
            </BS.Button>
          : ""
        }
        { showVote ?
            <BS.Button onClick={(e) => this.handleVote(e)}
                className={`vote-btn${votedForThis ? " voted" : ""}`}>
              <BS.Glyphicon glyph="arrow-up" />
              <br></br>
              {this.props.breakout.votes.length}
            </BS.Button>
          : showJoin ?
            <BS.Button className="join-btn" href={this.props.breakout.url} target='_blank'>
              <BS.Glyphicon glyph="log-in" />
            </BS.Button>
          :
            <BS.Button className="join-btn" disabled><BS.Glyphicon glyph="lock" /></BS.Button>
        }
      </div>
    </div>
  }
}
Breakout.propTypes = {
  'breakout': React.PropTypes.object.isRequired,
  'presence': React.PropTypes.object.isRequired,
  'auth': React.PropTypes.object.isRequired,
  'onChangeBreakouts': React.PropTypes.func.isRequired
}

class BreakoutPresence extends React.Component {
  render() {
    let members = sortPresence(this.props.presence, this.props.auth);
    let numSlots = this.props.breakout.max_attendees;
    let empties = numSlots - members.length;
    for (let i = 0; i < empties; i++) {
      members.push(null);
    }
    return <div className='breakout-presence'>
      { members.map((user, i) => (
          <span className={`slot${user === null ? " empty" : ""}`} key={`user-${i}`}>
            { user === null ? "" : <Avatar user={user} gridView={true}/> }
          </span>
        ))
      }
    </div>
  }
}
BreakoutPresence.propTypes = {
  'breakout': React.PropTypes.object.isRequired,
  'presence': React.PropTypes.object.isRequired,
  'auth': React.PropTypes.object.isRequired,
}
