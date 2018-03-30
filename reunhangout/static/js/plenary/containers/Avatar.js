import React from "react";
import PropTypes from 'prop-types';
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";



@connect(
  state => ({users: state.users, settings: state.settings}),
  dispatch => ({})
)
export class Avatar extends React.Component {
  static propTypes = {
    user: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.shape({
        id: PropTypes.number,
        username: PropTypes.string.isRequired,
        display_name: PropTypes.string.isRequired,
        image: PropTypes.string.isRequired,
      })
    ]),
    idPart: PropTypes.string.isRequired,
  }

  state = {'imageError': false};

  onError(event) {
    this.setState({'imageError': true});
  }

  render() {
    let user;
    if (_.isNumber(this.props.user)) {
      user = this.props.users[this.props.user];
    } else {
      user = this.props.user;
    }
      
    let defaultAvatar = `${this.props.settings.MEDIA_URL}${this.props.settings.BRANDING.default_avatar}`;
    let imgProps = {
      alt: user.display_name,
      src: (this.state.imageError || !user.image) ? defaultAvatar : user.image,
      onError: (event) => this.onError(event),
    }
    let u = encodeURIComponent(user.username).replace(/\%/g, '::');
    let popoverId = `avatar-${u}-${this.props.idPart}`;
    let classes = [];
    if (this.props.className) {
      classes.push(this.props.className);
    }

    if (this.props.detailView) {
      classes.push("user-details");
      return (
        <div className={classes.join(" ")}>
          <span className='user-avatar'>
            <img {...imgProps} />
          </span>
          {user.display_name}
        </div>
      )
    } else {
      let popover = <BS.Popover id={popoverId}>
        {user.display_name}
      </BS.Popover>;
      classes.push("user-avatar");
      return <span className={classes.join(" ")}>
        <BS.OverlayTrigger rootClose trigger='click' overlay={popover} placement='top'>
          <img {...imgProps} />
        </BS.OverlayTrigger>
      </span>
    }
  }
}
