// routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  me,
} = require("../controllers/authController");

router.post("/api/register", register);
router.post("/api/login", login);
router.post("/api/logout", logout);
router.get("/api/me", me);

module.exports = router;
