import express from "express"
import { protectRoutes } from "../middleware/auth.middleware.js"
import { acceptFriendReq, getAllReq, rejectFriendReq, sendFriendReq } from "../controllers/user.controller.js"

const route = express.Router()


// send friend req 
route.post('/add',protectRoutes,sendFriendReq)

// accept friend req
route.get('/accept/:friendId',protectRoutes,acceptFriendReq)

// reject friend req
route.get('/reject/:friendId',protectRoutes,rejectFriendReq)

// get all friend req
route.get('/all',protectRoutes,getAllReq)

export default route

