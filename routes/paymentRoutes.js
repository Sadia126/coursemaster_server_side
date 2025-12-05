// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const {
  createCheckoutSession,
  getSession,
} = require("../controllers/paymentController");

router.post(
  "/api/create-checkout-session",
  verifyToken,
  createCheckoutSession
);
router.get("/api/session/:id", getSession);

module.exports = router;
