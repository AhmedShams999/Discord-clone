import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.routes.js";
import serverRoute from "./routes/server.route.js";
import channelRoute from "./routes/channel.route.js";
import userRoute from "./routes/user.route.js";
import { ConnectDB } from "./config/DB.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { protectSocket } from "./middleware/auth.middleware.js";
import User from "./models/User.model.js";
import { setupSocketHandlers } from "./lib/setupSocketHandlers.js";

dotenv.config();
const PORT = process.env.PORT;
const app = express();
app.set("trust proxy", 1);
const allowedOrigins = [
  "http://localhost:4200",
  "https://short-ducks-find.loca.lt", // ✅ phone access over WiFi
];
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.set("io", io);

// ─────────────────────────────────────────────
// Middleware - runs before connection
// ─────────────────────────────────────────────
io.use(protectSocket);

app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/server", serverRoute);
app.use("/api/channel", channelRoute);
app.use("/api/user", userRoute);

io.on("connection", async (socket) => {
  setupSocketHandlers(socket);
});

server.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
  ConnectDB();
});
