import React, { Component } from "react";
import Chat from "./Chat";

export default class AppSix extends Component {
  render() {
    return (
      <div>
        <header>
          <p className="disclaimer">
            {`This app only has one room. To start a video call, just open this app in another window. \n Let's hope there's no one in there.`}
          </p>
          <div>
            <a
              href="https://github.com/jjrajani"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
            <a
              href="https://jjrajani.github.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              portfolio
            </a>
          </div>
        </header>
        <Chat />
        <footer />
      </div>
    );
  }
}
