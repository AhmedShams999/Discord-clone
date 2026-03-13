import Notification from "../models/Notification.model.js";

export const getNotifications = async (req, res) => {
  const user = req.user;
  try {
    if (!user) return res.status(404).json({ msg: "User not found" });

    const notifications = await Notification.find({ receiverId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ msg: "All notifications", notifications });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const markAsRead = async (req, res) => {
  const { notificationId } = req.params.id;
  try {
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark as read" });
  }
};
