import express from "express"
import multer from "multer";
import { acceptInvite, addChannel, createInvites, createServer, getAllChannels, getAllServers } from "../controllers/server.controller.js";
import { protectRoutes } from "../middleware/auth.middleware.js";
import { hasServerPermission } from "../middleware/permissions.middleware.js";

const storage = multer.diskStorage({
  destination: (req,file,cb)=>{
      cb(null,'uploads/auth')
  },
  filename: (req,file,cb)=>{
    const fileName = new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname;
    cb(null,fileName)
  }
})


const upload = multer({storage})

const route = express.Router()


// GetAll servers for loged in user
route.get('/',protectRoutes,getAllServers)
// GetAll channels for loged in user
route.get('/:serverId',protectRoutes,getAllChannels)

// Create server
route.post('/',protectRoutes,createServer)
// create a channel
route.post('/:serverId',protectRoutes,hasServerPermission("manage_channels"),addChannel)

// Send invits
route.post('/:serverId/invite',protectRoutes,hasServerPermission("create_invites"),createInvites)
// acceptInvite
route.get('/:code/join',protectRoutes,acceptInvite)


export default route

