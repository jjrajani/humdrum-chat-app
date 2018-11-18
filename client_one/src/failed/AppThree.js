import React, { Component } from "react";
import "./App.css";
import io from "socket.io-client";

import firebase from "./db/firebase";
import pc from "./util/peer_connection";

var database = firebase.database().ref();

class App extends Component {
  state = {
    room: "room_one",
    streams: [],
    users: [],
    streamOptions: {
      audio: false,
      video: false
    }
  };

  componentDidMount = () => {
    var socket = io();
    var me = this;

    socket.on("connect", function() {
      me.addUser(me.props.userId, socket.id);
      console.log("connect me.state.users", me.state.users);
      socket.emit("room", me.state.room, me.props.userId);
    });

    socket.on("user disconnected", function(clients) {
      clients = JSON.parse(clients)[me.state.room];
      me.resetUsers(clients);
      console.log("disconnected me.state.users", me.state.users);
    });

    socket.on("user connected", function(userId, socketId) {
      me.addUser(userId, socketId);
    });

    socket.on("offer", function(offer, socketId) {
      pc.handleOffer(offer, function(err) {
        if (err) {
          // handle error
          return;
        }
        pc.answer(
          {
            offerToReceiveAudio: me.state.streamOptions.audio,
            offerToReceiveVideo: me.state.streamOptions.video
          },
          function(err, answer) {
            if (!err) socket.emit("answer", me.state.room, answer);
          }
        );
      });
    });

    socket.on("answer", function(answer) {
      pc.handleAnswer(answer);
    });

    pc.on("ice", function(candidate) {
      socket.emit("ice", me.state.room, candidate);
    });

    socket.on("ice", function(candidate) {
      console.log("typeof candidate", typeof candidate);
      pc.processIce(candidate);
    });

    socket.on("stream", function(room, userId, stream) {
      console.log("stream", room, userId, stream);
    });
  };

  resetUsers = clients => {
    let users = this.state.users;
    let socketIds = Object.keys(clients.sockets);
    users = users.filter(user => {
      return socketIds.indexOf(user.socketId) !== -1;
    });
    this.setState({ users });
  };

  socketExists = socketId => {
    return (
      this.state.users.filter(user => {
        return user.socketId === socketId;
      }).length > 0
    );
  };

  addUser = (userId, socketId) => {
    if (!this.socketExists(socketId)) {
      console.log("addUser");
      let users = this.state.users;
      users.push({ userId, socketId });
      this.setState({ users });
    }
  };

  removeUser = userId => {
    let users = this.state.users;
    users = users.filter(user => {
      return user.userId !== userId;
    });
    this.setState({ users });
  };

  initUserMedia = () => {
    var me = this;
    var socket = io();
    navigator.mediaDevices
      .getUserMedia(this.state.streamOptions)
      .then(stream => {
        // set userVideo ref src to camera stream
        me.userVideo.srcObject = stream;
        return stream;
      })
      .then(stream => {
        pc.addStream(stream);
        return stream;
      })
      .then(stream => {
        console.log("pc.localDescription", pc.localDescription);
        socket.emit(
          "stream",
          me.state.room,
          me.props.userId,
          JSON.stringify({ sdp: pc.localDescription })
        );
      });
  };

  trackExists = type => {
    if (this.userVideo.srcObject) {
      let track =
        this.userVideo.srcObject
          .getTracks()
          .filter(track => track.kind === type)[0] || false;
      return track;
    } else {
      return false;
    }
  };

  startTrack = type => {
    this.setStreamOption(type, true, () => {
      let existingTrack = this.trackExists(type);
      if (existingTrack) {
        console.log("starting existing track", this.state.streamOptions, type);
        existingTrack.start();
      } else {
        this.initUserMedia();
      }
    });
  };

  stopTrack = type => {
    this.setStreamOption(type, false, () => {
      let existingTrack = this.trackExists(type);
      if (existingTrack) {
        console.log("stop existing track", this.state.streamOptions, type);
        existingTrack.stop();
      } else {
        this.initUserMedia();
      }
    });
  };

  setStreamOption = (type, value, cb) => {
    var newStreamOptions = {
      ...this.state.streamOptions,
      [type]: value
    };
    this.setState({ streamOptions: newStreamOptions }, () => {
      console.log("starting new track", newStreamOptions);
      cb();
    });
  };

  joinRoom = () => {
    var me = this;
    var socket = io();
    pc.offer(
      {
        offerToReceiveAudio: me.state.streamOptions.audio,
        offerToReceiveVideo: me.state.streamOptions.video
      },
      function(err, offer) {
        if (!err) socket.emit("offer", me.state.room, offer);
      }
    );
  };

  render() {
    return (
      <div className="app-wrapper">
        <p>
          To invoke video call, open this page in a second tab or browser then
          press connect.
        </p>
        <video ref={c => (this.userVideo = c)} autoPlay />
        <button onClick={this.startTrack.bind(this, "video")}>
          Start Video
        </button>
        <button onClick={this.stopTrack.bind(this, "video")}>Stop Video</button>
        <button onClick={this.startTrack.bind(this, "audio")}>
          Start Audio
        </button>

        <button onClick={this.joinRoom}>Join Room</button>
        <button onClick={this.stopTrack.bind(this, "audio")}>Stop Audio</button>
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
