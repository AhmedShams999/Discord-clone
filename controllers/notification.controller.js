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
  const { notificationId } = req.params;
  try {
    if (!notificationId)
      return res.status(404).json({ msg: "No Notification Found" });

    await Notification.findByIdAndUpdate(notificationId, { read: true });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark as read" });
  }
};
export const markAllAsRead = async (req, res) => {
  const user = req.user;
  try {
    await Notification.updateMany(
      { receiverId: user._id, read: false },
      { read: true },
    );

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
};
export const clearAllNotifications = async (req, res) => {
  const user = req.user;
  try {
    if (!user) return res.status(404).json({ msg: "User not found" });
    await Notification.deleteMany({ receiverId: user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear notifications" });
  }
};
