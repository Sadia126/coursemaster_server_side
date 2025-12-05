// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const {
  updateProfile,
  checkAdmin,
} = require("../controllers/userController");

router.patch("/api/users/:email", verifyToken, updateProfile);
router.get("/users/admin/:email", verifyToken, checkAdmin);

module.exports = router;
