import { io } from "socket.io-client";

// One shared connection for the whole app. autoConnect keeps it lazy-ish,
// but in practice we just let it connect on load — it's a single lightweight
// websocket connection, not a per-component cost.
const socket = io("http://localhost:5000", {
  autoConnect: true,
});

export default socket;
