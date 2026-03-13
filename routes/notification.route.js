import express from "express";

import { protectRoutes } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();
router.use(protectRoutes);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);

export default router;
