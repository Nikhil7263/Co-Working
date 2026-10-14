const express = require("express");
const router = express.Router();
const { getUserStats, getOwnerStats, getAdminStats } = require("../controllers/statsController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/user", protect, getUserStats);
router.get("/owner", protect, authorize("owner", "admin"), getOwnerStats);
router.get("/admin", protect, authorize("admin"), getAdminStats);

module.exports = router;
