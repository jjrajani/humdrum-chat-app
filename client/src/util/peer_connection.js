var servers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "webrtc",
      username: "websitebeaver@mail.com"
    }
  ]
};
var pc = new RTCPeerConnection(servers);

export default pc;
