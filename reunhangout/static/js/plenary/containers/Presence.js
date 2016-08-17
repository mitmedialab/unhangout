import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_presencestyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

const DEFAULT_AVATAR = "../../../../media/assets/default_avatar.jpg";

export class Avatar extends React.Component {
  render() {
    let avatar = this.props.user.image || DEFAULT_AVATAR;
    return (
      <img src={avatar} className="user-avatar" title={this.props.user.username} />
    )
  }
}

export const sortPresence = (presence, auth) => {
  // Sort self first, others second.
  let members = _.sortBy(presence.members, (u) => u.username !== auth.username);
  for (let i = 0; i < presence.lurkers; i++) {
    members.push({
      username: `Anonymous ${i+1}`,
      image: DEFAULT_AVATAR
    });
  }
  return members;
}

export class Presence extends React.Component {
  render() {
    return (
      <div className='presence'>
        {
          sortPresence(this.props.presence, this.props.auth).map((user) => {
            return <Avatar user={user} key={`user-${user.username}`} />
          })
        }
      </div>
    )
  }
}

