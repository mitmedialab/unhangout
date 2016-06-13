import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";

const classMap = {
  [WebSocket.CONNECTING]: "conecting",
  [WebSocket.OPEN]: "open",
  [WebSocket.CLOSING]: "closing",
  [WebSocket.CLOSED]: "closed",
}

class ConnectionStatus extends React.Component {
  render() {
    if (this.props.socket.state === WebSocket.OPEN) {
      return null;
    }
    return <div className='connection'>
      <div className={classMap[this.props.socket.state]}>
        { this.props.socket.state === WebSocket.CONNECTING ? this.renderConnecting() :
          this.props.socket.state === WebSocket.CLOSING ?    this.renderClosing() :
          this.props.socket.state === WebSocket.CLOSED ?     this.renderClosed() : "" }
      </div>
    </div>
  }

  renderConnecting() {
    return <span>Connecting...</span>
  }

  renderClosing() {
    return <span>Connection lost...</span>
  }
  renderClosed() {
    return <span>Trying to connect...</span>
  }
}

export default connect(
  (state) => ({socket: state.socket}),
  (dispatch, ownProps) => ({})
)(ConnectionStatus)
