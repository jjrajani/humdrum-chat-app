import React, { Component } from "react";
import "./App.css";

import firebase from "./db/firebase";
import pc from "./util/peer_connection";

var database = firebase.database().ref();

class App extends Component {
  state = {
    room: "room_one",
    streams: []
  };

  componentDidMount = () => {
    var me = this;

    // Video Stream
    me.showMyVideo();
    pc.onicecandidate = event => {
      event.candidate
        ? me.sendStream(
            me.props.userId,
            JSON.stringify({ ice: event.candidate })
          )
        : console.log("Sent All Ice");
    };
    pc.onaddstream = event => {
      me.setState({ streams: [...this.state.streams, event.stream] });
    };
    // Database Listener
    database.on("child_added", me.readMessage);
  };

  showMyVideo = () => {
    var me = this;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then(stream => (me.yourVideo.srcObject = stream))
      .then(stream => pc.addStream(stream));
  };

  showPeerVideo = () => {
    var me = this;
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() =>
        me.sendStream(
          me.props.userId,
          JSON.stringify({ sdp: pc.localDescription })
        )
      );
  };

  sendStream(senderId, data) {
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
            me.sendStream(
              me.props.userId,
              JSON.stringify({ sdp: pc.localDescription })
            )
          );
      else if (msg.sdp.type === "answer")
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
  };

  componentDidUpdate = () => {
    this.state.streams.forEach(stream => {
      this[stream.id].srcObject = stream;
    });
  };

  render() {
    return (
      <div className="app-wrapper">
        <p>
          To invoke video call, open this page in a second tab or browser then
          press connect.
        </p>
        <button onClick={this.showPeerVideo}>Connect</button>
        <div className="video-wrapper">
          <video ref={c => (this.yourVideo = c)} autoPlay />
          {this.state.streams.map(stream => {
            return (
              <video
                key={stream.id}
                ref={c => (this[stream.id] = c)}
                autoPlay
              />
            );
          })}
        </div>
        <div className="footer">
          <a
            href="https://github.com/jjrajani"
            rel="noopener noreferrer"
            target="_blank"
          >
            github
          </a>
          <a
            href="https://jjrajani.github.io"
            rel="noopener noreferrer"
            target="_blank"
          >
            portfolio
          </a>
        </div>
      </div>
    );
  }
}

export default App;
