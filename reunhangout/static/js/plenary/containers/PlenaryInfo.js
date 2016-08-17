import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_plenaryinfostyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState} from 'draft-js';

class PlenaryInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      plenaryInfoModalOpen: false,
      name: this.props.plenary.name,
      organizer: this.props.plenary.organizer,
      start_date: this.props.plenary.start_date,
      description: this.props.plenary.description,
    };
  }
  componentWillReceiveProps(newProps) {
    this.setState({
      name: newProps.plenary.name,
      organizer: newProps.plenary.organizer,
      start_date: newProps.plenary.start_date,
      description: newProps.plenary.description,
    })
  }
  handleSubmitPlenaryInfo(e) {
    console.log('handle submit hit')
    e.preventDefault();
    this.props.onAdminSendPlenaryDetails({
      name: this.state.name,
      organizer: this.state.organizer,
      start_date: this.state.start_date,
      description: this.state.description,
    })
    this.setState({plenaryInfoModalOpen: false})
  }

  render() {
    let is_admin = this.props.auth.is_admin
    return  <div className="plenary-info-container">
              <h1>{this.props.plenary.name}</h1>
              <h3>hosted by</h3>
              <h4>{this.props.plenary.organizer}</h4>
              { is_admin ?
                <BS.Button 
                  onClick={() =>
                    this.setState({plenaryInfoModalOpen: true})
                  }>
                  <BS.Glyphicon glyph="cog"></BS.Glyphicon>
                </BS.Button>
                : ""}
              <BS.Modal show={this.state.plenaryInfoModalOpen} >
                <BS.Modal.Header>
                  <BS.Modal.Title>Event Information</BS.Modal.Title>
                </BS.Modal.Header>
                <BS.Modal.Body>
                  
                  <BS.Form horizontal>
                    <BS.FormGroup controlId="event-title">
                      <BS.Col sm={2}>Event Title</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl 
                          type="text" 
                          placeholder="Give your event a catchy title"
                          value={(this.state && this.state.name) || ""}
                          onChange={(e) => this.setState({name: e.target.value})} />
                      </BS.Col>
                    </BS.FormGroup>
                    <BS.FormGroup controlId="event-organizer">
                      <BS.Col sm={2}>Event Organizer</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl 
                          type="text" 
                          placeholder="Tell your attendees who's organizing this event" 
                          value={(this.state && this.state.organizer) || ""}
                          onChange={(e) => this.setState({organizer: e.target.value})}/>
                      </BS.Col>
                    </BS.FormGroup>
                     <BS.FormGroup controlId="eventDate">
                      <BS.Col sm={2}>Event Date/Time</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl 
                          type="text" 
                          placeholder="Event Date and Time" 
                          value={(this.state && this.state.start_date) || ""}
                          onChange={(e) => this.setState({start_date: e.target.value})}/>
                      </BS.Col>
                    </BS.FormGroup>
                    <BS.FormGroup controlId="eventDescription">
                      <BS.Col sm={2}>Event Description</BS.Col>
                      <BS.Col sm={10}>
                        <BS.FormControl 
                          componentClass="textarea"
                          value={(this.state && this.state.description) || ""}
                          onChange={(e) => this.setState({description: e.target.value})}/>
                      </BS.Col>
                    </BS.FormGroup>
                  </BS.Form>
                </BS.Modal.Body>
                <BS.Modal.Footer>
                  <BS.Button 
                  onClick={() => this.setState({plenaryInfoModalOpen: false})}>
                  Close</BS.Button>
                  <BS.Button 
                  onClick={(e) => this.handleSubmitPlenaryInfo(e)}>
                  Save</BS.Button>
                </BS.Modal.Footer>
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
  (dispatch, ownProps) => ({
    onAdminSendPlenaryDetails: (payload) => dispatch(A.adminSendPlenaryDetails(payload)),
    onSendAuthDetails: (payload) => dispatch(A.sendAuthDetails(payload)),
  })
)(PlenaryInfo);
