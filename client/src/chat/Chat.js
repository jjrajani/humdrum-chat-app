import React, { Component } from "react";
import "./chat.css";
import io from "socket.io-client";
import RoomOne from "./RoomOne";
import RoomTwo from "./RoomTwo";

export default class Chat extends Component {
  render() {
    return (
      <div>
        <RoomOne />
        <RoomTwo />
      </div>
    );
  }
}
