const express = require("express");
const path = require("path");

const app = express();

var http = require("http").Server(app);
var io = require("socket.io")(http);

var channels = {};
var sockets = {};

/**
 * Users will connect to the signaling server, after which they'll issue a "join"
 * to join a particular channel. The signaling server keeps track of all sockets
 * who are in a channel, and on join will send out 'addPeer' events to each pair
 * of users in a channel. When clients receive the 'addPeer' even they'll begin
 * setting up an RTCPeerConnection with one another. During this process they'll
 * need to relay ICECandidate information to one another, as well as SessionDescription
 * information. After all of that happens, they'll finally be able to complete
 * the peer connection and will be streaming audio/video between eachother.
 */
io.sockets.on("connection", function(socket) {
  socket.channels = {};
  sockets[socket.id] = socket;
  // console.log("[" + socket.id + "] connection accepted");
  socket.on("disconnect", function() {
    for (var channel in socket.channels) {
      part(channel);
    }
    // console.log("[" + socket.id + "] disconnected");
    delete sockets[socket.id];
  });

  socket.on("join", function(config) {
    // console.log("[" + socket.id + "] join ", config);
    var channel = config.channel;
    var userdata = config.userdata;

    if (channel in socket.channels) {
      // console.log("[" + socket.id + "] ERROR: already joined ", channel);
      return;
    }

    if (!(channel in channels)) {
      channels[channel] = {};
    }

    for (id in channels[channel]) {
      channels[channel][id].emit("addPeer", {
        peer_id: socket.id,
        should_create_offer: false
      });
      socket.emit("addPeer", { peer_id: id, should_create_offer: true });
    }

    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  });

  // app initializes with unique id
  // listens for users to create room
  // socket.on("disconnect", function() {
  //   console.log(
  //     "a user disconnected"
  //     // io.sockets.adapter.rooms["room_one"].length
  //   );
  //   var rooms = io.sockets.adapter.rooms;
  //
  //   io.sockets.emit("user disconnected", JSON.stringify(rooms));
  // });
  //
  // socket.on("room", function(room, userId) {
  //   if (socket.room) socket.leave(socket.room);
  //   socket.join(room);
  //   console.log(
  //     "a user connected",
  //     io.sockets.adapter.rooms["room_one"].length
  //   );
  //
  //   io.sockets.in(room).emit("user connected", userId, socket.id);
  // });
  //
  // socket.on("offer", function(room, offer) {
  //   io.sockets.in(room).emit("offer", offer, socket.id);
  // });
  //
  // socket.on("answer", function(room, answer) {
  //   io.sockets.in(room).emit("answer", answer, socket.id);
  // });
  //
  // socket.on("ice", function(room, ice) {
  //   io.sockets.in(room).emit("ice", ice, socket.id);
  // });
  //
  // socket.on("stream", function(room, userId, stream) {
  //   io.sockets.in(room).emit("stream", room, userId, stream);
  // });
  // socket.on("chat message", function(msg) {
  //   io.sockets.in(msg.room).emit("chat message", msg.msg);
  // });
  // socket.on("video", function(video) {
  //   console.log("video", video);
  //   io.sockets.in(msg.room).emit("video", video);
  // });

  // NOTE: SOCKET DEPENDANT UTILITIES
  function part(channel) {
    // console.log("[" + socket.id + "] part ");

    if (!(channel in socket.channels)) {
      // console.log("[" + socket.id + "] ERROR: not in ", channel);

      return;
    }

    delete socket.channels[channel];
    delete channels[channel][socket.id];

    for (id in channels[channel]) {
      channels[channel][id].emit("removePeer", { peer_id: socket.id });
      socket.emit("removePeer", { peer_id: id });
    }
  }
  socket.on("part", part);

  socket.on("relayICECandidate", function(config) {
    var peer_id = config.peer_id;
    var ice_candidate = config.ice_candidate;
    // console.log(
    //   "[" + socket.id + "] relaying ICE candidate to [" + peer_id + "] ",
    //   ice_candidate
    // );

    if (peer_id in sockets) {
      sockets[peer_id].emit("iceCandidate", {
        peer_id: socket.id,
        ice_candidate: ice_candidate
      });
    }
  });

  socket.on("relaySessionDescription", function(config) {
    var peer_id = config.peer_id;
    var session_description = config.session_description;
    // console.log(
    //   "[" + socket.id + "] relaying session description to [" + peer_id + "] ",
    //   session_description
    // );

    if (peer_id in sockets) {
      sockets[peer_id].emit("sessionDescription", {
        peer_id: socket.id,
        session_description: session_description
      });
    }
  });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

const port = process.env.PORT || 5001;
// app.listen(port);
http.listen(port, function() {
  console.log(`Password generator listening on ${port}`);
});
