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
console.log("pc", pc);

var database = firebase.database().ref();

class App extends Component {
  state = {
    room: "room_one"
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
    console.log("read message ", data);
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

    // socket.on("chat message", function(msg) {
    //   console.log("room one msg", msg);
    //   me.setState({
    //     messages: [...me.state.messages, msg]
    //   });
    // });

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
      me.friendsVideo.srcObject = event.stream;
    };
    // Database Listener
    database.on("child_added", me.readMessage);
  };

  render() {
    return (
      <div>
        <p>video</p>
        <video ref={c => (this.yourVideo = c)} autoPlay />
        <video ref={c => (this.friendsVideo = c)} autoPlay />
        <button onClick={this.showFriendsFace}>Call</button>
      </div>
    );
  }
}

//
// class App extends Component {
//   readMessage = data => {
//     var me = this;
//     console.log("data.val()", data.val());
//     var msg =
//       //   data.val().message[0] === "{"
//       //     ? JSON.parse(data.val().message)
//       // :
//       data.val().message;
//     var sender = data.val().sender;
//     // console.log("sender !== me.props.userId", sender !== me.props.userId);
//     if (sender !== me.props.userId) {
//       console.log("sender", sender);
//       console.log("msg", msg);
//       // var reader = new FileReader();
//       // reader.addEventListener("loadend", function() {
//       // reader.result contains the contents of blob as a typed array
//       if (msg) {
//         this.video2.src = msg.replace("blob:", "");
//       }
//
//       // });
//       // reader.readAsArrayBuffer(msg);
//       // if (msg.ice !== undefined)
//       //   me.pc.addIceCandidate(new RTCIceCandidate(msg.ice));
//       // else if (msg.sdp.type === "offer") {
//       //   me.pc
//       //     .setRemoteDescription(new RTCSessionDescription(msg.sdp))
//       //     .then(() => me.pc.createAnswer())
//       //     .then(answer => {
//       //       console.log("answer", answer);
//       //       me.pc.setLocalDescription(answer);
//       //     })
//       //     .then(() =>
//       //       me.sendMessage(
//       //         me.props.userId,
//       //         JSON.stringify({ sdp: me.pc.localDescription })
//       //       )
//       //     );
//       // } else if (msg.sdp.type === "answer")
//       //   me.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
//     }
//   };
//
//   componentDidMount() {
//     var me = this;
//     var database = firebase.database().ref("rooms");
//     // var friendsVideo = this.video1;
//     // var yourId = Math.floor(Math.random() * 1000000000);
//     // var servers = {
//     //   iceServers: [
//     //     { urls: "stun:stun.services.mozilla.com" },
//     //     { urls: "stun:stun.l.google.com:19302" },
//     //     {
//     //       urls: "turn:numb.viagenie.ca",
//     //       credential: "webrtc",
//     //       username: "websitebeaver@mail.com"
//     //     }
//     //   ]
//     // };
//     // me.pc = new RTCPeerConnection(servers);
//     // me.pc.onicecandidate = event =>
//     //   event.candidate
//     //     ? this.sendMessage(yourId, JSON.stringify({ ice: event.candidate }))
//     //     : console.log("Sent All Ice");
//     // me.pc.onaddstream = event => (friendsVideo.srcObject = event.stream);
//
//     database.on("child_added", me.readMessage);
//     me.showMyFace();
//     // me.showFriendsFace();
//   }
//
//   sendMessage = (senderId, data) => {
//     // var me = this;
//     var database = firebase.database().ref("rooms");
//     var msg = database.push({ sender: senderId, message: data });
//     msg.remove();
//   };
//
//   showMyFace() {
//     var me = this;
//     var database = firebase.database().ref("rooms");
//     navigator.mediaDevices
//       .getUserMedia({ audio: true, video: true })
//       .then(stream => {
//         database.push({
//           sender: me.props.userId,
//           message: window.URL.createObjectURL(stream)
//         });
//         me.video.srcObject = stream;
//         return stream;
//       });
//     // .then(stream => me.pc.addStream(stream));
//   }
//
//   showFriendsFace() {
//     var me = this;
//     me.pc
//       .createOffer()
//       .then(offer => {
//         console.log("friends offer", offer.toJSON());
//         me.pc.setLocalDescription(offer);
//       })
//       .then(() =>
//         me.sendMessage(
//           me.props.userId,
//           JSON.stringify({ sdp: me.pc.localDescription })
//         )
//       );
//   }
//   render() {
//     return (
//       <div className="App">
//         <p>{this.props.userId}</p>
//         <video autoPlay muted ref={c => (this.video = c)} />
//         <video autoPlay ref={c => (this.video2 = c)} />
//       </div>
//     );
//   }
// }
//
// export default App;

// import React, { Component } from "react";
// import "./App.css";
// import Chat from "./chat/Chat";
//
// class App extends Component {
//   render() {
//     return (
//       <div className="App">
//         <p>{this.props.userId}</p>
//         <Chat userId={this.props.userId} />
//       </div>
//     );
//   }
// }
//
export default App;
