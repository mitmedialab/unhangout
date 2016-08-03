import React from "react";
import {connect} from "react-redux";
import * as style from "../../../scss/pages/plenary/_plenaryinfostyle.scss"
import * as BS from "react-bootstrap";
import * as A from "../actions";
import {Editor, EditorState, ContentState, SelectionState} from 'draft-js';

class PlenaryInfo extends React.Component {
  constructor(props) {
    super(props);
    this.activeName = false;
    this.activeOrganizer = false;
    this.activeStartDate = false;
    this.activeDescription = false;
    this.state = {
      name: EditorState.createWithContent(ContentState.createFromText(this.props.plenary.name)),
      organizer: EditorState.createWithContent(ContentState.createFromText(this.props.plenary.organizer)),
      start_date: EditorState.createWithContent(ContentState.createFromText(this.props.plenary.start_date)),
      description: EditorState.createWithContent(ContentState.createFromText(this.props.plenary.description)),
      panelOpen: false,
    };
    this.onChangeName = (editorState) => this.setState({name: editorState});
    this.onChangeOrganizer = (editorState) => this.setState({organizer: editorState});
    this.onChangeStartDate = (editorState) => this.setState({start_date: editorState});
    this.onChangeDescription = (editorState) => this.setState({description: editorState});
  }
  componentWillReceiveProps(newProps) {
    this.setState({
      name: EditorState.createWithContent(ContentState.createFromText(newProps.plenary.name)),
      organizer: EditorState.createWithContent(ContentState.createFromText(newProps.plenary.organizer)),
      start_date: EditorState.createWithContent(ContentState.createFromText(newProps.plenary.start_date)),
      description: EditorState.createWithContent(ContentState.createFromText(newProps.plenary.description))
    })
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
    let payload = {}
    if (this.activeName) {  
      payload['name'] = updatedcontent.name.getCurrentContent().getPlainText()
      this.activeName = false
    } 
    if (this.activeOrganizer) {
      payload['organizer'] = updatedcontent.organizer.getCurrentContent().getPlainText()
      this.activeOrganizer = false
    } 
    if (this.activeStartDate) {
      payload['start_date'] = updatedcontent.start_date.getCurrentContent().getPlainText()
      this.activeStartDate = false
    } 
    if (this.activeDescription) {
      payload['description'] = updatedcontent.description.getCurrentContent().getPlainText()
      this.activeDescription = false
    }
    if (Object.keys(payload).length !== 0 && payload.constructor === Object) {
      onAdminSendPlenaryDetails(payload)
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
    let organizerHasFocus = this.state.organizer.getSelection().getHasFocus();
    let nameHasFocus= this.state.name.getSelection().getHasFocus();
    let startDateHasFocus = this.state.start_date.getSelection().getHasFocus();
    let descriptionHasFocus = this.state.description.getSelection().getHasFocus();

    return <div className="plenary-info-container">
      { this.props.auth.is_admin ? 
            <div>
              {nameHasFocus ?
                <div 
                  tabIndex="0"
                  className="name-input plenary-info-input plenary-info-focus"
                  onClick={(e) => this.handleClick(e, 'name')} >
                    <Editor 
                    editorState={this.state.name} 
                    onChange={this.onChangeName} />
                </div>
                : 
                <div 
                  tabIndex="0"
                  className="name-input plenary-info-input"
                  onClick={(e) => this.handleClick(e, 'name')} >
                    <Editor 
                    editorState={this.state.name} 
                    onChange={this.onChangeName} />
                </div>}
              <h4>hosted by</h4>
              {organizerHasFocus ?
                <div 
                  tabIndex="0"
                  className="organizer-input plenary-info-input plenary-info-focus"
                  onClick={(e) => this.handleClick(e, 'organizer')} >
                    <Editor 
                    editorState={this.state.organizer} 
                    onChange={this.onChangeOrganizer} />
                </div>
                :
                <div 
                  tabIndex="0"
                  className="organizer-input plenary-info-input"
                  onClick={(e) => this.handleClick(e, 'organizer')} >
                    <Editor 
                    editorState={this.state.organizer} 
                    onChange={this.onChangeOrganizer} />
                </div>}
              <BS.Button onClick={ ()=> this.setState({ panelOpen: !this.state.panelOpen })} >
                Plenary Details
              </BS.Button>
              <BS.Panel collapsible expanded={this.state.panelOpen}>

                {startDateHasFocus ?
                <div 
                  tabIndex="0"
                  className="start-date-input plenary-info-input plenary-info-focus"
                  onClick={(e) => this.handleClick(e, 'start_date')} >
                    <Editor 
                    editorState={this.state.start_date} 
                    onChange={this.onChangeStartDate} />
                </div>
                :
                <div 
                  tabIndex="0"
                  className="start-date-input plenary-info-input"
                  onClick={(e) => this.handleClick(e, 'start_date')} >
                    <Editor 
                    editorState={this.state.start_date} 
                    onChange={this.onChangeStartDate} />
                </div>}

                {descriptionHasFocus ?
                <div 
                  tabIndex="0"
                  className="description-input plenary-info-input plenary-info-focus"
                  onClick={(e) => this.handleClick(e, 'description')} >
                    <Editor 
                    editorState={this.state.description} 
                    onChange={this.onChangeDescription} />
                </div>
                :
                <div 
                  tabIndex="0"
                  className="description-input plenary-info-input"
                  onClick={(e) => this.handleClick(e, 'description')} >
                    <Editor 
                    editorState={this.state.description} 
                    onChange={this.onChangeDescription} />
                </div>}

              </BS.Panel>
            </div>
          : 
          <div>
          <h2>{this.props.plenary.name}</h2>
          <h3>hosted by</h3>
          <h4>{this.props.plenary.organizer}</h4>
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