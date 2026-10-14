const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      // in sq.ft
      type: Number,
      required: true,
    },
    capacity: {
      // total seats/persons
      type: Number,
      required: true,
    },
    occupied: {
      // currently occupied seats, used for real-time monitoring
      type: Number,
      default: 0,
    },
    workspaceType: {
      type: String,
      enum: ["private_cabin", "shared_desk", "meeting_room"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    amenities: {
      type: [String], // e.g. ["wifi", "parking", "cafeteria"]
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);
