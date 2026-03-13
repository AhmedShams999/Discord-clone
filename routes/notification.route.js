import express from "express";

import { protectRoutes } from "../middleware/auth.middleware.js";
import {
  clearAllNotifications,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();
router.use(protectRoutes);

router.get("/", getNotifications);
router.patch("/:notificationId/read", markAsRead);
router.patch("/readAll", markAllAsRead);

router.delete("/clear", clearAllNotifications);

export default router;
