const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Booking = require("../models/Booking");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/stats/user  (any logged-in user — their own booking summary)
exports.getUserStats = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate("workspaceId", "name location price")
      .sort({ date: 1 });

    const counts = {
      total: bookings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
    };
    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = bookings
      .filter((b) => b.status === "approved" && b.date >= today)
      .sort((a, b) => (a.date > b.date ? 1 : -1))[0];

    res.status(200).json({ counts, upcoming: upcoming || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching your dashboard stats" });
  }
};

// GET /api/stats/owner  (owner, admin — summary across the owner's own workspaces)
exports.getOwnerStats = async (req, res) => {
  try {
    const ownerFilter = req.user.role === "admin" ? {} : { ownerId: req.user.id };

    const workspaces = await Workspace.find(ownerFilter);
    const workspaceIds = workspaces.map((w) => w._id);

    const totalCapacity = workspaces.reduce((sum, w) => sum + w.capacity, 0);
    const totalOccupied = workspaces.reduce((sum, w) => sum + w.occupied, 0);
    const occupancyRate =
      totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    const bookingFilter =
      req.user.role === "admin" ? {} : { workspaceId: { $in: workspaceIds } };

    const allBookings = await Booking.find(bookingFilter);
    const todayStr = new Date().toISOString().slice(0, 10);

    const bookingCounts = {
      total: allBookings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
    };
    allBookings.forEach((b) => {
      bookingCounts[b.status] = (bookingCounts[b.status] || 0) + 1;
    });
    const todaysBookings = allBookings.filter((b) => b.date === todayStr).length;

    res.status(200).json({
      workspaceCounts: {
        total: workspaces.length,
        pending: workspaces.filter((w) => w.status === "pending").length,
        approved: workspaces.filter((w) => w.status === "approved").length,
        rejected: workspaces.filter((w) => w.status === "rejected").length,
      },
      occupancy: {
        totalCapacity,
        totalOccupied,
        occupancyRate,
      },
      bookingCounts,
      todaysBookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching owner dashboard stats" });
  }
};

// GET /api/stats/admin  (admin only — platform-wide summary)
exports.getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalOwners, totalAdmins, totalWorkspaces, totalBookings] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "owner" }),
        User.countDocuments({ role: "admin" }),
        Workspace.countDocuments(),
        Booking.countDocuments(),
      ]);

    const pendingWorkspaces = await Workspace.countDocuments({ status: "pending" });

    const since = startOfToday();
    const [newUsersToday, newWorkspacesToday, newBookingsToday] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      Workspace.countDocuments({ createdAt: { $gte: since } }),
      Booking.countDocuments({ createdAt: { $gte: since } }),
    ]);

    res.status(200).json({
      totals: {
        users: totalUsers,
        owners: totalOwners,
        admins: totalAdmins,
        workspaces: totalWorkspaces,
        bookings: totalBookings,
        pendingWorkspaces,
      },
      today: {
        newUsers: newUsersToday,
        newWorkspaces: newWorkspacesToday,
        newBookings: newBookingsToday,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching admin dashboard stats" });
  }
};
