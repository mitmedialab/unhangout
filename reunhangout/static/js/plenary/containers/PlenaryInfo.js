import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_plenaryinfostyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";

class PlenaryInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {name: this.props.plenary.name,
                    organizer: this.props.plenary.organizer,
                    start_date: this.props.plenary.start_date,
                    description: this.props.plenary.description };
    this.activeName = false;
    this.activeOrganizer = false;
    this.activeStartDate = false;
    this.activeDescription = false;
  }
  componentWillReceiveProps(newProps) {
    this.setState({name: newProps.plenary.name,
                    organizer: newProps.plenary.organizer,
                    start_date: newProps.plenary.start_date,
                    description: newProps.plenary.description })
  }
  //Add an event listener that will dispatch the updated content
  componentDidMount() {
    window.addEventListener('click', 
      () => this.handleModify(this.props.onAdminSendPlenaryDetails, this.state), 
      false);
  }
  componentWillUnmount() {
    window.removeEventListener('click', 
      () => this.handleModify(this.props.onAdminSendPlenaryDetails, this.state), 
      false);
  }
  //dispatch updated content upon click outside or submit
  handleModify(onAdminSendPlenaryDetails, updatedcontent) {
    console.log('handleModify hit')
    let payload = {}
    if (this.activeName) {  
      payload['name'] = updatedcontent.name
      this.activeName = false
    } 
    if (this.activeOrganizer) {
      payload['organizer'] = updatedcontent.organizer
      this.activeOrganizer = false
    } 
    if (this.activeStartDate) {
      payload['start_date'] = updatedcontent.start_date
      this.activeStartDate = false
    } 
    if (this.activeDescription) {
      payload['description'] = updatedcontent.description
      this.activeDescription = false
    }
    if (Object.keys(payload).length !== 0 && payload.constructor === Object) {
      onAdminSendPlenaryDetails(payload)
      console.log('sent', payload)
    }
  }
  //prevent dispatch for clicks on input bar
  handleClick(event, content) {
    event.stopPropagation();
    switch(content) {
      case "name":
        this.activeName = true;
        break;
      case "organizer":
        this.activeOrganizer = true;
        break;
      case "start_date":
        this.activeStartDate = true;
        break;
      case "description":
        this.activeDescription = true;
        break;
    }
  }

  render() {
    return <div className="plenary-info-container">
      { this.props.auth.is_admin ? 
          <form>
            <input type="text" value={this.state.name} className="name-input form-control"
            onChange={(e) => this.setState({name: e.target.value})} 
            onClick={(e) => this.handleClick(e, 'name')} />
            <input type="text" value={this.state.organizer} className="organizer-input form-control"
            onChange={(e) => this.setState({organizer: e.target.value})} 
            onClick={(e) => this.handleClick(e, 'organizer')} />
            <input type="text" value={this.state.start_date} className="start-date-input form-control"
            onChange={(e) => this.setState({start_date: e.target.value})} 
            onClick={(e) => this.handleClick(e, 'start_date')} />
            <input type="text" value={this.state.description} className="description-input form-control"
            onChange={(e) => this.setState({description: e.target.value})} 
            onClick={(e) => this.handleClick(e, 'description')} />
          </form> 
          : 
          <div>
          <h2>{this.props.plenary.name}</h2>
          <h4>{this.props.plenary.organizer}</h4>
          <h4>{this.props.plenary.start_date}</h4>
          <h4>{this.props.plenary.description}</h4>
          </div> }
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    plenary: state.plenary,
    auth: state.auth,
  }),
  (dispatch, ownProps) => ({
    onAdminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
  })
)(PlenaryInfo);