import React, { Component } from "react";
import "./Chat.css";
import RemotePlayer from "./RemotePlayer";
import io from "socket.io-client";

/* CONFIG */
var SIGNALING_SERVER = "http://localhost:5001";
var ICE_SERVERS = [{ url: "stun:stun.l.google.com:19302" }];
var DEFAULT_CHANNEL = "default-humdrum-chat-app";
/** You should probably use a different stun server doing commercial stuff **/
/** Also see: https://gist.github.com/zziuni/3741933 **/

export default class Chat extends Component {
  state = {
    useAudio: false,
    useVideo: true,
    socket: null /* our socket.io connection to our webserver */,
    local_media_stream: null /* our own microphone / webcam */,
    peers: {} /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */,
    peerDevices: {} /* keep track of our streams <video>/<audio> tags, indexed by peer_id */
  };

  setupLocalMedia = (cb, errCb) => {
    let me = this;
    let { local_media_stream } = me.state; // ie, we've already been initialized
    if (local_media_stream != null) {
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
      .getUserMedia({ audio: me.state.useAudio, video: me.state.useVideo })
      .then(stream => {
        /* user accepted access to a/v */
        // console.log("Access granted to audio/video | me.state", me.state);
        me.localPlayer.srcObject = stream;
        me.setState({ local_media_stream: stream });
        // console.log("me.state", me.state);
        if (cb) cb();
      });
  };

  join_chat_channel = ({ socket, channel, userdata }) => {
    socket.emit("join", { channel, userdata });
  };

  componentDidMount = () => {
    let socket = io(SIGNALING_SERVER);
    let me = this;
    // let socket = io();
    socket.on("connect", function() {
      // console.log("Connected to signaling server", me.state);
      me.setupLocalMedia(function() {
        /* once the user has given us access to their
             * microphone/camcorder, join the channel and start peering up */
        me.join_chat_channel({
          socket,
          channel: DEFAULT_CHANNEL,
          userdata: {
            useAudio: me.state.useAudio,
            useVideo: me.state.useVideo,

            "whatever-you-want-here": "stuff"
          }
        });
      });
    });
    socket.on("disconnect", function() {
      console.log("Disconnected from signaling server");
      /* Tear down all of our peer connections and remove all the
                     * media divs when we disconnect */

      Object.keys(me.state.peers).forEach(peer_id => {
        me.state.peers[peer_id].close();
      });

      me.setState({
        peers: {},
        peerDevices: {}
      });
    });
    /**
     * When we join a group, our signaling server will send out 'addPeer' events to each pair
     * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
     * in the channel you will connect directly to the other 5, so there will be a total of 15
     * connections in the network).
     */
    socket.on("addPeer", function(config) {
      console.log("Signaling server said to add peer:", config);
      var peer_id = config.peer_id;
      if (peer_id in me.state.peers) {
        /* This could happen if the user joins multiple channels where the other peer is also in. */
        console.log("Already connected to peer ", peer_id);
        return;
      }
      var peer_connection = new RTCPeerConnection(
        { iceServers: ICE_SERVERS },
        {
          optional: [{ DtlsSrtpKeyAgreement: true }]
        } /* this will no longer be needed by chrome
                                                                            * eventually (supposedly), but is necessary
                                                                            * for now to get firefox to talk to chrome */
      );
      me.setState({
        peers: { ...me.state.peers, [peer_id]: peer_connection },
        peerDevices: {
          ...me.state.peerDevices,
          [peer_id]: {
            useAudio: config.useAudio,
            useVideo: config.useVideo
          }
        }
      });

      peer_connection.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit("relayICECandidate", {
            peer_id: peer_id,
            ice_candidate: {
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              candidate: event.candidate.candidate
            }
          });
        }
      };
      peer_connection.onaddstream = function(event) {
        let { peerDevices } = me.state;
        peerDevices[peer_id] = {
          ...peerDevices[peer_id],
          stream: event.stream
        };
        me.setState({ peerDevices });
      };

      /* Add our local stream */
      peer_connection.addStream(me.state.local_media_stream);

      /* Only one side of the peer connection should create the
                         * offer, the signaling server picks one to be the offerer.
                         * The other user will get a 'sessionDescription' event and will
                         * create an offer, then send back an answer 'sessionDescription' to us
                         */
      if (config.should_create_offer) {
        console.log("Creating RTC offer to ", peer_id);
        peer_connection.createOffer(
          function(local_description) {
            console.log("Local offer description is: ", local_description);
            peer_connection.setLocalDescription(
              local_description,
              function() {
                socket.emit("relaySessionDescription", {
                  peer_id: peer_id,
                  session_description: local_description
                });
                console.log("Offer setLocalDescription succeeded");
              },
              function() {
                alert("Offer setLocalDescription failed!");
              }
            );
          },
          function(error) {
            console.log("Error sending offer: ", error);
          }
        );
      }
    });

