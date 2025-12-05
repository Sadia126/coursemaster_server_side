// controllers/courseController.js
const {
  getUsersCollection,
  getCoursesCollection,
  ObjectId,
} = require("../config/db");

exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      instructor,
      price,
      category,
      tags,
      syllabus,
      image,
      milestones,
    } = req.body;

    const CoursesCollection = getCoursesCollection();

    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: "Tags must be an array" });
    }

    if (!title)
      return res.status(400).json({ message: "Title is required" });

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0)
      return res
        .status(400)
        .json({ message: "At least one milestone is required" });

    for (const m of milestones) {
      if (!m.title)
        return res
          .status(400)
          .json({ message: "Every milestone must have a title" });

      if (!m.modules || m.modules.length === 0)
        return res
          .status(400)
          .json({ message: "Every milestone must contain modules" });

      for (const mod of m.modules) {
        if (!mod.moduleType)
          return res
            .status(400)
            .json({ message: "Each module must include moduleType" });

        if (mod.moduleType === "text" && !mod.content)
          return res
            .status(400)
            .json({ message: "Text module requires content" });

        if (mod.moduleType === "video" && !mod.videoUrl)
          return res
            .status(400)
            .json({ message: "Video module requires videoUrl" });

        if (mod.moduleType === "assignment" && !mod.assignment)
          return res.status(400).json({
            message: "Assignment module requires assignment text",
          });

        if (mod.moduleType === "mcq" && (!mod.mcqs || mod.mcqs.length === 0))
          return res.status(400).json({
            message: "MCQ module must have at least 1 question",
          });
      }
    }

    const course = {
      title,
      description: description || "",
      instructor: instructor || "",
      price: price || 0,
      category: category || "",
      image: image || "",
      syllabus: syllabus || "",
      milestones,
      tags: tags || [],
      createdBy: req.user.email,
      createdAt: new Date(),
    };

    const result = await CoursesCollection.insertOne(course);

    res.status(201).json({
      message: "Course created successfully",
      courseId: result.insertedId,
    });
  } catch (err) {
    console.error("Create Course Error:", err);
    res.status(500).json({
      message: "Failed to create course",
      error: err.message,
    });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 6, search, sort, category, tags } = req.query;
    const CoursesCollection = getCoursesCollection();
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } },
      ];
    }

    if (category) query.category = category;

    if (tags) {
      const tagsArray = tags.split(",").map((t) => t.trim());
      query.tags = { $in: tagsArray };
    }

    let cursor = CoursesCollection.find(query);

    if (sort === "price_asc") cursor = cursor.sort({ price: 1 });
    if (sort === "price_desc") cursor = cursor.sort({ price: -1 });

    const total = await CoursesCollection.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const courses = await cursor
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    res.json({ courses, totalPages });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch courses", error: err.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const CoursesCollection = getCoursesCollection();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await CoursesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (err) {
    console.error("Fetch single course error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch course", error: err.message });
  }
};

exports.completeModule = async (req, res) => {
  try {
    const UsersCollection = getUsersCollection();
    const { email } = req.params;
    const { courseId, moduleIndex } = req.body;

    if (req.user.email !== email) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const courseObjectId = new ObjectId(courseId);
    await UsersCollection.updateOne(
      { email, "purchasedCourses.courseId": courseObjectId },
      {
        $addToSet: { "purchasedCourses.$.completedModules": moduleIndex },
      }
    );

    res.status(200).json({ message: "Module marked complete" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Failed to update module", error: err.message });
  }
};

exports.getStudentsForCourse = async (req, res) => {
  const UsersCollection = getUsersCollection();
  const { id } = req.params;

  try {
    const students = await UsersCollection.find({
      "purchasedCourses.courseId": new ObjectId(id),
    })
      .project({ password: 0 })
      .toArray();

    res.json({ students });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch", error: err.message });
  }
};

exports.updateAssignmentMark = async (req, res) => {
  try {
    const UsersCollection = getUsersCollection();
    const { email } = req.params;
    const { courseId, milestoneIndex, moduleIndex, mark } = req.body;

    if (req.user.email !== email) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const update = {
      $set: {
        [`assignmentMarks.${courseId}.${milestoneIndex}.${moduleIndex}`]: mark,
      },
    };

    await UsersCollection.updateOne({ email }, update, { upsert: true });

    res.status(200).json({ message: "Mark saved successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to save mark", error: err.message });
  }
};

exports.saveMcqResult = async (req, res) => {
  try {
    const UsersCollection = getUsersCollection();
    const { courseId, moduleIndex, questionIndex, isCorrect } = req.body;

    if (!courseId || moduleIndex === undefined || questionIndex === undefined) {
      return res.status(400).json({
        message: "courseId, moduleIndex and questionIndex are required",
      });
    }

    const email = req.user.email;

    const mcqEntry = {
      courseId,
      moduleIndex,
      questionIndex,
      isCorrect: !!isCorrect,
      savedAt: new Date(),
    };

    await UsersCollection.updateOne(
      { email },
      {
        $pull: {
          mcqResults: {
            courseId: courseId,
            moduleIndex: moduleIndex,
            questionIndex: questionIndex,
          },
        },
      }
    );

    const result = await UsersCollection.updateOne(
      { email },
      {
        $push: { mcqResults: mcqEntry },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "MCQ result saved" });
  } catch (err) {
    console.error("Save MCQ Error:", err);
    res.status(500).json({
      message: "Failed to save MCQ result",
      error: err.message,
    });
  }
};
