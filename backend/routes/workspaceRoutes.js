const express = require("express");
const router = express.Router();
const {
  createWorkspace,
  getWorkspaces,
  getSmartMatches,
  getWorkspaceById,
  getMyWorkspaces,
  getAllWorkspacesForAdmin,
  updateWorkspace,
  deleteWorkspace,
  updateOccupancy,
} = require("../controllers/workspaceController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getWorkspaces);

// Smart matching — must come before /:id so "match" isn't read as an id
router.get("/match", getSmartMatches);

// Owner-only: list their own workspaces (must come before /:id so "mine"
// isn't interpreted as an id)
router.get("/mine/list", protect, authorize("owner", "admin"), getMyWorkspaces);

// Admin-only: every workspace from every owner, any status
router.get("/admin/all", protect, authorize("admin"), getAllWorkspacesForAdmin);

router.get("/:id", getWorkspaceById);

// Protected routes
router.post("/", protect, authorize("owner", "admin"), createWorkspace);
router.put("/:id", protect, authorize("owner", "admin"), updateWorkspace);
router.delete("/:id", protect, authorize("owner", "admin"), deleteWorkspace);
router.patch(
  "/:id/occupancy",
  protect,
  authorize("owner", "admin"),
  updateOccupancy
);

module.exports = router;
