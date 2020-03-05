import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_presencestyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Avatar} from "./Avatar";

export const sortPresence = (presence, auth) => {
  // Sort self first, others second.
  let members = _.sortBy(presence.members, (u) => u.id !== auth.id);
  for (let i = 0; i < presence.lurkers; i++) {
    members.push({
      username: `Anonymous ${i+1}`,
      display_name: `Anonymous ${i+1}`
    });
  }
  return members;
}

export class Presence extends React.Component {
  constructor() {
    super();
    this.state = {detailView: false};
  }
  render() {
    let mute = {};
    if (this.props.muteOthers !== undefined) {
      this.props.presence.members.forEach(member => {
        if (this.props.muteOthers.indexOf(member.id) === -1) {
          mute[member.id] = true;
        }
      })
    }
    return (
      <div className='presence-container'>
        <div className='presence-controls'>
          <div className ='presence-counter'>
            <i className='fa fa-child' />
            {this.props.presence.members.length}
          </div>
          <BS.Button
            onClick={() => this.setState({detailView: false})}
            bsStyle="default"
            bsSize="small"
            className="grid-button">
            <i className='fa fa-th-large' />
          </BS.Button>
          <BS.Button
            bsStyle="default"
            bsSize="small"
            onClick={() => this.setState({detailView: true})}>
            <i className='fa fa-th-list' />
          </BS.Button>
        </div>
        <div className='presence'>
          {
            sortPresence(this.props.presence, this.props.auth).map((user) => {
              let className = mute[user.id] ? "muted" : undefined;
              return <Avatar user={user}
                             detailView={this.state.detailView}
                             className={className}
                             key={`presence-${user.username}`}
                             idPart={`presence-${user.username}`} 
                             breakoutView={false}/>
            })
          }
        </div>
      </div>
    )
  }
}
