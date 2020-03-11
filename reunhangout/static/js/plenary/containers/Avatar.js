import React from "react";
import PropTypes from 'prop-types';
import _ from "lodash";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as A from "../actions";



@connect(
  state => ({users: state.users, settings: state.settings, speakerStats: state.speakerStats.speaker_stats}),
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
    breakoutView: PropTypes.bool
  }

  state = {'imageError': false};

  onError(event) {
    this.setState({'imageError': true});
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.breakoutView && !_.isEqual(nextProps.speakerStats, this.props.speakerStats)) {
      let user;
      if (_.isNumber(this.props.user)) {
        user = this.props.users[this.props.user];
      } else {
        user = this.props.user;
      }
      var speaking_time = -1;
      for (const display_name in nextProps.speakerStats) {
        if (display_name === user.display_name) {
          speaking_time = nextProps.speakerStats[user.display_name];
          break;
        }
      }
      if (speaking_time < 0) {
        console.log("User not found in speaking stats object");
        return false;
      }

      let total_speaking_time = _.reduce(Object.values(nextProps.speakerStats), (memo, num) => (memo + num), 0);
      if (total_speaking_time === 0) {
        return false;
      }

      let new_opacity = speaking_time / total_speaking_time

      var element = document.getElementById(`breakout-user-avatar-${user.display_name}`);
      if (element === null) {
        console.log("Element got by id was null for user", user.display_name);
        return false;
      }
      element.style.opacity = Math.min(new_opacity, .2);
      return false;
    } 
    return true;
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
    let breakout_avatar_id = `breakout-user-avatar-${user.display_name}`;
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
    } else if (this.props.breakoutView) {
      classes.push("user-avatar");
      return <span className={classes.join(" ")} id={breakout_avatar_id}>
          <img {...imgProps} />
      </span>
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
