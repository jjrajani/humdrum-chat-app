import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
// import App from "./App";
// import AppTwo from "./AppTwo";
// import AppThree from "./AppThree";
// import AppFour from "./AppFour";
// import AppFive from "./AppFive";
import AppSix from "./AppSix";
// import * as serviceWorker from "./serviceWorker";

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

ReactDOM.render(
  <AppSix userId={getRandomInt(9999999999999999)} />,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
// serviceWorker.unregister();
