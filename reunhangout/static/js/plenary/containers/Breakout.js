import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Avatar, sortPresence} from './Presence';
import {InPlaceEditor} from './InPlaceEditor';

export default class Breakout extends React.Component {
  handleChangeTitle(event) {
    this.props.onChangeBreakouts({
      action: "modify",
      id: this.props.breakout.id,
      title: event.target.value,
    });
  }

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
    let isProposer = this.props.breakout.mode === "user" && (
      this.props.breakout.proposed_by.username === this.props.auth.username
    );
    let titleReadOnly = this.props.breakout.is_random || !(
      this.props.auth.is_admin || isProposer
    );

    let showVote = this.props.breakout.is_proposal;
    let showJoin = this.props.breakout.open && (
      this.props.breakout.mode !== "user" ||
      !this.props.breakout.is_proposal
    );
    let votedForThis = !!_.find(this.props.breakout.votes, (vote) => {
      return vote.username === this.props.auth.username
    });
    let showPresence = this.props.breakout.open && !this.props.breakout.is_proposal;
    let showAssignees = this.props.breakout.is_random;

    let classes = ['breakout-list-item'];
    if (this.props.breakout.is_proposal) {
      classes.push('proposal');
    }
    return <div className={classes.join(" ")}>
      <div className="breakout-list-item-row">
        <div className='breakout-list-item-left-col'>
          <InPlaceEditor maxLength={100}
                         readOnly={titleReadOnly}
                         className='breakout-title in-place-editor' 
                         value={this.props.breakout.title}
                         onChange={(e) => this.handleChangeTitle(e)} />

          { showAssignees ?
              <div className="breakout-assignees-container">
                <span>Assigned Participants:</span>
                <div className="members-avatars-container">
                  {this.props.breakout.members.map((member) => {
                    return <Avatar user={member} />
                  })}
                </div>
              </div>
            : ""
          }

          { showPresence ?  <BreakoutPresence {...this.props} /> : "" }

          { showDelete ?
              <BS.Button bsStyle="link" className='delete-btn'
                         onClick= {(e) => this.handleDelete(e)}>
                <i className='fa fa-trash' />
              </BS.Button>
            : ""
          }


          { showApprove ?
              <BS.Button onClick={(e) => this.handleApprove(e)} className="approve-btn">
                <i className="fa fa-check" aria-hidden="true"></i>
              </BS.Button>
            : ""
          }

          { showUnapprove ?
              <BS.Button onClick={(e) => this.handleApprove(e)} className="approve-btn">
                <i className="fa fa-close" aria-hidden="true"></i>
              </BS.Button>
            : ""
          }

          { showProposer ? 
              <div className="breakout-proposed-by-container">
                <span>Proposed by</span>
                <Avatar user={this.props.breakout.proposed_by} />
              </div>
            : "" }
        </div>
        <div className='breakout-list-item-right-col'>
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
            { user === null ? "" : <Avatar user={user} key={user.username} /> }
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
