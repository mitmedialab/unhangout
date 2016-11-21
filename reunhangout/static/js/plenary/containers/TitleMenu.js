import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";
import * as style from "../../../scss/pages/plenary/_titleMenu.scss"
import * as A from "../actions";
import {Avatar} from './Avatar';
import {PlenaryEditor} from './PlenaryEditor';
import {LabeledSwitch} from './LabeledSwitch';
import moment from 'moment-timezone';

export class TitleMenu extends React.Component {
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
    this.props.onAdminSendPlenaryDetails({
      open: !this.props.plenary.open
    });
  }

  toggleBreakoutsOpen() {
    this.props.onAdminSendPlenaryDetails({
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

  render() {
    return (
      <div style={{'position': 'relative', 'width': '100%'}}>
        <div ref='target' className='title-button' onClick={(e) => this.toggle(e)}>
          <div className='title'>
            {this.props.plenary.name} <i className='fa fa-caret-down' />
          </div>
          <div className='user'>
            {this.props.auth.display_name}
          </div>
        </div>

        <BS.Overlay rootClose
          show={this.state.show}
          onHide={() => this.setState({show: false})}
          placement='bottom'
          container={this}
          target={() => this.refs.target}
        >
          <div className='title-menu-overlay' onClick={(e) => e.stopPropagation()}>
            <div className='user'>
              <Avatar idPart={'title-menu-overlay'} user={this.props.auth} />
              {this.props.auth.display_name}
              <div style={{clear: 'both'}} />
            </div>
            <div className='menu-item'>
              <a href='/accounts/settings/account'>
                <i className='fa fa-cog' /> Account settings
              </a>
            </div>
            <div className='menu-item'>
              <a href='/accounts/logout/'>Logout</a>
            </div>
            {this.props.auth.is_admin ? 
              <div>
                <hr />
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
                <div className='menu-item'>
                  <a href='#' onClick={(e) => this.showPlenarySettingsModal(e)}>
                    <i className='fa fa-cogs' /> Plenary settings
                  </a>
                </div>
              </div>
            : ""}
          </div>
        </BS.Overlay>
        <BS.Modal show={this.state.plenarySettingsModalOpen}
                  onHide={() => this.setState({plenarySettingsModalOpen: false})}>
          <PlenaryEditor
            plenary={this.props.plenary}
            onChange={(update) => {
              this.props.onAdminSendPlenaryDetails(update);
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
    auth: state.auth,
  }),
  // map dispatch to props
  (dispatch, ownProps) => ({
    onAdminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
    onSendAuthDetails: (payload) => dispatch(A.sendAuthDetails(payload)),
  })
)(TitleMenu);