    /**
     * Peers exchange session descriptions which contains information
     * about their audio / video settings and that sort of stuff. First
     * the 'offerer' sends a description to the 'answerer' (with type
     * "offer"), then the answerer sends one back (with type "answer").
     */
    socket.on("sessionDescription", function(config) {
      console.log("Remote description received: ", config);
      var peer_id = config.peer_id;
      var peer = me.state.peers[peer_id];
      var remote_description = config.session_description;

      var desc = new RTCSessionDescription(remote_description);
      if (peer) {
        var stuff = peer.setRemoteDescription(
          desc,
          function() {
            console.log("setRemoteDescription succeeded");
            if (remote_description.type === "offer") {
              console.log("Creating answer");
              peer.createAnswer(
                function(local_description) {
                  console.log("Answer description is: ", local_description);
                  peer.setLocalDescription(
                    local_description,
                    function() {
                      socket.emit("relaySessionDescription", {
                        peer_id: peer_id,
                        session_description: local_description
                      });
                      console.log("Answer setLocalDescription succeeded");
                    },
                    function() {
                      alert("Answer setLocalDescription failed!");
                    }
                  );
                },
                function(error) {
                  console.log("Error creating answer: ", error);
                  console.log(peer);
                }
              );
            }
          },
          function(error) {
            console.log("setRemoteDescription error: ", error);
          }
        );
      }
      console.log("Description Object: ", desc);
    });

    /**
     * The offerer will send a number of ICE Candidate blobs to the answerer so they
     * can begin trying to find the best path to one another on the net.
     */
    socket.on("iceCandidate", function(config) {
      var peer = me.state.peers[config.peer_id];
      var ice_candidate = config.ice_candidate;
      if (peer) {
        peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
      }
    });

    /**
     * When a user leaves a channel (or is disconnected from the
     * signaling server) everyone will recieve a 'removePeer' message
     * telling them to trash the media channels they have open for those
     * that peer. If it was this client that left a channel, they'll also
     * receive the removePeers. If this client was disconnected, they
     * wont receive removePeers, but rather the
     * signaling_socket.on('disconnect') code will kick in and tear down
     * all the peer sessions.
     */
    socket.on("removePeer", function(config) {
      console.log("Signaling server said to remove peer:", config);
      var peer_id = config.peer_id;
      let { peers, peerDevices } = me.state;
      let filteredPeers = {};
      let filteredPeerDevices = {};
      Object.keys(peers).forEach(key => {
        if (key !== peer_id) {
          filteredPeers[key] = peers[key];
        }
      });
      Object.keys(peerDevices).forEach(key => {
        if (key !== peer_id) {
          filteredPeerDevices[key] = peerDevices[key];
        }
      });
      me.setState({
        peers: filteredPeers,
        peerDevices: filteredPeerDevices
      });
    });

    //   socket.on("toggle_media_setting", function(config) {
    //     console.log("toggle_media_setting", config);
    //     console.log("me.state", me.state);
    //     // me.setState({
    //     let peerDevices = {
    //       ...me.state.peerDevices,
    //       [config.peer_id]: {
    //         ...me.state.peerDevices[config.peer_id],
    //         [config.accr]: config[config.accr]
    //       }
    //     };
    //     me.setState({ peerDevices });
    //     // });
    //     // if (config.peer_id)
    //   });
    //   this.setState({ socket: socket });
    // };
    //
    // toggleMediaSettings = opt => {
    //   console.log("toggleMediaSetting");
    //   let socket = io(SIGNALING_SERVER);
    //   let me = this;
    //   socket.emit("toggle_media_setting", {
    //     channel: DEFAULT_CHANNEL,
    //     accr: opt,
    //     [opt]: !me.state[opt],
    //     socketId: me.state.socket.id
    //   });
    //   // this.setState({
    //   //   [opt]: !this.state[opt]
    //   // });
  };

  render() {
    return (
      <div className="media-streams">
        {this.state.useVideo ? (
          <div className="media-wrapper">
            <video autoPlay ref={c => (this.localPlayer = c)} />
          </div>
        ) : (
          <div className="media-wrapper">
            <audio autoPlay muted ref={c => (this.localPlayer = c)} />
          </div>
        )}

        {Object.keys(this.state.peerDevices).length > 0 &&
          this.state.peerDevices[Object.keys(this.state.peerDevices)[0]]
            .stream &&
          Object.keys(this.state.peerDevices).map((d, i) => {
            console.log("this.state.peerDevices[d]", this.state.peerDevices[d]);
            return (
              <div className="media-wrapper" key={d}>
                <RemotePlayer
                  srcObj={this.state.peerDevices[d].stream}
                  peerId={d}
                  useAudio={this.state.peerDevices[d].useAudio}
                  useVideo={this.state.peerDevices[d].useVideo}
                />
              </div>
            );
          })}
      </div>
    );
  }
}
