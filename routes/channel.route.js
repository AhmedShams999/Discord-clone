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
  fileFilter: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith("video/");
    const isAudioOrImage =
      file.mimetype.startsWith("audio/") || file.mimetype.startsWith("image/");

    if (isVideo) {
      // multer doesn't support per-file size limits natively
      // so we store the type and check in the controller
      file.isVideo = true;
      cb(null, true);
    } else if (isAudioOrImage) {
      cb(null, true);
    } else {
      cb(new Error("Only audio, image and video files are allowed!"), false);
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
