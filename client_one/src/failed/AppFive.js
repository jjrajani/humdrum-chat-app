import React, { Component } from "react";
import io from "socket.io-client";

/* CONFIG */
var SIGNALING_SERVER = "http://localhost:5001";
var USE_AUDIO = false;
var USE_VIDEO = true;
var DEFAULT_CHANNEL = "some-global-channel-name";
var MUTE_AUDIO_BY_DEFAULT = false;
/** You should probably use a different stun server doing commercial stuff **/
/** Also see: https://gist.github.com/zziuni/3741933 **/
var ICE_SERVERS = [{ url: "stun:stun.l.google.com:19302" }];

class Player extends Component {
  getDerivedStateFromProps() {
    console.log("player getDerivedStateFromProps");
  }

  componentDidMount() {
    console.log("did mount", this.props.stream);
    console.log("this.player", this.player);
    console.dir(this.player);
    this.player.srcObject = this.props.stream;
  }

  render() {
    console.log("this.props", this.props);
    return (
      <div className="remote-video">
        remote video <video ref={c => (this.player = c)} />
      </div>
    );
  }
}

const partChatChannel = (socket, channel) => {
  console.log("PART");
  socket.emit("part", channel);
};

export default class AppFive extends Component {
  state = {
    remotePeers: {
      // [peerId]: {
      //   socket: null,
      //   stream: null
      // }
    },
    peers: {},
    peerMediaElements: {}
  };

  localMediaStream = null;

  setupLocalMedia(cb, errCb) {
    let me = this;
    if (me.localMediaStream != null) {
      /* ie, if we've already been initialized */
      if (cb) cb();
      return;
    }
    /* Ask user for permission to use the computers microphone and/or camera,
     * attach it to an <audio> or <video> tag if they give us access. */
    // console.log("Requesting access to local audio / video inputs");
    navigator.mediaDevices.getUserMedia =
      navigator.mediaDevices.getUserMedia ||
      navigator.mediaDevices.webkitGetUserMedia ||
      navigator.mediaDevices.mozGetUserMedia ||
      navigator.mediaDevices.msGetUserMedia;

    navigator.mediaDevices
      .getUserMedia({ audio: USE_AUDIO, video: USE_VIDEO })
      .then(stream => {
        /* user accepted access to a/v */
        // console.log("Access granted to audio/video | me.state", me.state);
        me.localPlayer.srcObject = stream;
        me.localMediaStream = stream;
        if (cb) cb();
      })
      .catch(err => {
        // console.log("Access denied for audio/video");
        // alert(
        //   "You chose not to provide access to the camera/microphone, demo will not work."
        // );
        if (errCb) errCb();
      });
  }

