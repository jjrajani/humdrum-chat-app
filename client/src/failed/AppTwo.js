import React, { Component } from "react";
import "./App.css";

import firebase from "./db/firebase";
// import pc from "./util/peer_connection";

var database = firebase.database().ref();

class App extends Component {
  state = {
    room: "room_one",
    streams: []
  };

  localStream: null;

  pc = new RTCPeerConnection({});
  pc1 = new RTCPeerConnection({});
  pc2 = new RTCPeerConnection({});

  componentDidMount = () => {
    var me = this;

    // Video Stream
    me.startLocalVideo();
    // var pc = new RTCPeerConnection({});
    me.pc.onicecandidate = e => me.onIceCandidate(me.pc1, e);
    me.pc.oniceconnectionstatechange = e => me.onIceStateChange(me.pc, e);
    // pc.onicecandidate = event => {
    //   event.candidate
    //     ? me.sendStream(
    //         me.props.userId,
    //         JSON.stringify({ ice: event.candidate })
    //       )
    //     : console.log("Sent All Ice");
    // };
    // pc.onaddstream = event => {
    //   me.setState({ streams: [...this.state.streams, event.stream] });
    // };
    // // Database Listener
    // database.on("child_added", me.readMessage);
  };

  getOtherPc = pc => {
    return pc === this.pc1 ? this.pc2 : this.pc1;
  };
  getName = pc => {
    return pc === this.pc ? "pc" : pc === this.pc1 ? "pc1" : "pc2";
  };
  onIceStateChange = (pc, event) => {
    if (pc) {
      console.log(`${this.getName(pc)} ICE state: ${pc.iceConnectionState}`);
      console.log("ICE state change event: ", event);
    }
  };

  onIceCandidate = async (pc, event) => {
    try {
      await this.getOtherPc(pc).addIceCandidate(event.candidate);
      this.onAddIceCandidateSuccess(pc);
    } catch (e) {
      this.onAddIceCandidateError(pc, e);
    }
  };

  onAddIceCandidateSuccess = pc => {
    console.log(`${this.getName(pc)} addIceCandidate success`);
  };

  onAddIceCandidateError = (pc, error) => {
    console.log(
      `${this.getName(pc)} failed to add ICE Candidate: ${error.toString()}`
    );
  };

  startLocalVideo = () => {
    var me = this;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then(stream => {
        me.localStream = stream;
        me.localVideo.srcObject = stream;
        return stream;
      })
      .then(stream => me.pc.addStream(stream));
  };

  showPeerVideo = () => {
    var me = this;
    me.pc
      .createOffer()
      .then(offer => me.pc.setLocalDescription(offer))
      .then(() =>
        me.sendStream(
          me.props.userId,
          JSON.stringify({ sdp: me.pc.localDescription })
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
        me.pc.addIceCandidate(new RTCIceCandidate(msg.ice));
      else if (msg.sdp.type === "offer")
        me.pc
          .setRemoteDescription(new RTCSessionDescription(msg.sdp))
          .then(() => me.pc.createAnswer())
          .then(answer => me.pc.setLocalDescription(answer))
          .then(() =>
            me.sendStream(
              me.props.userId,
              JSON.stringify({ sdp: me.pc.localDescription })
            )
          );
      else if (msg.sdp.type === "answer")
        me.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
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
          <video ref={c => (this.localVideo = c)} autoPlay />
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
