import React, { Component } from "react";
import io from "socket.io-client";

export default class RoomTwo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      message: "",
      messages: [],
      room: "room_two"
    };
  }
  componentWillMount() {
    var socket = io();
    var me = this;

    socket.on("connect", function() {
      socket.emit("room", me.state.room);
    });

    socket.on("chat message", function(msg) {
      console.log("room two msg", msg);
      me.setState({
        messages: [...me.state.messages, msg]
      });
    });
  }
  submitForm = e => {
    e.preventDefault();

    var socket = io("https://humdrum-chat-app.herokuapp.com/");
    // var socket = io("http://localhost:5000");

    socket.emit("chat message", {
      msg: this.state.message,
      room: this.state.room
    });
    this.setState({ message: "" });
  };
  handlChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };
  render() {
    return (
      <div className="room">
        RoomTwo
        <ul id="messages">
          {this.state.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
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
