import React from 'react';
import {connect} from "react-redux";
import * as BS from 'react-bootstrap';
import * as A from '../actions';
import * as style from "../../../scss/pages/plenary/_plenaryStatusAlert.scss"
import moment from 'moment-timezone';
import {PlenaryEditor} from './PlenaryEditor';

class PlenaryStatusAlert extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      plenarySettingsModalOpen: false,
      now: moment()
    }
  }
  openModal(event) {
    event && event.preventDefault();
    this.setState({
      plenarySettingsModalOpen: true,
    });
  }
  componentWillMount() {
    this.counter = setInterval(() => {
      this.setState({now: moment()})
    }, 1000);
  }
  componentWillUnmount() {
    this.counter && clearInterval(this.counter);
  }
  extendTime(event, minutes=10) {
    event && event.preventDefault();
    this.props.onAdminSendPlenaryDetails({
      doors_close: moment(this.props.plenary.doors_close).add(minutes, 'minutes').format()
    });
    
  }
  render() {
    let now = this.state.now;
    let canceled = this.props.plenary.canceled;
    let startDate = moment(this.props.plenary.start_date).tz(moment.tz.guess());
    let doorsOpen = moment(this.props.plenary.doors_open).tz(moment.tz.guess());
    let endDate = moment(this.props.plenary.end_date);
    let doorsClose = moment(this.props.plenary.doors_close);

    let startsSoon = startDate > now && startDate.diff(now, 'hours', true) <= 2;
    let startsToday = startDate > now && startDate.date() === now.date();
    let startsFuture = startDate > now
    let closing = now < doorsClose && now > endDate;
    let ended = now > doorsClose;

    let edit = <BS.Button bsStyle='default' bsSize='xsmall' onClick={(e) => this.openModal(e)}>
      Edit
    </BS.Button>;

    return <div className='plenary-status-alert'>
      <div>
        { canceled ?
            <span>This event has been canceled <i className='fa fa-frown-o' />{edit}</span>
          : startsSoon ?
            <span>
              This event starts <span>{startDate.from(now)}</span>.
              Doors {doorsOpen <= now ? "opened" : "open"}
              {' '}<span>{doorsOpen.from(now)}</span>. {edit}
            </span>
          : startsToday ?
            <span>
              This event starts today at <span>{startDate.format('LT')}</span>.
              Doors open at <span>{doorsOpen.format('LT')}</span>. {edit}
            </span>
          : startsFuture ?
            <span>
              This event starts on <span>{startDate.format("dddd, MMM Do, YYYY, LT")}</span>. {edit}
            </span>
          : closing ?
            <span>
              This event has ended, and will auto-close
              {' '}<span>{doorsClose.from(now)} <i className='fa fa-magic' /></span>
              <BS.Button bsStyle='default' bsSize='xsmall' onClick={(e) => this.extendTime(e, 10)}>
                Extend by 10 minutes
              </BS.Button>
            </span>
          : ended ?
            <span>
              This event has ended. <i className='fa fa-hand-peace-o' />{' '}
              <BS.Button bsStyle='default' bsSize='xsmall'
                         href={`/events/add/?copy_from_id=${this.props.plenary.id}`}>
                Schedule another 
              </BS.Button>
            </span>
          : 
            <span>This event is live! <i className='fa fa-rocket' />{edit}</span>
        }
      </div>
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
)(PlenaryStatusAlert);
