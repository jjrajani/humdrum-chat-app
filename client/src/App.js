import React, { Component } from "react";
import "./App.css";
import Chat from "./chat/Chat";

class App extends Component {
  render() {
    return (
      <div className="App">
        <Chat />
      </div>
    );
  }
}

export default App;
