import express from "express"
import multer from "multer";
import { hasChannelPermission } from "../middleware/permissions.middleware.js";
import { sendMessage } from "../controllers/channel.controller.js";
import { protectRoutes } from "../middleware/auth.middleware.js";

const storage = multer.diskStorage({
  destination: (req,file,cb)=>{
     if(file.mimetype == "audio/mpeg"){
      cb(null,'uploads/voices')
      
    }else{
      cb(null,'uploads/messages')

    }
     
  },
  filename: (req,file,cb)=>{
    const fileName = new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname;
    cb(null,fileName)
  }
})


const upload = multer({storage})

const route = express.Router()

// send message
route.post('/:channelId/messages',protectRoutes,hasChannelPermission('send_messages'),upload.array('image'),sendMessage);





export default route

