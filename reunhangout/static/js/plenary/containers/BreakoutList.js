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
      showRandomBreakoutdModal: false};
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
    if (id === "random") { 
      this.setState({
        showRandomBreakoutModal: !this.state.showRandomBreakoutModal
      })} else {
        this.props.onChangeBreakoutMode({breakout_mode: id})
      }
  }
  handleRandomMode(event) {
    event.preventDefault();
    this.props.onChangeBreakoutMode({
      breakout_mode: "random",
      random_max_attendees: this.state.max_attendees
    });
    this.setState({
      max_attendees: "",
      showRandomBreakoutModal: false
    });
  }
  handleGroupMe(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({action: 'group_me'});
  }
  sortBreakouts(breakouts) {
    let approved = breakouts.filter((b) => {
      return !b.is_proposal
    })
    let unapproved = breakouts.filter((b) => {
      return b.is_proposal
    })
    return [...approved, ...unapproved]
  }
  render() {
    let breakout_mode = this.props.plenary.breakout_mode
    let breakoutFilter;
    switch (breakout_mode) {
      case "admin":
        breakoutFilter = (b) => !b.is_proposal && !b.is_random;
        break;
      case "user":
        breakoutFilter = (b) => !b.is_random;
        break;
      case "random":
        breakoutFilter = (b) => b.is_random && (
          this.props.auth.is_superuser ||
          !!_.find(b.members, (m) => m.username === this.props.auth.username)
        );
        break;
    }
    let breakouts = this.props.breakouts.filter(breakoutFilter);
    if (breakout_mode === "user") {
      breakouts = this.sortBreakouts(breakouts)
    }

    return <div>
      <div className="breakout-header">
        <h4>Breakout Rooms</h4>
        { (this.props.auth.is_admin && (breakout_mode === "admin")) ? <BS.Button onClick={() => 
          this.setState({showSessionModal: !this.state.showSessionModal})}>
        CREATE A SESSION</BS.Button> : "" }
        { breakout_mode === "user" ? <BS.Button onClick={() => 
          this.setState({showSessionModal: !this.state.showSessionModal})}>
        PROPOSE A SESSION</BS.Button> : "" }
        { this.props.auth.is_admin ?
          <BS.DropdownButton title="Breakout Mode" id="breakout-mode" pullRight>
            <BS.MenuItem onClick={(e) => this.handleModeChange(e, "admin")}>
              {breakout_mode === "admin" ? '✓' : ""}
              Admin Proposed Sessions
            </BS.MenuItem>
            <BS.MenuItem onClick={(e) => this.handleModeChange(e, "user")}>
              {breakout_mode === "user" ? '✓' : ""}
              Participant Proposed Sessions
            </BS.MenuItem>
            <BS.MenuItem onClick={(e) => this.handleModeChange(e, "random")}>
              {breakout_mode === "random" ? '✓' : ""}
              Randomly Assigned Sessions
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

            { (() => {if (breakout_mode === "user") {
                         return <BS.Button onClick={(e) => this.handleSubmit(e, true)}>Propose Session</BS.Button>
                       } else {
                          return <BS.Button onClick={(e) => this.handleSubmit(e, false)}>Create Session</BS.Button>
                       }})() }
            
          </BS.Modal.Footer>
        </BS.Modal>
      </div>

      <div className="random-dialog">
        <BS.Modal show={this.state.showRandomBreakoutModal}
        onHide={() => this.setState({showRandomBreakoutModal: !this.state.showRandomBreakoutModal})}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>Random Breakout Assignment</BS.Modal.Title>
          </BS.Modal.Header>
          <BS.Modal.Body>
            <BS.Form horizontal
            onSubmit={(e) => {e.preventDefault()}}>
            <BS.FormGroup controlId="participant-limit">
              <BS.Col sm={2}>Participant Limit</BS.Col>
              <BS.Col sm={10}><BS.FormControl type="text" 
              placeholder="Max 10, Min 2" 
              max_attendees={(this.state && this.state.max_attendees) || ""}
              onChange={(e) => this.setState({max_attendees: e.target.value})} />
              </BS.Col>
            </BS.FormGroup>
            </BS.Form>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button 
            onClick={() => this.setState({showRandomBreakoutModal: !this.state.showRandomBreakoutModal})}>
            Close</BS.Button>
            <BS.Button onClick={(e) => this.handleRandomMode(e)}>Set Random Mode</BS.Button>
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
        { breakout_mode === "random" ?
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
