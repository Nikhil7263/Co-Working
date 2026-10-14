const Workspace = require("../models/Workspace");
const User = require("../models/User");
const notify = require("../utils/notify");

// POST /api/workspaces  (owner or admin only)
exports.createWorkspace = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      area,
      capacity,
      workspaceType,
      price,
      amenities,
      images,
    } = req.body;

    if (!name || !location || !area || !capacity || !workspaceType || !price) {
      return res.status(400).json({
        message:
          "name, location, area, capacity, workspaceType and price are required",
      });
    }

    const workspace = await Workspace.create({
      ownerId: req.user.id,
      name,
      description,
      location,
      area,
      capacity,
      occupied: 0,
      workspaceType,
      price,
      amenities: amenities || [],
      images: images || [],
      // Admin-created workspaces can go straight to approved; owner-created
      // ones start pending until an admin approves them.
      status: req.user.role === "admin" ? "approved" : "pending",
    });

    // If an owner submitted it (not an admin), let every admin know there's
    // a new listing waiting for review.
    if (req.user.role !== "admin") {
      const admins = await User.find({ role: "admin" }).select("_id");
      const io = req.app.get("io");
      admins.forEach((admin) => {
        notify(io, {
          userId: admin._id,
          type: "workspace_submitted",
          message: `New workspace "${workspace.name}" submitted for approval`,
          link: "/admin/workspaces",
          emailSubject: "New workspace pending approval",
        });
      });
    }

    res.status(201).json({ message: "Workspace created", workspace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating workspace" });
  }
};

// GET /api/workspaces  (public — supports filtering/search)
// Query params: location, minCapacity, maxPrice, workspaceType, amenities (comma separated)
exports.getWorkspaces = async (req, res) => {
  try {
    const { location, minCapacity, maxPrice, workspaceType, amenities } = req.query;

    const filter = { status: "approved" };

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }
    if (minCapacity) {
      filter.capacity = { $gte: Number(minCapacity) };
    }
    if (maxPrice) {
      filter.price = { $lte: Number(maxPrice) };
    }
    if (workspaceType) {
      filter.workspaceType = workspaceType;
    }
    if (amenities) {
      const amenityList = amenities.split(",").map((a) => a.trim());
      filter.amenities = { $all: amenityList };
    }

    const workspaces = await Workspace.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ count: workspaces.length, workspaces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching workspaces" });
  }
};

