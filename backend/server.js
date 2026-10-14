require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const statsRoutes = require("./routes/statsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const httpServer = http.createServer(app);

// Socket.IO shares the same HTTP server as Express, so both REST and
// real-time traffic go through one process on one port.
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  // A client (the workspace detail page, or an owner's monitor dashboard)
  // joins a room named after the workspace it cares about, so updates for
  // one workspace never get sent to someone watching a different one.
  socket.on("joinWorkspace", (workspaceId) => {
    socket.join(`workspace_${workspaceId}`);
  });

  socket.on("leaveWorkspace", (workspaceId) => {
    socket.leave(`workspace_${workspaceId}`);
  });

  // A logged-in client joins their own personal room so we can push live
  // notifications straight to them (new booking requests, approvals, etc).
  socket.on("joinUser", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("leaveUser", (userId) => {
    socket.leave(`user_${userId}`);
  });
});

// Make io reachable from controllers via req.app.get("io")
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// Home route — friendly message when someone opens the backend URL
app.get("/", (req, res) => {
  res.status(200).send("Smart Co-Working API is running");
});

// Test route — confirms the server itself is running
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Smart Co-Working API is running" });
});

// Feature routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, then start the server.
// If MONGO_URI isn't set yet, the server still starts so you can
// hit /api/test while you finish setting up Atlas.
if (process.env.MONGO_URI && !process.env.MONGO_URI.includes("your_mongodb")) {
  connectDB().then(() => {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
} else {
  console.warn("MONGO_URI not set — starting server without a database connection.");
  console.warn("Add your MongoDB Atlas URI to .env, then restart, to enable auth routes.");
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT} (no DB)`));
}