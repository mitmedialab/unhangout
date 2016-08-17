import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_presencestyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";


class ContactInfo extends React.Component {
  render() {
    let avatar = this.props.user.image || "../../../../media/assets/default_avatar.jpg"
    if (this.props.gridView) {
      return (
        <img src={avatar} className="user-avatar" />
      )
    } else {
      return (
      <div className='user-details'>
        <img src={avatar} className="user-avatar" />
        {this.props.user.username}
      </div>
      )
    }
  }
}

class Presence extends React.Component {
  constructor() {
    super();
    this.state = {gridView: true};
  }
  render() {
    return (
      <div className='presence-container'>
        <div className='presence-controls'>
          <BS.Glyphicon glyph='user' />
          {this.props.present.members.length}
          <BS.Button 
            onClick={() => this.setState({gridView: true})}>
            <BS.Glyphicon glyph='th' />
          </BS.Button>
          <BS.Button
            onClick={() => this.setState({gridView: false})}>
            <BS.Glyphicon glyph='th-list' />
          </BS.Button>
        </div>
        <div className='present'>
          {
            this.props.present.members.map((user) => {
              return <ContactInfo gridView={this.state.gridView} user={user} key={`user-${user.username}`} />
            })
          }
        </div>
      </div>
    )
  }
}

const sortPresent = (present, auth) => {
  // Sort self first, others second.
  return _.sortBy(present.members, (u) => u.username !== auth.username)
}

export default connect(
  // map state to props
  (state) => ({
    present: {
      members: sortPresent(state.present, state.auth),
    },
    auth: state.auth
  }),
  (dispatch, ownProps) => ({
  })
)(Presence);
