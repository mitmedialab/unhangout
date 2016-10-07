import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_presencestyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Avatar, DEFAULT_AVATAR} from "./Avatar";

export const sortPresence = (presence, auth) => {
  // Sort self first, others second.
  let members = _.sortBy(presence.members, (u) => u.username !== auth.username);
  for (let i = 0; i < presence.lurkers; i++) {
    members.push({
      username: `Anonymous ${i+1}`,
      display_name: `Anonymous ${i+1}`,
      image: DEFAULT_AVATAR
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
    return (
      <div className='presence-container'>
        <div className='presence-controls'>
          <div className ='presence-counter'>
            <BS.Glyphicon glyph='user' />
            {this.props.presence.members.length}
          </div>
          <BS.Button
            onClick={() => this.setState({detailView: false})}
            className="grid-button">
            <BS.Glyphicon glyph='th' />
          </BS.Button>
          <BS.Button
            onClick={() => this.setState({detailView: true})}>
            <BS.Glyphicon glyph='th-list' />
          </BS.Button>
        </div>
        <div className='presence'>
          {
            sortPresence(this.props.presence, this.props.auth).map((user) => {
              return <Avatar user={user} detailView={this.state.detailView}
                             key={`presence-${user.username}`}
                             idPart={`presence-${user.username}`} />
            })
          }
        </div>
      </div>
    )
  }
}
