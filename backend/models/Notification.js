const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      // who this notification is for
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "booking_requested",
        "booking_approved",
        "booking_rejected",
        "booking_cancelled",
        "workspace_approved",
        "workspace_rejected",
        "workspace_submitted",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      // where clicking the notification should take the user, e.g. "/my-bookings"
      type: String,
      default: "/",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
