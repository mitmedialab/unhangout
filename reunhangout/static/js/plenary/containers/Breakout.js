import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_breakoutliststyle.scss";
import * as BS from "react-bootstrap";
import * as A from "../actions";

export default class Breakout extends React.Component {
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
      this.refs.titleInput.blur()
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
    console.log('delete dispatched')
    event.preventDefault();
    this.props.onChangeBreakouts({
      type: "delete",
      index: this.props.index
    });
  }
  handleApprove(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      type: "approve",
      index: this.props.index
    });
  }
  handleVote(event) {
    event.preventDefault();
    this.props.onChangeBreakouts({
      type: "vote",
      index: this.props.index
    });
  }
  render() {
    let is_proposal = this.props.is_proposal || false
    let breakoutMode = this.props.breakoutMode || "admin"
    let votes = this.props.votes || 0
    return <div className="breakout">
          { this.props.auth.is_admin ? <form 
            onSubmit={(e) => this.handleSubmit(e, this.props.onChangeBreakouts, 
              this.state.title)}>
            <input type="text" value={this.state.title}
            onChange={(e) => this.setState({title: e.target.value})} 
            onClick={(e) => this.handleClick(e)} ref="titleInput"/>
          </form> : <h5>{this.props.title}</h5> }
          { is_proposal ? <BS.Button onClick={(e) => this.handleVote(e)}>Vote | {votes.length}</BS.Button> 
          : <BS.Button>Join</BS.Button> }
          { this.props.auth.is_admin ? <BS.Button bsStyle="danger"
          onClick= {(e) => 
            this.handleDelete(e, this.props.index)}><i className='fa fa-trash' />
           </BS.Button> : "" }
           { is_proposal && this.props.auth.is_admin ? <BS.Button onClick={(e) => this.handleApprove(e)}>Approve</BS.Button> : "" }
           { !is_proposal && (breakoutMode === "user" && this.props.auth.is_admin)? <BS.Button onClick={(e) => this.handleApprove(e)}>Unapprove</BS.Button> : ""}
        </div>
  }
}

