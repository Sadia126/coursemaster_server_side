// routes/assignmentRoutes.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const {
  submitAssignment,
  getMySubmission,
  getSubmissionsAdmin,
  getAllCoursesWithSubmissions,
} = require("../controllers/assignmentController");

router.post("/api/assignments/submit", verifyToken, submitAssignment);
router.get("/api/assignments/submission", verifyToken, getMySubmission);
router.get(
  "/api/assignments/submissions/admin",
  verifyToken,
  getSubmissionsAdmin
);
router.get(
  "/api/assignments/all-courses",
  verifyToken,
  getAllCoursesWithSubmissions
);

module.exports = router;
