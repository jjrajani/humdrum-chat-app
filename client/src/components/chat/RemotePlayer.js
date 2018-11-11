import React, { Component } from "react";

class UserName extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show: true
    };
  }
  componentDidMount() {
    this.fadeOutUserName();
  }
  fadeOutUserName = () => {
    let me = this;
    setTimeout(() => {
      me.setState({ show: false });
    }, 2500);
  };

  render() {
    return (
      <h4 className={this.state.show ? "username hovered" : "username"}>
        {this.props.peerId}
      </h4>
    );
  }
}

export default class RemotePlayer extends Component {
  state = {
    srcObj: null
  };
  componentDidUpdate() {
    if (!this.player.srcObject) {
      this.player.srcObject = this.props.srcObj;
    }
    if (!this.state.srcObj || this.state.srcObj !== this.props.srcObj) {
      this.setState({ srcObj: this.props.srcObj });
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.srcObj !== nextState.srcObj;
  };

  render() {
    return (
      <div className="remote media-wrapper">
        <div className="video-wrapper">
          <video
            ref={c => {
              if (c && this.props.srcObj) {
                this.player = c;
                this.player.srcObject = this.props.srcObj;
                c.srcObject = this.props.srcObj;
              }
            }}
            autoPlay={true}
          />
          <UserName peerId={this.props.peerId} />
        </div>
      </div>
    );
  }
}
