import express from "express";
import multer from "multer";
import {
  acceptInvite,
  addChannel,
  addRole,
  createInvites,
  createServer,
  getAllChannels,
  getFriendsNotInServer,
  getInviteByCode,
  getServerData,
  getServerMembersWithRoles,
  getUserServerRoles,
  removeChannel,
  sendInviteToFriend,
  updateRoles,
  updateServerMembersRoles,
} from "../controllers/server.controller.js";
import { protectRoutes } from "../middleware/auth.middleware.js";
import { hasServerPermission } from "../middleware/permissions.middleware.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

const route = express.Router();
route.use(protectRoutes);

// GetAll servers for loged in user
route.get("/:serverId", getServerData);
// GetAll channels for loged in user
route.get("/channels/:serverId", getAllChannels);

// the two endpoints above they be replaced by only endpoint that get the server by sending to it the serverID and then return in res all the chennals that in that server and all data

// Create server
route.post("/", upload.single("avatar"), createServer);
// create a channel
route.post(
  "/channel/:serverId",
  hasServerPermission("manage_channels"),
  addChannel,
);
// remove a channel
route.delete(
  "/channel/:serverId/:channelId/removeChannel",
  hasServerPermission("manage_channels"),
  removeChannel,
);

// create invits
route.post(
  "/:serverId/invite",
  hasServerPermission("create_invites"),
  createInvites,
);
// send invite
route.post(
  "/:serverId/invite/send",
  hasServerPermission("create_invites"),
  sendInviteToFriend,
);

// get one invite by code
route.get("/invite/:code", getInviteByCode);

// get Friends to send invite to
route.get(
  "/:serverId/getFriends",
  hasServerPermission("create_invites"),
  getFriendsNotInServer,
);
// acceptInvite
route.get("/:code/join", acceptInvite);

// get roles
route.get("/roles/:serverId", getUserServerRoles);
// update roles
route.put("/roles/update/:serverId", updateRoles);
// create roles
route.post("/roles/:serverId", addRole);
// get members with there roles in the service
route.get("/roles/:serverId/getMembersWithRoles", getServerMembersWithRoles);
// get members with there roles in the service
route.put("/roles/:serverId/updateMembersRoles", updateServerMembersRoles);

export default route;
