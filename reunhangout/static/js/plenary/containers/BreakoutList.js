import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";

class Breakout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {title: this.props.title};
    this.active = false;
  }
  //Add an event listener that will dispatch the updated title
  componentDidMount() {
    window.addEventListener('click', 
      () => this.handleModify(this.props.onChangeBreakouts, this.state.title), 
      false);
  }
  componentWillUnmount() {
    window.removeEventListener('click', 
      () => this.handleModify(this.props.onChangeBreakouts, this.state.title), 
      false);
  }
  //dispatch updated title upon click outside or submit
  handleModify(onChangeBreakouts, updatedTitle) {
    if (this.active) {  
      onChangeBreakouts({
        type: "modify",
        index: this.props.index,
        title: updatedTitle
      });
    }
    this.active = false
  }
  handleSubmit(event, onChangeBreakouts, updatedTitle) {
    event.preventDefault();
    if (this.active) {  
      onChangeBreakouts({
        type: "modify",
        index: this.props.index,
        title: updatedTitle
      });
    }
    this.active = false
  }
  //prevent dispatch for clicks on input bar
  handleClick(event) {
    event.stopPropagation();
    this.active = true;
  }
  //dispatch delete breakout
  handleDelete(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      type: "delete",
      index: this.props.index
    });
  }
  render() {
    return <div className="breakout">  
          { this.props.auth.is_admin ? <form 
            onSubmit={(e) => this.handleSubmit(e, this.props.onChangeBreakouts, 
              this.state.title)}>
            <BS.FormControl type="text" value={this.state.title}
            onChange={(e) => this.setState({title: e.target.value})} 
            onClick={(e) => this.handleClick(e)}/>
          </form> : <h5>{this.props.title}</h5> }
          <BS.Button>Join</BS.Button>
          { this.props.auth.is_admin ? <BS.Button bsStyle="danger"
          onClick= {(e) => 
            this.handleDelete(e, this.props.index)}><i className='fa fa-trash' />
           </BS.Button> : "" }
        </div>
  }
}

class BreakoutList extends React.Component {
  constructor() {
    super();
    this.state= {showModal: false};
  }
  //dispatch breakout creation and close modal
  handleSubmit(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      type: "create",
      title: this.state.title,
      max_attendees: this.state.max_attendees
    });
    this.setState({
      title: "",
      max_attendees: ""
    });
    this.setState({showModal: !this.state.showModal})
  }
  render() {
    return <div>
      <div className="breakout-header">
        <h4>Breakout Rooms</h4>
        { this.props.auth.is_admin ? <BS.Button onClick={() => 
          this.setState({showModal: !this.state.showModal})}>
        CREATE A SESSION</BS.Button> : "" }
        { this.props.breakoutCrud.error ?
            <div className="breakout-error">
              {this.props.breakoutCrud.error.message}
            </div> : "" }
      </div>
      <div className="create-session-dialog">
        <BS.Modal show={this.state.showModal} 
        onHide={() => this.setState({showModal: !this.state.showModal})}>
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
            onClick={() => this.setState({showModal: !this.state.showModal})}>
            Close</BS.Button>
            <BS.Button 
            onClick={(e) => this.handleSubmit(e)}>
            Create Session</BS.Button>
          </BS.Modal.Footer>
        </BS.Modal>
      </div>
      <div className="breakouts-container"> 
      {this.props.breakouts.map((breakout, i) => {
        return <Breakout title={breakout.title} maxAttendees={breakout.max} 
        key={`${i}`} auth={this.props.auth} index={i} 
        onChangeBreakouts={this.props.onChangeBreakouts} />
      })}
      </div>
    </div>

  }
}
    

export default connect(
  // map state to props
  (state) => ({
    breakouts: state.breakouts,
    breakoutCrud: state.breakoutCrud,
    plenary: state.plenary,
    auth: state.auth
  }),
  (dispatch, ownProps) => ({
    onChangeBreakouts: (payload) => dispatch(A.changeBreakouts(payload))
  })
)(BreakoutList);
