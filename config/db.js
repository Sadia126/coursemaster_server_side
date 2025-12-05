// config/db.js
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let UsersCollection;
let CoursesCollection;
let AssignmentSubmissionsCollection;

async function connectDB() {
  if (UsersCollection && CoursesCollection && AssignmentSubmissionsCollection) {
    // Already connected
    return;
  }

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");

    UsersCollection = client.db("UserDB").collection("Users");
    CoursesCollection = client.db("CourseDB").collection("Courses");
    AssignmentSubmissionsCollection = client
      .db("AssignmentDB")
      .collection("AssignmentSubmissions");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    throw error;
  }
}

function getUsersCollection() {
  return UsersCollection;
}

function getCoursesCollection() {
  return CoursesCollection;
}

function getAssignmentSubmissionsCollection() {
  return AssignmentSubmissionsCollection;
}

module.exports = {
  connectDB,
  getUsersCollection,
  getCoursesCollection,
  getAssignmentSubmissionsCollection,
  ObjectId,
};
