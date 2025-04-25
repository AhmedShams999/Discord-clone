import express from "express"
import { login, logout, signup } from "../controllers/auth.controller.js"
import multer from "multer";

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


route.post('/signup',upload.single('avatar'),signup)
route.post('/login',login)
route.post('/logout',logout)

export default route

