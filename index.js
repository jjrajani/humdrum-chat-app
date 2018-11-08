const express = require("express");
const path = require("path");
const generatePassword = require("password-generator");

const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

const port = process.env.PORT || 5000;
// app.listen(port);
app.listen(port, function() {
  console.log(`humdrum chat app listening on ${port}`);
});
