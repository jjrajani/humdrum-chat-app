import React, { Component } from "react";

export default class RemotePlayer extends Component {
  state = {
    srcObj: null
  };
  componentDidUpdate = () => {
    if (!this.player.srcObject) {
      this.player.srcObject = this.props.srcObj;
      this.setState({ srcObj: this.props.srcObj });
    }
  };
  render() {
    console.log("remote", this);
    return (
      <div className="media-wrapper">
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
      </div>
    );
  }
}
