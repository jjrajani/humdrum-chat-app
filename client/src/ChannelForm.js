import React, { Component } from "react";

export default class ChannelForm extends Component {
  state = {
    name: "",
    password: ""
  };
  onChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };
  joinRoom = e => {
    e.preventDefault();
    this.props.joinRoom({ ...this.state });
    this.setState({
      name: "",
      password: ""
    });
  };
  render() {
    return (
      <div>
        <form onSubmit={this.joinRoom}>
          <div className="input-wrapper">
            <label>Name</label>
            <input
              onChange={this.onChange}
              value={this.state.name}
              name="name"
            />
          </div>

          <div className="input-wrapper">
            <label>Password</label>
            <input
              onChange={this.onChange}
              value={this.state.password}
              name="password"
              type="password"
            />
          </div>
          <input type="submit" value="Join Room" />
        </form>
      </div>
    );
  }
}
