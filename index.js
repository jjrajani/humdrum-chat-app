const express = require("express");
const path = require("path");
const generatePassword = require("password-generator");

const app = express();

var http = require("http").Server(app);
var io = require("socket.io")(http);

io.on("connection", function(socket) {
  console.log("a user connected");

  // app initializes with unique id
  // listens for users to create room

  socket.on("disconnect", function() {
    console.log("user disconnected");
  });

  socket.on("room", function(room, userId) {
    if (socket.room) socket.leave(socket.room);

    socket.join(room);
    io.sockets.in(room).emit("user connected", userId);
  });

  socket.on("chat message", function(msg) {
    io.sockets.in(msg.room).emit("chat message", msg.msg);
  });

  socket.on("video", function(video) {
    console.log("video", video);
    io.sockets.in(msg.room).emit("video", video);
  });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

const port = process.env.PORT || 5000;
// app.listen(port);
http.listen(port, function() {
  console.log(`Password generator listening on ${port}`);
});
