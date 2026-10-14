const Notification = require("../models/Notification");

// GET /api/notifications/mine
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching notifications" });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your notification" });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating notification" });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating notifications" });
  }
};
