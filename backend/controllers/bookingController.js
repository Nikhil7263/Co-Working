const Booking = require("../models/Booking");
const Workspace = require("../models/Workspace");
const notify = require("../utils/notify");

// Sums people already booked (pending + approved) for a workspace on a given date
async function getBookedCount(workspaceId, date, excludeBookingId = null) {
  const filter = {
    workspaceId,
    date,
    status: { $in: ["pending", "approved"] },
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  const bookings = await Booking.find(filter);
  return bookings.reduce((sum, b) => sum + b.numberOfPeople, 0);
}

// POST /api/bookings  (user)
exports.createBooking = async (req, res) => {
  try {
    const { workspaceId, date, startTime, endTime, numberOfPeople, notes } = req.body;

    if (!workspaceId || !date || !startTime || !endTime || !numberOfPeople) {
      return res.status(400).json({
        message: "workspaceId, date, startTime, endTime and numberOfPeople are required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    if (workspace.status !== "approved") {
      return res.status(400).json({ message: "This workspace is not open for booking" });
    }

    const alreadyBooked = await getBookedCount(workspaceId, date);
    const remaining = workspace.capacity - alreadyBooked;

    if (numberOfPeople > remaining) {
      return res.status(409).json({
        message: "Not enough capacity for this date",
        capacity: workspace.capacity,
        alreadyBooked,
        remainingCapacity: Math.max(remaining, 0),
        requested: numberOfPeople,
      });
    }

    const booking = await Booking.create({
      userId: req.user.id,
      workspaceId,
      ownerId: workspace.ownerId,
      date,
      startTime,
      endTime,
      numberOfPeople,
      notes,
    });

    notify(req.app.get("io"), {
      userId: workspace.ownerId,
      type: "booking_requested",
      message: `New booking request for "${workspace.name}" on ${date}`,
      link: "/booking-requests",
      emailSubject: `New booking request — ${workspace.name}`,
    });

    res.status(201).json({ message: "Booking request sent", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating booking" });
  }
};

// GET /api/bookings/mine  (user — their own booking requests)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate("workspaceId", "name location price")
      .sort({ createdAt: -1 });
    res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching your bookings" });
  }
};

// GET /api/bookings/owner  (owner — booking requests for their workspaces)
// Optional ?status=pending
exports.getOwnerBookings = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin" ? {} : { ownerId: req.user.id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate("workspaceId", "name location")
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching booking requests" });
  }
};

// PATCH /api/bookings/:id/approve  (owner of that workspace, admin)
exports.approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isOwner = booking.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You can only manage bookings for your own workspaces" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    // Re-check capacity at approval time too, in case other bookings changed things
    const workspace = await Workspace.findById(booking.workspaceId);
    const alreadyBooked = await getBookedCount(booking.workspaceId, booking.date, booking._id);
    const remaining = workspace.capacity - alreadyBooked;

    if (booking.numberOfPeople > remaining) {
      return res.status(409).json({
        message: "Cannot approve — capacity for this date has since been filled",
        remainingCapacity: Math.max(remaining, 0),
      });
    }

    booking.status = "approved";
    await booking.save();

    notify(req.app.get("io"), {
      userId: booking.userId,
      type: "booking_approved",
      message: `Your booking for "${workspace.name}" on ${booking.date} was approved`,
      link: "/my-bookings",
      emailSubject: `Booking approved — ${workspace.name}`,
    });

    res.status(200).json({ message: "Booking approved", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error approving booking" });
  }
};

// PATCH /api/bookings/:id/reject  (owner of that workspace, admin)
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isOwner = booking.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You can only manage bookings for your own workspaces" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    booking.status = "rejected";
    await booking.save();

    const workspace = await Workspace.findById(booking.workspaceId).select("name");
    notify(req.app.get("io"), {
      userId: booking.userId,
      type: "booking_rejected",
      message: `Your booking for "${workspace?.name || "a workspace"}" on ${booking.date} was rejected`,
      link: "/my-bookings",
      emailSubject: `Booking update — ${workspace?.name || "your request"}`,
    });

    res.status(200).json({ message: "Booking rejected", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error rejecting booking" });
  }
};

// PATCH /api/bookings/:id/cancel  (the user who made the booking)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only cancel your own bookings" });
    }

    if (!["pending", "approved"].includes(booking.status)) {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    booking.status = "cancelled";
    await booking.save();

    const workspace = await Workspace.findById(booking.workspaceId).select("name ownerId");
    if (workspace) {
      notify(req.app.get("io"), {
        userId: workspace.ownerId,
        type: "booking_cancelled",
        message: `A booking for "${workspace.name}" on ${booking.date} was cancelled by the user`,
        link: "/booking-requests",
        emailSubject: `Booking cancelled — ${workspace.name}`,
      });
    }

    res.status(200).json({ message: "Booking cancelled", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error cancelling booking" });
  }
};

// GET /api/bookings/availability?workspaceId=&date=  (public — check remaining capacity)
exports.checkAvailability = async (req, res) => {
  try {
    const { workspaceId, date } = req.query;
    if (!workspaceId || !date) {
      return res.status(400).json({ message: "workspaceId and date are required" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const alreadyBooked = await getBookedCount(workspaceId, date);
    const remaining = Math.max(workspace.capacity - alreadyBooked, 0);

    res.status(200).json({
      capacity: workspace.capacity,
      alreadyBooked,
      remainingCapacity: remaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error checking availability" });
  }
};
