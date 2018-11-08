import React, { Component } from "react";

export default class CreateOrJoinRoom extends Component {
  state = {
    creating: true,
    newRoomName: "",
    newRoomPassword: "",
    showPassword: false,
    joinRoomName: "",
    joinRoomPassword: "",
    showJoinPassword: false
  };

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  toggleRoomPasswordShow = () => {
    this.setState({ showPassword: !this.state.showPassword });
  };

  toggleJoinPasswordShow = () => {
    this.setState({ showJoinPassword: !this.state.showJoinPassword });
  };

  onRoomJoin = e => {
    e.preventDefault();
    this.props.joinRoom({
      password: this.state.joinRoomPassword,
      roomName: this.state.joinRoomName
    });
  };

  onRoomCreate = e => {
    e.preventDefault();
    this.props.createRoom({
      password: this.state.newRoomPassword,
      roomName: this.state.newRoomName
    });
  };

  renderCreator = () => {
    return (
      <div>
        <h4>Create Room</h4>
        <form onSubmit={this.onRoomCreate}>
          <div>
            <label>Room Name</label>
            <input
              type="text"
              name="newRoomName"
              value={this.state.newRoomName}
              onChange={this.handleChange}
            />
          </div>
          {!this.state.showPassword && (
            <div>
              <label>Room Password</label>
              <input
                type="password"
                name="newRoomPassword"
                value={this.state.newRoomPassword}
                onChange={this.handleChange}
              />
              <p onClick={this.toggleRoomPasswordShow}>show password</p>
            </div>
          )}
          {this.state.showPassword && (
            <div>
              <label>Room Password</label>
              <input
                type="text"
                name="newRoomPassword"
                value={this.state.newRoomPassword}
                onChange={this.handleChange}
              />
              <p onClick={this.toggleRoomPasswordShow}>hide password</p>
            </div>
          )}
          <input type="submit" value="Create" />
        </form>
      </div>
    );
  };

  renderJoiner = () => {
    return (
      <div>
        <h4>Join Room</h4>
        <form onSubmit={this.onRoomJoin}>
          <div>
            <label>Room Name</label>
            <input
              type="text"
              name="joinRoomName"
              value={this.state.joinRoomName}
              onChange={this.handleChange}
            />
          </div>
          {!this.state.showJoinPassword && (
            <div>
              <label>Room Password</label>
              <input
                type="password"
                name="joinRoomPassword"
                value={this.state.joinRoomPassword}
                onChange={this.handleChange}
              />
              <p onClick={this.toggleJoinPasswordShow}>show password</p>
            </div>
          )}
          {this.state.showJoinPassword && (
            <div>
              <label>Room Password</label>
              <input
                type="text"
                name="joinRoomPassword"
                value={this.state.joinRoomPassword}
                onChange={this.handleChange}
              />
              <p onClick={this.toggleJoinPasswordShow}>hide password</p>
            </div>
          )}
          <input type="submit" value="Join" />
        </form>
      </div>
    );
  };

  render() {
    return (
      <div>
        {this.renderCreator()}
        {this.renderJoiner()}
      </div>
    );
  }
}
