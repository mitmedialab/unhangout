import React from "react";
import {connect} from "react-redux";
import * as BS from "react-bootstrap";

const cssClassMap = {
  [WebSocket.CONNECTING]: "conecting",
  [WebSocket.OPEN]: "open",
  [WebSocket.CLOSING]: "closing",
  [WebSocket.CLOSED]: "closed",
}

class ConnectionStatus extends React.Component {
  render() {
    /*
    if (this.props.socket.state === WebSocket.OPEN) {
      return null;
    }
    */
    let classes = ['connection'];
    if (this.props.socket.state === WebSocket.OPEN) {
      classes.push("open");
    }
    return <div className={classes.join(" ")}>
      <div className={cssClassMap[this.props.socket.state]}>
        { this.props.socket.state === WebSocket.CONNECTING ? this.renderConnecting() :
          this.props.socket.state === WebSocket.CLOSING ?    this.renderClosing() :
          this.props.socket.state === WebSocket.CLOSED ?     this.renderClosed() :
          this.props.socket.state === WebSocket.OPEN ?       this.renderOpen() : ""}
      </div>
    </div>
  }

  renderOpen() {
    return <span>Connected!</span>
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
