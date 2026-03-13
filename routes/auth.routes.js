import express from "express";
import { GetMe, login, logout, signup } from "../controllers/auth.controller.js";
import { protectRoutes } from "../middleware/auth.middleware.js";
import multer from "multer";

// Configure multer for memory storage (temporary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const route = express.Router()


route.post('/signup',upload.single('avatar'),signup)
route.post('/login',login)
route.post('/logout',protectRoutes,logout)
route.get('/me',protectRoutes,GetMe)

export default route

