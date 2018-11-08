import React, { Component } from "react";
import io from "socket.io-client";
import "./App.css";

import firebase from "./db/firebase";
var servers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "webrtc",
      username: "websitebeaver@mail.com"
    }
  ]
};
var pc = new RTCPeerConnection(servers);

var database = firebase.database().ref();

class App extends Component {
  state = {
    room: "room_one",
    streams: []
  };
  showMyFace = () => {
    var me = this;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then(stream => (me.yourVideo.srcObject = stream))
      .then(stream => pc.addStream(stream));
  };

  showFriendsFace = () => {
    var me = this;
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() =>
        me.sendMessage(
          me.props.userId,
          JSON.stringify({ sdp: pc.localDescription })
        )
      );
  };

  sendMessage(senderId, data) {
    var msg = database.push({ sender: senderId, message: data });
    msg.remove();
  }

  readMessage = data => {
    var me = this;
    var msg = JSON.parse(data.val().message);
    var sender = data.val().sender;
    if (sender !== me.props.userId) {
      if (msg.ice !== undefined)
        pc.addIceCandidate(new RTCIceCandidate(msg.ice));
      else if (msg.sdp.type === "offer")
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          .then(() => pc.createAnswer())
          .then(answer => pc.setLocalDescription(answer))
          .then(() =>
            me.sendMessage(
              me.props.userId,
              JSON.stringify({ sdp: pc.localDescription })
            )
          );
      else if (msg.sdp.type === "answer")
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
  };

  componentDidMount = () => {
    var me = this;

    var socket = io();

    socket.on("connect", function() {
      socket.emit("room", me.state.room);
    });

    // Video Stream Stuff
    me.showMyFace();
    pc.onicecandidate = event => {
      event.candidate
        ? me.sendMessage(
            me.props.userId,
            JSON.stringify({ ice: event.candidate })
          )
        : console.log("Sent All Ice");
    };
    pc.onaddstream = event => {
      me.setState({ streams: [...this.state.streams, event.stream] });
      me.friendsVideo.srcObject = event.stream;
    };
    // Database Listener
    database.on("child_added", me.readMessage);
  };

  componentDidUpdate = () => {
    this.state.streams.forEach(stream => {
      this[stream.id].srcObject = stream;
    });
  };

  render() {
    return (
      <div>
        <p>video</p>
        <video ref={c => (this.yourVideo = c)} autoPlay />
        <video ref={c => (this.friendsVideo = c)} autoPlay />
        {this.state.streams.map(stream => {
          return (
            <video key={stream.id} ref={c => (this[stream.id] = c)} autoPlay />
          );
        })}
        <div id="videos" />
        <button onClick={this.showFriendsFace}>Call</button>
      </div>
    );
  }
}

export default App;
