import React, { Component } from "react";
import "./chat.css";
import io from "socket.io-client";

export default class Chat extends Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "",
      messages: []
    };
  }
  componentWillMount() {
    var socket = io();
    var me = this;
    socket.on("chat message", function(msg) {
      me.setState({ messages: [...me.state.messages, msg] });
    });
  }
  submitForm = e => {
    e.preventDefault();

    var socket = io("http://localhost:5000");

    socket.emit("chat message", this.state.message);
    this.setState({ message: "" });
  };
  handlChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };
  render() {
    return (
      <div>
        Chat
        <ul id="messages">
          {this.state.messages.map((m, i) => {
            return <li key={i}>{m}</li>;
          })}
        </ul>
        <form onSubmit={this.submitForm}>
          <input
            onChange={this.handlChange}
            name="message"
            autoComplete="off"
            value={this.state.message}
          />
          <input type="submit" value="Send" />
        </form>
      </div>
    );
  }
}
