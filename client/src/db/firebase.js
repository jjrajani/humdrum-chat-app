import firebase from "firebase";
const config = {
  apiKey: "AIzaSyAjzINQdKAjh5kc8v0VtLoplY_uQYrdYqw",

  authDomain: "humdrum-video-chat.firebaseapp.com",
  databaseURL: "https://humdrum-video-chat.firebaseio.com/",
  projectId: "humdrum-video-chat",

  storageBucket: "humdrum-video-chat.appspot.com",
  messagingSenderId: "418551667309"
};
firebase.initializeApp(config);
export default firebase;
