import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
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
  getPopoverId() {
    let u = encodeURIComponent(this.props.user.username).replace(/\%/g, '::');
    return `avatar-${u}-${this.props.key}`;
  }
  render() {
    let imgProps = {
      alt: this.props.user.display_name,
      src: this.state.imageError ? DEFAULT_AVATAR : this.props.user.image,
      onError: (event) => this.onError(event),
    }
    if (this.props.detailView) {
      return (
        <div className='user-details'>
          <span className='user-avatar'>
            <img {...imgProps} />
          </span>
          {this.props.user.display_name}
        </div>
      )
    } else {
      let popover = <BS.Popover id={this.getPopoverId()}>
        {this.props.user.display_name}
      </BS.Popover>;
      return <span className='user-avatar'>
        <BS.OverlayTrigger rootClose trigger='click' overlay={popover} placement='top'>
          <img {...imgProps} />
        </BS.OverlayTrigger>
      </span>
    }
  }
}
Avatar.propTypes = {
  user: React.PropTypes.shape({
    username: React.PropTypes.string.isRequired,
    display_name: React.PropTypes.string.isRequired,
    image: React.PropTypes.string.isRequired,
  }).isRequired,
  idPart: React.PropTypes.string.isRequired,
}
