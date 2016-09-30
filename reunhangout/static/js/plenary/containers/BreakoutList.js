import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";
import Breakout from './Breakout';

class BreakoutList extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      "create-session-dialog": false,
      "random-dialog": false,
      "message-breakouts-dialog": false,
      "breakout-mode-dialog": false,
      "breakout_mode": this.props.plenary.breakout_mode
    }
  }
  componentWillReceiveNewProps(newProps) {
    this.setState({"breakout_mode": newProps.plenary.breakout_mode})
  }
  handleCreateBreakout(event, isProposal) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      action: "create",
      title: this.state.title,
      max_attendees: this.state.max_attendees,
      is_proposal: isProposal,
    });
    this.setState({
      title: "",
      max_attendees: "",
      'create-session-dialog': false,
    });
  }

  handleModeChange(event) {
    event.preventDefault();
    if (this.state.breakout_mode === "random") {
      this.setState({"random-dialog": true})
    } else {
      this.props.onChangeBreakoutMode({breakout_mode: this.state.breakout_mode})
    }
    this.setState({"breakout-mode-dialog": false})
  }

  handleRandomMode(event) {
    event.preventDefault();
    this.props.onChangeBreakoutMode({
      breakout_mode: "random",
      random_max_attendees: this.state.max_attendees
    });
    this.setState({max_attendees: "", "random-dialog": false});
  }

  handleMessageBreakouts(event) {
    event.preventDefault();
    if (this.state.breakoutMessage) {
      this.props.onMessageBreakouts({
        message: `${this.props.auth.display_name}: ${this.state.breakoutMessage}`
      })
      this.setState({"message-breakouts-dialog": false});
    }
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

  renderModalForm(name, title, body, actionName, handler) {
    return <div className={name}>
      <BS.Modal show={this.state[name]}
                onHide={() => this.setState({[name]: false})}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title>{title}</BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Modal.Body>
          <BS.Form horizontal onSubmit={handler}>
            {body}
          </BS.Form>
        </BS.Modal.Body>
        <BS.Modal.Footer>
          <BS.Button onClick={() => this.setState({[name]: false})}>
            Close
          </BS.Button>
          <BS.Button onClick={handler}>{actionName}</BS.Button>
        </BS.Modal.Footer>
      </BS.Modal>
    </div>
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

    let showCreateSession = (
      breakout_mode === "user" ||
      (this.props.auth.is_admin && breakout_mode === "admin")
    );

    return <div>
      <div className="breakout-header">
        <h4>Breakout Rooms</h4>
        { showCreateSession ?
            <BS.Button
            onClick={() => this.setState({"create-session-dialog": true})}
            className="create-session-btn">
              <BS.Glyphicon glyph="plus" />
            </BS.Button>
          : "" }
        { breakout_mode === "random" ?
            <BS.Button onClick={(e) => this.handleGroupMe(e)}>
              { breakouts.length === 0 ? "Group me" : "Regroup me" }
            </BS.Button>
          : "" }
        { this.props.auth.is_admin ?
          <BS.Dropdown
            id="user-menu-button"
            pullRight>
            <BS.Dropdown.Toggle
              noCaret
              className="breakout-settings-btn">
              <img src="../../../../media/assets/control-panel-icon" />
            </BS.Dropdown.Toggle>
            <BS.Dropdown.Menu>
              <BS.MenuItem
                onClick={() => this.setState({"message-breakouts-dialog": true})}>
                Message All Breakouts
              </BS.MenuItem>
              <BS.MenuItem
                onClick={() => this.setState({"breakout-mode-dialog": true})}>
                Breakout Mode
              </BS.MenuItem>
            </BS.Dropdown.Menu>
          </BS.Dropdown>
          : "" }
        { this.props.breakoutCrud.error ?
            <div className="breakout-error">
              {this.props.breakoutCrud.error.message}
            </div>
          : "" }
      </div>

      <div className="breakouts-container">
        { breakouts.map((breakout, i) => {
            return <Breakout
              breakout={breakout}
              presence={this.props.breakout_presence[breakout.id] || {}}
              auth={this.props.auth}
              key={`${i}`}
              onChangeBreakouts={this.props.onChangeBreakouts} />
          })
        }
      </div>

      { this.renderModalForm(
          "create-session-dialog",
          "Create Session",
          <div>
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
          </div>,
          breakout_mode === "user" ? "Propose Session" : "Create Session",
          (e) => this.handleCreateBreakout(e, breakout_mode === "user")
        ) }

      { this.renderModalForm(
          "random-dialog",
          "Random Breakout Assignment",
          <div>
            <BS.FormGroup controlId="participant-limit">
              <BS.Col sm={2}>Participant Limit</BS.Col>
              <BS.Col sm={10}>
                <BS.FormControl
                  type="text"
                  placeholder="Max 10, Min 2"
                  value={(this.state && this.state.max_attendees) || ""}
                  onChange={(e) => this.setState({max_attendees: e.target.value})} />
              </BS.Col>
            </BS.FormGroup>
          </div>,
          "Set Random Mode",
          (e) => this.handleRandomMode(e)
        ) }

      { this.renderModalForm(
          "message-breakouts-dialog",
          "Message All Breakouts",
          <div>
            <BS.FormGroup controlId='breakout-message'>
              <BS.Col sm={2}>Message</BS.Col>
              <BS.Col sm={5}>
                <BS.FormControl
                  componentClass='textarea'
                  placeholder='Message'
                  value={this.state.breakoutMessage}
                  onChange={(e) => this.setState({breakoutMessage: e.target.value})} />
              </BS.Col>
              <BS.Col sm={5}>
                <h3>Preview</h3>
                <div className='breakout-message-preview'>
                  {this.props.auth.display_name}: {this.state.breakoutMessage}
                </div>
              </BS.Col>
            </BS.FormGroup>
          </div>,
          "Send Message",
          (e) => this.handleMessageBreakouts(e)
        ) }

        { this.renderModalForm(
            "breakout-mode-dialog",
            "Breakout Mode",
            <div>
              <BS.FormGroup controlId="admin-mode">
                <BS.Col sm={2}>
                <BS.Radio
                  checked={this.state.breakout_mode==="admin"}
                  onChange={() => this.setState({"breakout_mode": "admin"})} />
                </BS.Col>
                <BS.Col sm={10}>
                  Admin Proposed Sessions
                </BS.Col>
                <BS.Col sm={10}>
                  <p>Admins can create breakout sessions</p>
                </BS.Col>

                <BS.Col sm={2}>
                  <BS.Radio
                    checked={this.state.breakout_mode==="user"}
                    onChange={() => this.setState({"breakout_mode": "user"})} />
                </BS.Col>
                <BS.Col sm={10}>
                  Participant Proposed Sessions
                </BS.Col>
                <BS.Col sm={10}>
                  <p>All users can propose breakout sessions which can be voted on by all users.
                  Admins can approve these sessions after which users can join the sessions.</p>
                </BS.Col>

                <BS.Col sm={2}>
                <BS.Radio
                  checked={this.state.breakout_mode==="random"}
                  onChange={() => this.setState({"breakout_mode": "random"})} />
                </BS.Col>
                <BS.Col sm={10}>
                  Randomly Assigned Sessions
                </BS.Col>
                <BS.Col sm={10}>
                  <p>Users are randomly assigned to breakout sessions and will always be in the same breakout session.
                  Users are given the option of leaving their group and joining a new one with the "Regroup Me" button. </p>
                </BS.Col>
              </BS.FormGroup>
            </div>,
            "Set",
            (e) => this.handleModeChange(e)
          ) }
    </div>
  }
}

export default connect(
  // map state to props
  (state) => ({
    breakouts: state.breakouts,
    breakoutCrud: state.breakoutCrud,
    plenary: state.plenary,
    auth: state.auth,
    breakout_presence: state.breakout_presence,
  }),
  (dispatch, ownProps) => ({
    onChangeBreakouts: (payload) => dispatch(A.changeBreakouts(payload)),
    onChangeBreakoutMode: (payload) => dispatch(A.changeBreakoutMode(payload)),
    onMessageBreakouts: (payload) => dispatch(A.messageBreakouts(payload)),
  })
)(BreakoutList);
