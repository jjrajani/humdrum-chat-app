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
  state = {
    srcObj: null
  };
  // componentDidUpdate = () => {
  //   if (!this.player.srcObj) {
  //     this.player.srcObj = this.props.srcObj;
  //     this.setState({ srcObj: this.props.srcObj });
  //   }
  // };
  render() {
    console.log("player", this.player);
    console.log("player state", this.state);
    console.log("player props", this.props);
    return (
      <video
        ref={c => {
          this.player = c;
          this.player.srcObj = this.props.srcObj;
          c.srcObj = this.props.srcObj;
        }}
        autoPlay={true}
      />
    );
  }
}

export default class AppFour extends Component {
  state = {
    socket: null /* our socket.io connection to our webserver */,
    localMediaStream: null /* our own microphone / webcam */,
    peers: {} /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */,
    peerMediaElements: {} /* keep track of our <video>/<audio> tags, indexed by peer_id */,
    remoteMediaDevices: {},
    remoteDevices: {},

    peerDevices: {}
  };

  componentDidUpdate = (props, state) => {
    console.log("DID UPDATE");
    console.log("props", props);
    console.log("state", state);
    console.dir(this.localPlayer);
    console.log("this", this);

    console.log("this.remotePlayers", this.remotePlayers);
    console.log("state.remoteDevices", state.remoteDevices);
    console.log("state.peers", state.peers);
    // if (this.remotePlayers.length !== Object.keys(state.remoteDevice).length) {
    //   let peerDevices = this.state.peerDevices;
    //   this.remotePlayers.forEach(player => {
    //     peerDevices[player.peer].stream = player.srcObj;
    //   });
    //   this.setState({ peerDevices });
    // }
    //
    // if (this.remotePlayers.length > Object.keys(this.refs).length) {
    //   return true;
    // }

    // Object.keys(this.remoteDevices).forEach(remoteDevice => {
    //   if (!remoteDevices[remoteDevice].srcObj) {
    //   }
    // });
  };

  remotePlayers = [];

  setupLocalMedia = (cb, errCb) => {
    let me = this;
    let { localMediaStream } = me.state; // ie, we've already been initialized
    if (localMediaStream != null) {
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
        me.setState({ localMediaStream: stream });
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
    let { peers, /*peer_media_elements,*/ localMediaStream } = me.state;
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
            "whatever-you-want-here": "stuff"
          }
        });
      });
    });

    // socket.on("disconnect", function() {
    //   console.log("Disconnected from signaling server");
    //   /* Tear down all of our peer connections and remove all the
    //                  * media divs when we disconnect */
    //   let { peerMediaElements, peers } = me.state;
    //   Object.keys(peerMediaElements).forEach(peer_id => {
    //     peerMediaElements[peer_id].remove();
    //   });
    //   Object.keys(peers).forEach(peer_id => {
    //     peers[peer_id].remove();
    //   });
    //
    //   // NOTE do i need this?
    //   me.setState({ peers: {}, peerMediaElements: {} });
    //   console.log("disconnect set state DID I HAPPEN!");
    // });
    /**
     * When we join a group, our signaling server will send out 'addPeer' events to each pair
     * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
     * in the channel you will connect directly to the other 5, so there will be a total of 15
     * connections in the network).
     */
    socket.on("addPeer", function(config) {
      // console.log("Signaling server said to add peer:", config);
      var peer_id = config.peer_id;
      if (peer_id in peers) {
        /* This could happen if the user joins multiple channels where the other peer is also in. */
        // console.log("Already connected to peer ", peer_id);
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
      peers[peer_id] = peer_connection;

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
        // console.log("onAddStream", event);
        me.remotePlayers.push({
          srcObj: event.stream,
          peer: peer_id
        });
        me.setState({
          peerDevices: {
            ...me.state.peerDevices,
            [peer_id]: { stream: event.stream }
          },
          remoteDevices: {
            ...me.state.removeDevices,
            [peer_id]: { stream: event.stream }
          }
        });
        // me.remotePlayers[peer_id] = React.createRef("<video>");
        // console.log("onAddStream me.state", me.state);
        // me.state.remoteMediaDevices[peer_id].stream = event.stream;
        // var remote_media = USE_VIDEO ? $("<video>") : $("<audio>");
        // remote_media.attr("autoplay", "autoplay");
        // if (MUTE_AUDIO_BY_DEFAULT) {
        //   remote_media.attr("muted", "true");
        // }
        // remote_media.attr("controls", "");
        // peer_media_elements[peer_id] = remote_media;
        // $("body").append(remote_media);

        // remote_media[0] =  event.stream;
      };
      me.setState({
        peerDevices: {
          ...me.state.peerDevices,
          [peer_id]: { peer_connection: peer_connection }
        }
      });

      /* Add our local stream */
      // console.log("localMediaStream", me.state.localMediaStream);
      peer_connection.addStream(me.state.localMediaStream);

      /* Only one side of the peer connection should create the
                     * offer, the signaling server picks one to be the offerer.
                     * The other user will get a 'sessionDescription' event and will
                     * create an offer, then send back an answer 'sessionDescription' to us
                     */
      if (config.should_create_offer) {
        // console.log("Creating RTC offer to ", peer_id);
        peer_connection.createOffer(
          function(local_description) {
            // console.log("Local offer description is: ", local_description);
            peer_connection.setLocalDescription(
              local_description,
              function() {
                socket.emit("relaySessionDescription", {
                  peer_id: peer_id,
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
      // console.log("Remote description received: ", config);
      var peer_id = config.peer_id;
      var peer = peers[peer_id];
      var remote_description = config.session_description;
      // console.log(config.session_description);

      var desc = new RTCSessionDescription(remote_description);
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
      // console.log("Description Object: ", desc);
    });

    /**
     * The offerer will send a number of ICE Candidate blobs to the answerer so they
     * can begin trying to find the best path to one another on the net.
     */
    socket.on("iceCandidate", function(config) {
      var peer = peers[config.peer_id];
      var ice_candidate = config.ice_candidate;
      peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
    });

    /**
     * When a user leaves a channel (or is disconnected from the
     * signaling server) everyone will recieve a 'removePeer' message
     * telling them to trash the media channels they have open for those
     * that peer. If it was this client that left a channel, they'll also
     * receive the removePeers. If this client was disconnected, they
     * wont receive removePeers, but rather the
     * socket.on('disconnect') code will kick in and tear down
     * all the peer sessions.
     */
    socket.on("removePeer", function(config) {
      // console.log("Signaling server said to remove peer:", config);
      var peer_id = config.peer_id;
      let { peerMediaElements, remoteMediaDevices, remoteDevices } = me.state;
      if (peer_id in peerMediaElements) {
        peerMediaElements[peer_id].remove();
      }
      if (peer_id in remoteMediaDevices) {
        remoteMediaDevices[peer_id].remove();
      }
      // if (peer_id in remoteDevices) {
      //   remoteDevices[peer_id].remove();
      // }
      if (peer_id in peers) {
        peers[peer_id].close();
      }
    });
  };

  render() {
    console.log("render", this);
    console.log("this.remotePlayers", this.remotePlayers);
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
          {this.remotePlayers.map(p => {
            console.log("p", p);
            console.log("p.srcObj", p.srcObj);
            return <Player srcObj={p.srcObj} />;
          })}
        </div>
      </div>
    );
  }
}
