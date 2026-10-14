const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  checkAvailability,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public
router.get("/availability", checkAvailability);

// Logged-in user
router.post("/", protect, createBooking);
router.get("/mine", protect, getMyBookings);
router.patch("/:id/cancel", protect, cancelBooking);

// Owner / admin
router.get("/owner", protect, authorize("owner", "admin"), getOwnerBookings);
router.patch("/:id/approve", protect, authorize("owner", "admin"), approveBooking);
router.patch("/:id/reject", protect, authorize("owner", "admin"), rejectBooking);

module.exports = router;
