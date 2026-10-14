const Notification = require("../models/Notification");
const User = require("../models/User");
const sendEmail = require("./sendEmail");

/**
 * Creates an in-app notification, pushes it live via Socket.IO to the
 * user's personal room (if they're online), and fires a best-effort email.
 * Never throws — notification failures should never break the action that
 * triggered them (a booking, an approval, etc).
 */
async function notify(io, { userId, type, message, link, emailSubject }) {
  try {
    const notification = await Notification.create({ userId, type, message, link });

    if (io) {
      io.to(`user_${userId}`).emit("notification", notification);
    }

    // Best-effort email — only if we can find the user's address and SMTP
    // is configured (sendEmail() itself no-ops gracefully if it isn't).
   const user = await User.findById(userId).select("email name");

console.log("EMAIL DEBUG:", {
  userId,
  userEmail: user?.email,
  userName: user?.name,
});
    if (user?.email) {
      sendEmail({
  to: user.email,
  subject: emailSubject || message,
  text: message,
})
  .then((result) => {
    console.log("EMAIL RESULT:", result);
  })
  .catch((error) => {
    console.error("EMAIL ERROR:", error);
  }); // fire-and-forget, already logs its own errors
    }

    return notification;
  } catch (error) {
    console.error("notify() failed:", error.message);
    return null;
  }
}

module.exports = notify;
