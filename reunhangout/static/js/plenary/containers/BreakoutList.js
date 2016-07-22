import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import Breakout from './Breakout';

class BreakoutList extends React.Component {
  constructor() {
    super();
    this.state= {showSessionModal: false,
      showRandomizedModal: false};
  }
  //dispatch breakout creation and close modal
  handleSubmit(event, isProposal) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      type: "create",
      title: this.state.title,
      max_attendees: this.state.max_attendees,
      is_proposal: isProposal
    });
    this.setState({
      title: "",
      max_attendees: ""
    });
    this.setState({showSessionModal: !this.state.showSessionModal})
  }
  handleModeChange(event, id) {
    event.preventDefault();
    if (id === "randomized") { 
      this.setState({
        showRandomizedModal: !this.state.showRandomizedModal
      })} else {
        this.props.onChangeBreakouts({
          type: "mode",
          mode: id
        })
      }
  }
  handleRandomize(event) {
    this.props.onChangeBreakouts({
      type: "mode",
      mode: "randomize"
    })
    // this.props.onChangeBreakouts({
    //   type: "random",
    //   total_members: this.props.present.members,
    //   max_attendees: this.state.max_attendees
    // })
  }
  render() {
    return <div>
      <div className="breakout-header">
        <h4>Breakout Rooms</h4>
        { (this.props.auth.is_admin && (this.props.breakoutMode["mode"] === "admin")) ? <BS.Button onClick={() => 
          this.setState({showSessionModal: !this.state.showSessionModal})}>
        CREATE A SESSION</BS.Button> : "" }
        { this.props.breakoutMode["mode"] === "user" ? <BS.Button onClick={() => 
          this.setState({showSessionModal: !this.state.showSessionModal})}>
        PROPOSE A SESSION</BS.Button> : "" }
        { this.props.auth.is_admin ? <BS.DropdownButton title="Breakout Mode" id="breakout-mode">
      <BS.MenuItem onClick={(e) => this.handleModeChange(e, "admin")}>
      Admin Proposed Sessions</BS.MenuItem>
      <BS.MenuItem onClick={(e) => this.handleModeChange(e, "user")}>
      Participant Proposed Sessions</BS.MenuItem>
      <BS.MenuItem onClick={(e) => this.handleModeChange(e, "randomized")}>
      Randomized Sessions</BS.MenuItem>
    </BS.DropdownButton> : "" }

        { this.props.breakoutCrud.error ?
            <div className="breakout-error">
              {this.props.breakoutCrud.error.message}
            </div> : "" }
      </div>
      <div className="create-session-dialog">
        <BS.Modal show={this.state.showSessionModal} 
        onHide={() => this.setState({showSessionModal: !this.state.showSessionModal})}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>Create Session</BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            <BS.Form horizontal>
            <BS.FormGroup controlId="session-name">
              <BS.Col sm={2}>Session Name</BS.Col>
              <BS.Col sm={10}><BS.FormControl type="text" 
              placeholder="Session Name"
              title={(this.state && this.state.title) || ""}
              onChange={(e) => this.setState({title: e.target.value})} />
              </BS.Col>
            </BS.FormGroup>
            <BS.FormGroup controlId="participant-limit">
              <BS.Col sm={2}>Participant Limit</BS.Col>
              <BS.Col sm={10}><BS.FormControl type="text" 
              placeholder="Max 10, Min 2" 
              max_attendees={(this.state && this.state.max_attendees) || ""}
              onChange={(e) => this.setState({max_attendees: e.target.value})}/>
              </BS.Col>
            </BS.FormGroup>
            </BS.Form>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button 
            onClick={() => this.setState({showSessionModal: !this.state.showSessionModal})}>
            Close</BS.Button>

            { (() => {if (this.props.breakoutMode['mode']==="user") {
                         return <BS.Button onClick={(e) => this.handleSubmit(e, true)}>Propose Session</BS.Button>
                       } else {
                          return <BS.Button onClick={(e) => this.handleSubmit(e, false)}>Create Session</BS.Button>
                       }})() }
            
          </BS.Modal.Footer>
        </BS.Modal>
      </div>

      <div className="randomize-dialog">
        <BS.Modal show={this.state.showRandomizedModal} 
        onHide={() => this.setState({showRandomizedModal: !this.state.showRandomizedModal})}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>Randomize Breakouts</BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            <BS.Form horizontal>
            <BS.FormGroup controlId="participant-limit">
              <BS.Col sm={2}>Participant Limit</BS.Col>
              <BS.Col sm={10}><BS.FormControl type="text" 
              placeholder="Max 10, Min 2" 
              max_attendees={(this.state && this.state.max_attendees) || ""}
              onChange={(e) => this.setState({max_attendees: e.target.value})}/>
              </BS.Col>
            </BS.FormGroup>
            </BS.Form>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button 
            onClick={() => this.setState({showRandomizedModal: !this.state.showRandomizedModal})}>
            Close</BS.Button>
            <BS.Button onClick={() => this.handleRandomize}>Randomize</BS.Button>        
          </BS.Modal.Footer>
        </BS.Modal>
      </div>

      <div className="breakouts-container"> 
      {(this.props.breakoutMode['mode']==="admin") ?
      this.props.breakouts.map((breakout, i) => {
        if (!breakout.is_proposal) {
          return <Breakout title={breakout.title} maxAttendees={breakout.max_attendees} 
        key={`${i}`} auth={this.props.auth} index={i} onChangeBreakouts={this.props.onChangeBreakouts} /> } else {
          return "";
        }
      }) : ""}
      {(this.props.breakoutMode['mode']==="user") ?
      this.props.breakouts.map((breakout, i) => {
        return <Breakout title={breakout.title} maxAttendees={breakout.max_attendees} 
        key={`${i}`} auth={this.props.auth} index={i} 
        onChangeBreakouts={this.props.onChangeBreakouts} 
        is_proposal={breakout.is_proposal} breakoutMode={this.props.breakoutMode["mode"]} votes={breakout.votes}/>
      }) : ""}
      </div> 
    </div>

  }
}

const sortPresent = (present, auth) => {
  // Sort self first, others second.
  return _.sortBy(present.members, (u) => u.username !== auth.username)
}
    
export default connect(
  // map state to props
  (state) => ({
    breakouts: state.breakouts,
    breakoutCrud: state.breakoutCrud,
    plenary: state.plenary,
    auth: state.auth,
    breakoutMode: state.breakoutMode,
    // present: {
    //   members: sortPresent(state.present, state.auth)}
  }),
  (dispatch, ownProps) => ({
    onChangeBreakouts: (payload) => dispatch(A.changeBreakouts(payload))
  })
)(BreakoutList);
