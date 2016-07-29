import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";

export default class Breakout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {title: this.props.breakout.title};
    this.active = false;
  }
  //Add an event listener that will dispatch the updated title
  componentDidMount() {
    window.addEventListener('click', 
      () => this.handleModify(this.props.onChangeBreakouts, this.state.title), 
      false);
  }
  componentWillUnmount() {
    window.removeEventListener('click', 
      () => this.handleModify(this.props.onChangeBreakouts, this.state.title), 
      false);
  }
  //dispatch updated title upon click outside or submit
  handleModify(onChangeBreakouts, updatedTitle) {
    if (this.active) {  
      onChangeBreakouts({
        action: "modify",
        index: this.props.index,
        title: updatedTitle
      });
    }
    this.active = false
  }
  handleSubmit(event, onChangeBreakouts, updatedTitle) {
    event.preventDefault();
    if (this.active) {  
      onChangeBreakouts({
        action: "modify",
        index: this.props.index,
        title: updatedTitle
      });
      this.refs.titleInput.blur()
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
    if (this.props.breakout.is_proposal) {
      return <div className="breakout proposal">
          { showEditTitle ?
              <form 
                onSubmit={(e) => {
                  this.handleSubmit(e, this.props.onChangeBreakouts, this.state.title)
                }}>
                <input type="text" value={this.state.title}
                  onChange={(e) => this.setState({title: e.target.value})} 
                  onClick={(e) => this.handleClick(e)} ref="titleInput"
                  className="title-input form-control"/>
              </form>
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
              <form 
                onSubmit={(e) => {
                  this.handleSubmit(e, this.props.onChangeBreakouts, this.state.title)
                }}>
                <input type="text" value={this.state.title}
                  onChange={(e) => this.setState({title: e.target.value})} 
                  onClick={(e) => this.handleClick(e)} ref="titleInput"
                  className="title-input form-control"/>
              </form>
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