  componentDidMount() {
    const me = this;
    let socket = io(SIGNALING_SERVER);
    console.log("did mount");

    socket.on("connect", function() {
      console.log("Connected to signaling server");
      me.setupLocalMedia(
        socket.emit("join", DEFAULT_CHANNEL, {
          "whatever-you-want-here": "stuff"
        })
      );
    });

    socket.on("addPeer", function(config) {
      // console.log("Signaling server said to add peer:", config);
      var peerId = config.peer_id;
      if (peerId in me.state.peers) {
        /* This could happen if the user joins multiple channels where the other peer is also in. */
        // console.log("Already connected to peer ", peerId);
        return;
      }
      var peerConnection = new RTCPeerConnection(
        { iceServers: ICE_SERVERS },
        {
          optional: [{ DtlsSrtpKeyAgreement: true }]
        } /* this will no longer be needed by chrome
                                                                        * eventually (supposedly), but is necessary
                                                                        * for now to get firefox to talk to chrome */
      );

      // console.log("me.state", me.state);

      peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit("relayICECandidate", {
            peer_id: peerId,
            ice_candidate: {
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate
            }
          });
        }
      };

      peerConnection.onaddstream = function(event) {
        console.log("onAddStream", event);

        // me.setState({
        //   peerMediaElements: {
        //     ...me.state.peerMediaElements,
        //     [peerId]: { stream: event.stream }
        //   }
        // });
      };

      /* Add our local stream */
      if (me.localMediaStream) {
        peerConnection.addStream(me.localMediaStream);
      }

      /* Only one side of the peer connection should create the
                     * offer, the signaling server picks one to be the offerer.
                     * The other user will get a 'sessionDescription' event and will
                     * create an offer, then send back an answer 'sessionDescription' to us
                     */
      if (config.should_create_offer) {
        // console.log("Creating RTC offer to ", peerId);
        peerConnection.createOffer(
          function(local_description) {
            // console.log("Local offer description is: ", local_description);
            peerConnection.setLocalDescription(
              local_description,
              function() {
                socket.emit("relaySessionDescription", {
                  peer_id: peerId,
                  session_description: local_description
                });
                // console.log("Offer setLocalDescription succeeded");
              },
              function() {
                alert("Offer setLocalDescription failed!");
              }
            );
          },
          function(error) {
            // console.log("Error sending offer: ", error);
          }
        );
      }
      me.setState({ peers: { ...me.state.peers, [peerId]: peerConnection } });
    });

    /**
     * Peers exchange session descriptions which contains information
     * about their audio / video settings and that sort of stuff. First
     * the 'offerer' sends a description to the 'answerer' (with type
     * "offer"), then the answerer sends one back (with type "answer").
     */
    socket.on("sessionDescription", function(config) {
      // console.log("Remote description received: ", config);
      var peer_id = config.peer_id;
      var peer = me.state.peers[peer_id];
      var remote_description = config.session_description;
      // console.log(config.session_description);

      var desc = new RTCSessionDescription(remote_description);
      var stuff = peer.setRemoteDescription(
        desc,
        function() {
          // console.log("setRemoteDescription succeeded");
          if (remote_description.type === "offer") {
            // console.log("Creating answer");
            peer.createAnswer(
              function(local_description) {
                // console.log("Answer description is: ", local_description);
                peer.setLocalDescription(
                  local_description,
                  function() {
                    socket.emit("relaySessionDescription", {
                      peer_id: peer_id,
                      session_description: local_description
                    });
                    // console.log("Answer setLocalDescription succeeded");
                  },
                  function() {
                    // alert("Answer setLocalDescription failed!");
                  }
                );
              },
              function(error) {
                // console.log("Error creating answer: ", error);
                // console.log(peer);
              }
            );
          }
        },
        function(error) {
          // console.log("setRemoteDescription error: ", error);
        }
      );
      // console.log("Description Object: ", desc);
    });

    socket.on("iceCandidate", function(config) {
      var peer = me.state.peers[config.peer_id];
      var ice_candidate = config.ice_candidate;
      peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
    });

    // socket.on("disconnect", function() {
    //   console.log("Disconnected from signaling server");
    //   let { peerMediaElements, peers } = me.state;
    //   Object.keys(peerMediaElements).forEach(peerId => {
    //     peerMediaElements[peerId].remove();
    //   });
    //   Object.keys(peers).forEach(peerId => {
    //     peers[peerId].close();
    //   });
    //   me.setState({
    //     peers: {},
    //     peerMediaElements: {}
    //   });
    // });
  }

  render() {
    console.log("render", this.state);
    return (
      <div>
        AppFour
        {USE_VIDEO ? (
          <div className="video-wrapper">
            <p>video</p>
            <video autoPlay ref={c => (this.localPlayer = c)} />
          </div>
        ) : (
          <div>
            <p>audio</p>
            <audio autoPlay muted ref={c => (this.localPlayer = c)} />
          </div>
        )}
        <div>
          {Object.keys(this.state.peerMediaElements).length > 0 &&
            Object.keys(this.state.peerMediaElements).map(e => {
              console.log("e", e);
              console.log("this.state", this.state);
              console.log(
                "this.state.peerMediaElements[e]",
                this.state.peerMediaElements[e]
              );
              return <Player stream={this.state.peerMediaElements[e]} />;
            })}
        </div>
      </div>
    );
  }
}
