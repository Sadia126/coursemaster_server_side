// controllers/assignmentController.js
const {
  getUsersCollection,
  getCoursesCollection,
  getAssignmentSubmissionsCollection,
  ObjectId,
} = require("../config/db");

exports.submitAssignment = async (req, res) => {
  try {
    const { courseId, milestoneIndex, moduleIndex, submissionText } = req.body;
    const AssignmentSubmissionsCollection = getAssignmentSubmissionsCollection();

    if (!courseId || milestoneIndex === undefined || moduleIndex === undefined) {
      return res.status(400).json({
        message: "courseId, milestoneIndex and moduleIndex are required",
      });
    }

    if (!submissionText || submissionText.trim() === "") {
      return res
        .status(400)
        .json({ message: "Submission text is required" });
    }

    const submission = {
      courseId: new ObjectId(courseId),
      milestoneIndex,
      moduleIndex,
      studentEmail: req.user.email,
      studentName: req.user.name,
      submissionText,
      submittedAt: new Date(),
    };

    const result = await AssignmentSubmissionsCollection.insertOne(submission);

    res.status(201).json({
      message: "Assignment submitted successfully",
      submissionId: result.insertedId,
    });
  } catch (err) {
    console.error("Assignment Submission Error:", err);
    res.status(500).json({
      message: "Failed to submit assignment",
      error: err.message,
    });
  }
};

exports.getMySubmission = async (req, res) => {
  try {
    const { courseId, milestoneIndex, moduleIndex } = req.query;
    const AssignmentSubmissionsCollection = getAssignmentSubmissionsCollection();

    const submission = await AssignmentSubmissionsCollection.findOne({
      courseId: new ObjectId(courseId),
      milestoneIndex: Number(milestoneIndex),
      moduleIndex: Number(moduleIndex),
      studentEmail: req.user.email,
    });

    res.status(200).json({ submission });
  } catch (err) {
    console.error("Fetch Submission Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getSubmissionsAdmin = async (req, res) => {
  try {
    const UsersCollection = getUsersCollection();
    const AssignmentSubmissionsCollection = getAssignmentSubmissionsCollection();
    const user = await UsersCollection.findOne({ email: req.user.email });

    if (!user || user.roles !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const { courseId, milestoneIndex, moduleIndex } = req.query;

    if (!courseId || milestoneIndex === undefined || moduleIndex === undefined) {
      return res.status(400).json({
        message: "courseId, milestoneIndex and moduleIndex are required",
      });
    }

    const submissions = await AssignmentSubmissionsCollection.find({
      courseId: new ObjectId(courseId),
      milestoneIndex: Number(milestoneIndex),
      moduleIndex: Number(moduleIndex),
    }).toArray();

    res.status(200).json({ submissions });
  } catch (err) {
    console.error("Fetch all submissions error:", err);
    res.status(500).json({
      message: "Failed to fetch submissions",
      error: err.message,
    });
  }
};

exports.getAllCoursesWithSubmissions = async (req, res) => {
  try {
    const UsersCollection = getUsersCollection();
    const CoursesCollection = getCoursesCollection();
    const AssignmentSubmissionsCollection = getAssignmentSubmissionsCollection();

    const user = await UsersCollection.findOne({ email: req.user.email });
    if (!user || user.roles !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }

    const submissions = await AssignmentSubmissionsCollection.aggregate([
      {
        $group: {
          _id: "$courseId",
          submissions: { $push: "$$ROOT" },
        },
      },
    ]).toArray();

    const coursesWithSubmissions = await Promise.all(
      submissions.map(async (item) => {
        const course = await CoursesCollection.findOne({ _id: item._id });
        return {
          courseId: item._id,
          courseTitle: course?.title || "Unknown",
          submissions: item.submissions,
        };
      })
    );

    res.status(200).json({ courses: coursesWithSubmissions });
  } catch (err) {
    console.error("Fetch all courses error:", err);
    res.status(500).json({
      message: "Failed to fetch courses",
      error: err.message,
    });
  }
};
