import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState} from 'draft-js';

export default class Breakout extends React.Component {
  constructor(props) {
    super(props);
    this.active = false;
    this.state = {
      editorState: EditorState.createWithContent(ContentState.createFromText(this.props.breakout.title))
    };
    this.onChange = (editorState) => this.setState({editorState});
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
    let showEditTitle = this.props.auth.is_admin;
    let showVote = this.props.breakout.is_proposal;
    let showJoin = this.props.breakout.open && (
      this.props.breakout.mode !== "user" ||
      !this.props.breakout.is_proposal
    );
    let votedForThis = !!_.find(this.props.breakout.votes, (vote) => {
      return vote.username === this.props.auth.username
    });
    let titleHasFocus = this.state.editorState.getSelection().getHasFocus();
    if (this.props.breakout.is_proposal) {
      return <div className="breakout proposal">
          { showEditTitle ?
            titleHasFocus ?
              <div 
              tabIndex="0"
              className="title-input title-focus"
              onClick={(e) => this.handleClick(e)} >
                <Editor 
                editorState={this.state.editorState} 
                onChange={this.onChange} />
              </div>
              :
              <div 
              tabIndex="0"
              className="title-input"
              onClick={(e) => this.handleClick(e)} >
                <Editor 
                editorState={this.state.editorState} 
                onChange={this.onChange} />
              </div>
            :
              <h5>{this.props.breakout.title}</h5>
          }
          { showVote ?
              <BS.Button onClick={(e) => this.handleVote(e)}>
                {votedForThis ? '✓' : ''}
                Vote | {this.props.breakout.votes.length}
              </BS.Button> 
            : showJoin ?
              <BS.Button href={this.props.breakout.url} target='_blank'>
                Join
              </BS.Button>
            :
              <BS.Button disabled>Locked</BS.Button>
          }
          { showDelete ?
              <BS.Button bsStyle="danger" onClick= {(e) => this.handleDelete(e)}>
                <i className='fa fa-trash' />
              </BS.Button>
            : ""
          }
          { showApprove ?
              <BS.Button onClick={(e) => this.handleApprove(e)}>
                Approve
              </BS.Button>
            : ""
          }
          { showUnapprove ?
              <BS.Button onClick={(e) => this.handleApprove(e)}>
                Unapprove
              </BS.Button>
            : ""
          }
        </div>
    } else {
      return <div className="breakout">
          { showEditTitle ?
            titleHasFocus ?
              <div 
              tabIndex="0"
              className="title-input title-focus"
              onClick={(e) => this.handleClick(e)} >
                <Editor 
                editorState={this.state.editorState} 
                onChange={this.onChange} />
              </div>
              :
              <div 
              tabIndex="0"
              className="title-input"
              onClick={(e) => this.handleClick(e)} >
                <Editor 
                editorState={this.state.editorState} 
                onChange={this.onChange} />
              </div>
            :
              <h5>{this.props.breakout.title}</h5>
          }
          { showVote ?
              <BS.Button onClick={(e) => this.handleVote(e)}>
                {votedForThis ? '✓' : ''}
                Vote | {this.props.breakout.votes.length}
              </BS.Button> 
            : showJoin ?
              <BS.Button href={this.props.breakout.url} target='_blank'>
                Join
              </BS.Button>
            :
              <BS.Button disabled>Locked</BS.Button>
          }
          { showDelete ?
              <BS.Button bsStyle="danger" onClick= {(e) => this.handleDelete(e)}>
                <i className='fa fa-trash' />
              </BS.Button>
            : ""
          }
          { showApprove ?
              <BS.Button onClick={(e) => this.handleApprove(e)}>
                Approve
              </BS.Button>
            : ""
          }
          { showUnapprove ?
              <BS.Button onClick={(e) => this.handleApprove(e)}>
                Unapprove
              </BS.Button>
            : ""
          }
        </div>
    }
    
  }
}

Breakout.propTypes = {
  'breakout': React.PropTypes.object.isRequired,
  'auth': React.PropTypes.object.isRequired,
  'onChangeBreakouts': React.PropTypes.func.isRequired
}
