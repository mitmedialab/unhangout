import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as style from "../../../scss/pages/plenary/_userMenu.scss"
import * as A from "../actions";
import {Avatar} from './Avatar';
import {PlenaryEditor} from './PlenaryEditor';
import {LabeledSwitch} from './LabeledSwitch';
import moment from 'moment-timezone';

// Prevents BS.Overlay from injecting props into div.
// See https://github.com/react-bootstrap/react-overlays/issues/103
const OverlayPassThrough = (props) => (
  <div className={props.className} onClick={props.onClick} style={props.style}>
    {props.children}
  </div>
)

export class UserMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      show: false,
      plenarySettingsModalOpen: false,
    };
  }
  toggle() {
    this.setState({show: !this.state.show});
  }

  togglePlenaryOpen() {
    this.props.adminSendPlenaryDetails({
      open: !this.props.plenary.open
    });
  }

  toggleBreakoutsOpen() {
    this.props.adminSendPlenaryDetails({
      breakouts_open: !this.props.plenary.breakouts_open
    });
  }

  showPlenarySettingsModal(event) {
    event && event.preventDefault();
    this.setState({
      show: false,
      plenarySettingsModalOpen: true
    });
  }

  archiveChatMessages(event) {
    event && event.preventDefault();
    this.props.adminArchiveChatMessages({
      message_ids: this.props.chat_messages.map(msg => msg.id)
    });
    this.setState({ show: false });
  }

  render() {
    return (
      <div style={{'position': 'relative', 'width': '100%'}}>
        <div ref='target' className='user-button' onClick={(e) => this.toggle(e)}>
          <div className='user'>
            <Avatar idPart={'user-button'} user={this.props.auth} />
            {this.props.auth.display_name} <i className='fa fa-angle-down' />
          </div>
        </div>

        <BS.Overlay rootClose
          show={this.state.show}
          onHide={() => this.setState({show: false})}
          placement='bottom'
          container={this}
          target={() => this.refs.target}
        >
          <OverlayPassThrough className='user-menu-overlay'
                              onClick={(e) => e.stopPropagation()}>
            {this.props.auth.is_authenticated ?
              <div className='user-menu-items'>
                <div className='menu-title'><small>User Menu</small> <small><i className='fa fa-cutlery' /></small></div>
                {/*
                <div className='user' key='1'>
                  <Avatar idPart={'user-menu-overlay'} user={this.props.auth} />
                  {this.props.auth.display_name}
                  <div style={{clear: 'both'}} />
                </div>
              */}
                <div className='menu-item' key='2'>
                  <a href='/accounts/settings/account'>
                    <i className='fa fa-cog' /> Account settings
                  </a>
                </div>
                <div className='menu-item' key='3'>
                  <a href='/accounts/logout/'>
                    <i className='fa fa-sign-out' />Logout
                  </a>
                </div>
              </div>
            :
              <div className='user-menu-items'>
                <div className='menu-item'>
                  <BS.Button href={`/accounts/login/?next=${encodeURIComponent(document.location.pathname)}`}>
                    Login 
                  </BS.Button>
                </div>
              </div>
            }

            {this.props.auth.is_admin ? 
              <div className='admin-menu-items'>
                <div className='menu-title'><small>Host Controls</small> <i className='fa fa-gamepad' /></div>
                {/* Hide these for now
                <div className='menu-item'>
                  <LabeledSwitch
                      on={this.props.plenary.open}
                      onLabel='Plenary open'
                      offLabel='Plenary closed'
                      onClick={() => this.togglePlenaryOpen()} />
                </div>
                <div className='menu-item'>
                  <LabeledSwitch
                      on={this.props.plenary.breakouts_open}
                      onLabel='Breakouts open'
                      offLabel='Breakouts closed'
                      onClick={() => this.toggleBreakoutsOpen()} />
                </div>
              */}
                <div className='menu-item'>
                  <a href='#' onClick={(e) => this.showPlenarySettingsModal(e)}>
                    <i className='fa fa-cogs' /> Event settings
                  </a>
                </div>
                <div className='menu-item'>
                  <a href='#' onClick={(e) => this.archiveChatMessages(e)}>
                    <i className='fa fa-archive'></i> Archive chat messages
                  </a>
                </div>
              </div>
            : ""}
          </OverlayPassThrough>
        </BS.Overlay>
        <BS.Modal show={this.state.plenarySettingsModalOpen}
                  onHide={() => this.setState({plenarySettingsModalOpen: false})}>
          <PlenaryEditor
            plenary={this.props.plenary}
            onChange={(update) => {
              this.props.adminSendPlenaryDetails(update);
              this.setState({plenarySettingsModalOpen: false});
            }}
            onClose={() => this.setState({plenarySettingsModalOpen: false})} />
        </BS.Modal>
      </div>
    )
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    chat_messages: state.chat_messages,
    auth: state.auth,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    adminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
    adminArchiveChatMessages: (payload) => dispatch(A.adminArchiveChatMessages(payload)),
  })
)(UserMenu);
