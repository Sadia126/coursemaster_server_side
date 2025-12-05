
// routes/webhookRoutes.js
const express = require("express");
const router = express.Router();

const { handleStripeWebhook } = require("../controllers/webhookController");

// NOTE: path is "/", mounted as "/webhook" in server.js
router.post("/", express.raw({ type: "application/json" }), handleStripeWebhook);

module.exports = router;
