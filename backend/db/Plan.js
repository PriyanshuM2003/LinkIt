const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userType: {
      type: String,
      required: true,
    },
    order_id: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      default: "Free",
      required: true,
    },
    expireon: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      default: "Pending",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_id: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
