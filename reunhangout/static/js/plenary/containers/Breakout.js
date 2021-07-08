import React from "react";
import PropTypes from 'prop-types';
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {sortPresence} from './Presence';
import {Avatar} from './Avatar';
import {InPlaceEditor} from './InPlaceEditor';

export default class Breakout extends React.Component {
  handleChangeTitle(event) {
    this.props.onChangeBreakouts({
      action: "modify",
      id: this.props.breakout.id,
      title: event.target.value,
    });
  }

  handleAddSlot(){
    this.props.onChangeBreakouts({
      action: "modify",
      id: this.props.breakout.id,
      max_attendees: this.props.breakout.max_attendees + 1,
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
      this.props.plenary.breakout_mode === "user" &&
      !!this.props.breakout.proposed_by
    );
    let showApprove = (
      this.props.auth.is_admin &&
      this.props.breakout.is_proposal &&
      this.props.plenary.breakout_mode == "user"
    );
    let showUnapprove = (
      this.props.auth.is_admin &&
      !this.props.breakout.is_proposal &&
      this.props.plenary.breakout_mode == "user"
    );
    let showDelete = this.props.auth.is_admin;
    let isProposer = this.props.plenary.breakout_mode === "user" && (
      this.props.breakout.proposed_by &&
      this.props.breakout.proposed_by === this.props.auth.id
    );
    let titleReadOnly = !this.props.auth.is_admin && !isProposer;

    let showVote = this.props.breakout.is_proposal;
    let showJoin = (
      this.props.plenary.breakouts_open &&
      (this.props.presence.members || []).length < this.props.breakout.max_attendees &&
      (this.props.plenary.breakout_mode !== "user" || !this.props.breakout.is_proposal)
    );

    let votedForThis = !!_.find(this.props.breakout.votes, (vote) => {
      return vote === this.props.auth.id
    });
    let showPresence = this.props.plenary.breakouts_open && !this.props.breakout.is_proposal;
    let classes = ['breakout-list-item'];
    if (this.props.breakout.is_proposal) {
      classes.push('proposal');
    }
    return <div className={classes.join(" ")}>
      <div className="breakout-list-item-row">
        <div className='breakout-list-item-left-col'>
          <InPlaceEditor maxLength={80}
                         minLength={1}
                         readOnly={titleReadOnly}
                         className='breakout-title in-place-editor' 
                         value={this.props.breakout.title}
                         onChange={(e) => this.handleChangeTitle(e)} 
          />
          { showPresence && <BreakoutPresence {...this.props} onAddSlot={this.handleAddSlot.bind(this)}/>}  
        </div>
        <div className='breakout-list-item-middle-col'>
          { showProposer ? 
              <div className="breakout-proposed-by-container">
                <span><small>proposed<br/>by:</small></span>
                <Avatar user={this.props.breakout.proposed_by}
                        idPart={`proposed-by-${this.props.breakout.id}`}
                        breakoutView={false}
                        enableSpeakerStats={false} />
              </div>
            : "" 
          }
          <div className='breakout-controls-container'>
            { showDelete ?
                <BS.OverlayTrigger placement='top' overlay={
                  <BS.Tooltip id='delete-breakout-list-item'>Remove breakout</BS.Tooltip>
                }>
                  <BS.Button bsStyle="danger" className='delete-btn' bsSize="xsmall"
                             onClick= {(e) => this.handleDelete(e)}>
                    <i className='fa fa-trash' />
                  </BS.Button>
                </BS.OverlayTrigger>
              : ""
            }


            { showApprove ?
                <BS.OverlayTrigger placement='top' overlay={
                  <BS.Tooltip id='approve-breakout-list-item'>Approve breakout</BS.Tooltip>
                }>
                  <BS.Button onClick={(e) => this.handleApprove(e)} className="approve-btn" bsSize="small">
                    <i className="fa fa-check" aria-hidden="true"></i>
                  </BS.Button>
                </BS.OverlayTrigger>
              : ""
            }

            { showUnapprove ?
                <BS.OverlayTrigger placement='top' overlay={
                  <BS.Tooltip id='unapprove-breakout-list-item'>
                    Unapprove breakout
                  </BS.Tooltip>
                }>
                  <BS.Button onClick={(e) => this.handleApprove(e)} className="undo-btn" bsSize="small">
                    <i className="fa fa-undo" aria-hidden="true"></i>
                  </BS.Button>
                </BS.OverlayTrigger>
              : ""
            }
          </div>

        </div>
        <div className='breakout-list-item-right-col'>
          <BS.OverlayTrigger placement='left' overlay={
            <BS.Tooltip id='main-breakout-action'>
              {
                showVote ?
                  (votedForThis ? "Cancel vote " : "Vote this up")
                : showJoin ?
                  "Join Breakout"
                : "Breakout locked"
              }
            </BS.Tooltip>
          }>
            {
              showVote ?
                <BS.Button onClick={(e) => this.handleVote(e)}
                    className={`vote-btn${votedForThis ? " voted" : ""}`}>
                  <i className='fa fa-arrow-up' />
                  <br></br>
                  {this.props.breakout.votes.length}
                </BS.Button>
              : showJoin ?
                <BS.Button className="join-btn" href={this.props.breakout.url} target='_blank'>
                  <i className='fa fa-hand-o-right' />
                </BS.Button>
              :
                <BS.Button className="join-btn" disabled>
                  <i className='fa fa-lock' />
                </BS.Button>
            }
          </BS.OverlayTrigger>
        </div>
      </div>
    </div>
  }
}
Breakout.propTypes = {
  'breakout': PropTypes.object.isRequired,
  'presence': PropTypes.object.isRequired,
  'auth': PropTypes.object.isRequired,
  'onChangeBreakouts': PropTypes.func.isRequired
}

const BreakoutPresence = props => {
  let members = sortPresence(props.presence, props.auth);
  let numSlots = props.breakout.max_attendees;
  let empties = numSlots - members.length;
  for (let i = 0; i < empties; i++) {
    members.push(null);
  }
  return ( 
    <div className='breakout-presence'>
      { members.map((user, i) => (
        <span className={`slot${user === null ? " empty" : ""}`} key={`user-${i}`}>
          { user === null ?
            ""
            : <Avatar user={user}
              idPart={`breakout-presence-${props.breakout.id}-${user.id}`} 
              breakoutView={false}
              enableSpeakerStats={false}/>
          }
        </span>
      ))}
      { props.auth.is_admin && props.breakout.max_attendees < props.MAX_BREAKOUT_SIZE &&
        <BS.OverlayTrigger placement='top' overlay={
          <BS.Tooltip id='add-slot-list-item'>Add slot</BS.Tooltip>
        }>
          <BS.Button bsStyle="primary" className='add-slot-btn' bsSize="xsmall"
            onClick={props.onAddSlot.bind(props.breakout.id)}>
            <i className="fa fa-plus"> </i>
          </BS.Button>
        </BS.OverlayTrigger>
      }
    </div>
  );
}
