import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";

class ContactInfo extends React.Component {
  render() {
    return <div>{this.props.user.username}</div>
  }
}

class Presence extends React.Component {
  render() {
    return (
      <div className='present'>
        {
          this.props.present.members.map((user) => {
            return <ContactInfo user={user} key={`user-${user.username}`} />
          })
        }
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
