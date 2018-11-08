import React, { Component } from "react";
import "./chat.css";
import CreateOrJoinRoom from "./CreateOrJoinRoom";
import firebase from "../db/firebase";
// import RoomOne from "./RoomOne";
// import RoomTwo from "./RoomTwo";
// <RoomOne />
// <RoomTwo />

export default class Chat extends Component {
  state = {
    roomName: ""
  };

  ps = null;

  componentDidMount() {
    var me = this;
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
    // me.pc = new RTCPeerConnection(servers);
    // me.pc.onicecandidate = event =>
    //   event.candidate
    //     ? me.sendMessage(
    //         me.props.userId,
    //         JSON.stringify({ ice: event.candidate })
    //       )
    //     : console.log("Sent All Ice");
    // me.pc.onaddstream = event => (me.video2.srcObject = event.stream);
    this.showMyFace();
    // this.showFriendsFace();
    var database = firebase.database().ref("rooms");
    database.on("child_added", me.readMessage);
  }

  sendMessage = (senderId, data) => {
    console.log("send messaeg", data);
    var database = firebase.database().ref("rooms");
    var msg = database.push({ sender: senderId, message: data });
    msg.remove();
  };

  showMyFace = () => {
    var me = this;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then(stream => (me.video.srcObject = stream))
      .then(stream => {
        console.log("stream", stream);
        me.sendMessage(me.props.userId, JSON.stringify(stream));
      });
    // .then(stream => {
    //   me.sendMessage(
    //     me.props.userId,
    //     JSON.stringify({ sdp: this.pc.localDescription })
    //   );
    //   return stream;
    // })
    // .then(stream => this.pc.addStream(stream));
  };

  showFriendsFace = () => {
    var me = this;
    this.pc
      .createOffer()
      .then(offer => this.pc.setLocalDescription(offer))
      .then(() =>
        me.sendMessage(
          me.props.userId,
          JSON.stringify({ sdp: this.pc.localDescription })
        )
      );
  };

  readMessage = data => {
    var me = this;
    console.log("data.val()", data.val());
    var msg = JSON.parse(data.val().message);
    var sender = data.val().sender;
    // if (sender !== me.props.userId) {
    //   if (msg.ice !== undefined)
    //     me.pc.addIceCandidate(new RTCIceCandidate(msg.ice));
    //   else if (msg.sdp.type === "offer")
    //     me.pc
    //       .setRemoteDescription(new RTCSessionDescription(msg.sdp))
    //       .then(() => me.pc.createAnswer())
    //       .then(answer => me.pc.setLocalDescription(answer))
    //       .then(() =>
    //         this.sendMessage(
    //           me.props.userId,
    //           JSON.stringify({ sdp: me.pc.localDescription })
    //         )
    //       );
    //   else if (msg.sdp.type === "answer")
    //     me.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    // }
  };

  initVideo(opts) {}

  createRoom = opts => {};

  joinRoom = opts => {
    // console.log("join room", opts);
    // this.initVideo(opts);
  };

  render() {
    return (
      <div className="chats">
        <video autoPlay={true} ref={c => (this.video = c)} />
        <video autoPlay={true} ref={c => (this.video2 = c)} />
        <h1>{this.state.roomName}</h1>
        <CreateOrJoinRoom
          createRoom={this.createRoom}
          joinRoom={this.joinRoom}
        />
      </div>
    );
    // <video autoPlay={true} ref={c => (this.video2 = c)} />
  }
}
