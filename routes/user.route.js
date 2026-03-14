import express from "express";
import { protectRoutes } from "../middleware/auth.middleware.js";
import {
  acceptFriendReq,
  getAllFriends,
  getAllReq,
  getSearchedUsers,
  getUserInvites,
  getUserServers,
  rejectFriendReq,
  sendFriendReq,
} from "../controllers/user.controller.js";

const route = express.Router();

route.use(protectRoutes);
// send friend req
route.post("/add", sendFriendReq);

// accept friend req
route.post("/accept", acceptFriendReq);

// reject friend req
route.post("/reject", rejectFriendReq);

// get all friend req
route.get("/all", getAllReq);

// get all friends for the logedIn user
route.get("/friends", getAllFriends);

// search for users
route.get("/users", getSearchedUsers);

// Get All Invites For user
route.get("/invites", getUserInvites); // no middleware needed, just auth
// Get All User servers
route.get("/servers", getUserServers); // no middleware needed, just auth

export default route;
