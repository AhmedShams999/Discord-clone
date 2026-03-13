import express from "express";
import multer from "multer";
import { hasChannelPermission } from "../middleware/permissions.middleware.js";
import {
  DMChannel,
  getAllMessages,
  getVoiceChannelUsers,
  sendMessage,
} from "../controllers/channel.controller.js";
import { protectRoutes } from "../middleware/auth.middleware.js";

// Configure multer for memory storage (temporary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (adjust as needed)
  },
  fileFilter: (req, file, cb) => {
    // Allow audio and image files
    if (
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only audio and image files are allowed!"), false);
    }
  },
});

const route = express.Router();
route.use(protectRoutes);
// send message
route.post(
  "/send",
  upload.array("image"),
  hasChannelPermission("send_messages"),
  sendMessage,
);

// get a DM channel or create it
route.get("/:friendUsername", DMChannel);

// get all channel messages
route.get("/messages/:channelId", getAllMessages);

// voice channles
route.get("/:channelId/voice-users", getVoiceChannelUsers);

export default route;