// GET /api/workspaces/match  (public — weighted smart matching)
// Query params: numberOfPeople, area, budget, location, workspaceType, amenities (comma separated)
// Weights: capacity 25%, area 20%, budget 20%, location 20%, amenities 15%
exports.getSmartMatches = async (req, res) => {
  try {
    const { numberOfPeople, area, budget, location, workspaceType, amenities } = req.query;

    const filter = { status: "approved" };
    // workspaceType is a hard filter — a shared desk request shouldn't
    // score-match against a meeting room, it should just be excluded.
    if (workspaceType) {
      filter.workspaceType = workspaceType;
    }

    const candidates = await Workspace.find(filter);

    const requestedPeople = numberOfPeople ? Number(numberOfPeople) : null;
    const requestedArea = area ? Number(area) : null;
    const requestedBudget = budget ? Number(budget) : null;
    const requestedAmenities = amenities
      ? amenities.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean)
      : [];

    const scored = candidates.map((ws) => {
      const scores = {};

      // Capacity — full credit if it fits, partial credit if it's close but short
      if (requestedPeople) {
        scores.capacity =
          ws.capacity >= requestedPeople
            ? 1
            : Math.max(ws.capacity / requestedPeople, 0);
      } else {
        scores.capacity = 1; // no preference stated, don't penalize
      }

      // Area — same logic
      if (requestedArea) {
        scores.area =
          ws.area >= requestedArea ? 1 : Math.max(ws.area / requestedArea, 0);
      } else {
        scores.area = 1;
      }

      // Budget — full credit if within budget, partial credit if slightly over
      if (requestedBudget) {
        scores.budget =
          ws.price <= requestedBudget
            ? 1
            : Math.max(requestedBudget / ws.price, 0);
      } else {
        scores.budget = 1;
      }

      // Location — case-insensitive substring match, binary
      if (location) {
        scores.location = ws.location.toLowerCase().includes(location.toLowerCase())
          ? 1
          : 0;
      } else {
        scores.location = 1;
      }

      // Amenities — fraction of the requested amenities this workspace has
      if (requestedAmenities.length > 0) {
        const wsAmenities = ws.amenities.map((a) => a.toLowerCase());
        const matched = requestedAmenities.filter((a) => wsAmenities.includes(a));
        scores.amenities = matched.length / requestedAmenities.length;
      } else {
        scores.amenities = 1;
      }

      const matchScore =
        scores.capacity * 0.25 +
        scores.area * 0.2 +
        scores.budget * 0.2 +
        scores.location * 0.2 +
        scores.amenities * 0.15;

      return {
        workspace: ws,
        matchScore: Math.round(matchScore * 100),
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      count: scored.length,
      results: scored.map((s) => ({
        ...s.workspace.toObject(),
        matchScore: s.matchScore,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error computing matches" });
  }
};

// GET /api/workspaces/:id  (public)
exports.getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    res.status(200).json({ workspace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching workspace" });
  }
};

// GET /api/workspaces/mine/list  (owner only — their own workspaces, any status)
exports.getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ ownerId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ count: workspaces.length, workspaces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching your workspaces" });
  }
};

// GET /api/workspaces/admin/all  (admin only — every workspace from every owner, any status)
// Optional ?status=pending
exports.getAllWorkspacesForAdmin = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const workspaces = await Workspace.find(filter)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: workspaces.length, workspaces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching workspaces" });
  }
};

// PUT /api/workspaces/:id  (owner of that workspace, or admin)
exports.updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isOwner = workspace.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You can only update your own workspaces" });
    }

    const allowedFields = [
      "name",
      "description",
      "location",
      "area",
      "capacity",
      "workspaceType",
      "price",
      "amenities",
      "images",
    ];

    // Only admins can directly change status (approve/reject)
    if (isAdmin && req.body.status) {
      allowedFields.push("status");
    }

    const statusBeforeChange = workspace.status;
    const newStatus = isAdmin ? req.body.status : undefined;

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        workspace[field] = req.body[field];
      }
    });

    await workspace.save();

    // Notify the owner if an admin just changed the approval status
    if (
      isAdmin &&
      newStatus &&
      newStatus !== statusBeforeChange &&
      ["approved", "rejected"].includes(newStatus)
    ) {
      notify(req.app.get("io"), {
        userId: workspace.ownerId,
        type: newStatus === "approved" ? "workspace_approved" : "workspace_rejected",
        message:
          newStatus === "approved"
            ? `Your workspace "${workspace.name}" was approved and is now live`
            : `Your workspace "${workspace.name}" was rejected`,
        link: "/my-workspaces",
        emailSubject: `Workspace ${newStatus} — ${workspace.name}`,
      });
    }

    res.status(200).json({ message: "Workspace updated", workspace });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating workspace" });
  }
};

// DELETE /api/workspaces/:id  (owner of that workspace, or admin)
exports.deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isOwner = workspace.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You can only delete your own workspaces" });
    }

    await workspace.deleteOne();
    res.status(200).json({ message: "Workspace deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting workspace" });
  }
};

// PATCH /api/workspaces/:id/occupancy  (owner or admin — updates live occupied count)
// This is the hook the real-time monitoring feature (Socket.IO) will call into later.
exports.updateOccupancy = async (req, res) => {
  try {
    const { occupied } = req.body;

    if (occupied === undefined || occupied < 0) {
      return res.status(400).json({ message: "A valid occupied count is required" });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isOwner = workspace.ownerId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "You can only update occupancy for your own workspaces" });
    }

    if (occupied > workspace.capacity) {
      return res.status(400).json({
        message: `Occupied (${occupied}) cannot exceed capacity (${workspace.capacity})`,
      });
    }

    workspace.occupied = occupied;
    await workspace.save();

    const payload = {
      workspaceId: workspace._id,
      occupied: workspace.occupied,
      capacity: workspace.capacity,
      available: workspace.capacity - workspace.occupied,
      updatedAt: new Date(),
    };

    // Push the live update to anyone currently viewing this workspace
    // (its public detail page, or the owner's monitor dashboard).
    const io = req.app.get("io");
    if (io) {
      io.to(`workspace_${workspace._id}`).emit("occupancyUpdate", payload);
    }

    res.status(200).json({
      message: "Occupancy updated",
      ...payload,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating occupancy" });
  }
};
