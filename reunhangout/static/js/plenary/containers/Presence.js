import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_presencestyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

const DEFAULT_AVATAR = "../../../../media/assets/default_avatar.jpg";

export class Avatar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {'imageError': false};
  }
  onError(event) {
    this.setState({'imageError': true});
  }
  render() {
    let imgProps = {
      alt: this.props.user.display_name,
      src: this.state.imageError ? DEFAULT_AVATAR : this.props.user.image,
      className: 'user-avatar',
      onError: (event) => this.onError(event),
    }
    if (this.props.detailView) {
      return (
        <div className='user-details'>
          <img {...imgProps} />
          {this.props.user.display_name}
        </div>
      )
    } else {
      imgProps.title = this.props.user.display_name;
      return <img {...imgProps} />;
    }
  }
}

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
              return <Avatar user={user} detailView={this.state.detailView} key={`user-${user.username}`} />
            })
          }
        </div>
      </div>
    )
  }
}
