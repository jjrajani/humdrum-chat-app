import React, { Component } from "react";
import Chat from "./Chat";

export default class AppSix extends Component {
  render() {
    return (
      <div>
        <Chat />
        <footer>
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
        </footer>
      </div>
    );
  }
}
