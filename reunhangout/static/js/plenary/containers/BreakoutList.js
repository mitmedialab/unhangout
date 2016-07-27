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
      action: "create",
      title: this.state.title,
      max_attendees: this.state.max_attendees,
      is_proposal: isProposal
    });
    this.setState({
      title: "",
      max_attendees: "",
      showSessionModal: false
    });
  }
  handleModeChange(event, id) {
    event.preventDefault();
    if (id === "randomized") { 
      this.setState({
        showRandomizedModal: !this.state.showRandomizedModal
      })} else {
        this.props.onChangeBreakoutMode({breakout_mode: id})
      }
  }
  handleRandomize(event) {
    event.preventDefault();
    this.props.onChangeBreakoutMode({
      breakout_mode: "randomize", 
      randomized_max_attendees: this.state.max_attendees
    });
    this.setState({
      max_attendees: "",
      showSessionModal: false
    });
  }

  handleGroupMe(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({action: 'group_me'});
  }

  render() {

    let breakoutFilter;
    switch (this.props.plenary.breakout_mode) {
      case "admin":
        breakoutFilter = (b) => !b.is_proposal && !b.is_random;
        break;
      case "user":
        breakoutFilter = (b) => !b.is_random;
        break;
      case "randomize":
        breakoutFilter = (b) => b.is_random && (
          this.props.auth.is_superuser ||
          !!_.find(b.members, (m) => m.username === this.props.auth.username)
        );
        break;
    }
    let breakouts = this.props.breakouts.filter(breakoutFilter);

    return <div>
      <div className="breakout-header">
        <h4>Breakout Rooms</h4>
        { (this.props.auth.is_admin && (this.props.plenary.breakout_mode === "admin")) ? <BS.Button onClick={() => 
          this.setState({showSessionModal: !this.state.showSessionModal})}>
        CREATE A SESSION</BS.Button> : "" }
        { this.props.plenary.breakout_mode === "user" ? <BS.Button onClick={() => 
          this.setState({showSessionModal: !this.state.showSessionModal})}>
        PROPOSE A SESSION</BS.Button> : "" }
        { this.props.auth.is_admin ?
          <BS.DropdownButton title="Breakout Mode" id="breakout-mode">
            <BS.MenuItem onClick={(e) => this.handleModeChange(e, "admin")}>
              {this.props.plenary.breakout_mode === "admin" ? '✓' : ""}
              Admin Proposed Sessions
            </BS.MenuItem>
            <BS.MenuItem onClick={(e) => this.handleModeChange(e, "user")}>
              {this.props.plenary.breakout_mode === "user" ? '✓' : ""}
              Participant Proposed Sessions
            </BS.MenuItem>
            <BS.MenuItem onClick={(e) => this.handleModeChange(e, "randomized")}>
              {this.props.plenary.breakout_mode === "randomized" ? '✓' : ""}
              Randomized Sessions
            </BS.MenuItem>
          </BS.DropdownButton>
          : "" }

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

            { (() => {if (this.props.plenary.breakout_mode === "user") {
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
            <BS.Button onClick={(e) => this.handleRandomize(e)}>Randomize</BS.Button>        
          </BS.Modal.Footer>
        </BS.Modal>
      </div>

      <div className="breakouts-container"> 
        { breakouts.map((breakout, i) => {
            return <Breakout breakout={breakout}
              auth={this.props.auth}
              key={`${i}`}
              onChangeBreakouts={this.props.onChangeBreakouts} />
          })
        }
        { this.props.plenary.breakout_mode === "randomize" ?
            <BS.Button onClick={(e) => this.handleGroupMe(e)}>
              { breakouts.length === 0 ? "Group me" : "Regroup me" }
            </BS.Button>
          : "" }
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
    // present: {
    //   members: sortPresent(state.present, state.auth)}
  }),
  (dispatch, ownProps) => ({
    onChangeBreakouts: (payload) => dispatch(A.changeBreakouts(payload)),
    onChangeBreakoutMode: (payload) => dispatch(A.changeBreakoutMode(payload))
  })
)(BreakoutList);
