// routes/courseRoutes.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const {
  createCourse,
  getAllCourses,
  getCourseById,
  completeModule,
  getStudentsForCourse,
  updateAssignmentMark,
  saveMcqResult,
} = require("../controllers/courseController");

router.post("/api/courses", verifyToken, createCourse);
router.get("/api/courses", getAllCourses);
router.get("/api/courses/:id", getCourseById);

router.patch(
  "/api/users/:email/completeModule",
  verifyToken,
  completeModule
);
router.get(
  "/api/courses/:id/students",
  verifyToken,
  getStudentsForCourse
);
router.patch(
  "/api/users/:email/assignment-mark",
  verifyToken,
  updateAssignmentMark
);

router.post("/api/save-mcq", verifyToken, saveMcqResult);

module.exports = router;
