// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getUsersCollection } = require("../config/db");
const { sendWelcomeEmail } = require("../email");
const FRONTEND = process.env.CLIENT_URL || "http://localhost:5173";

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      passwordHash,
      avatarUrl,
      roles,
      status,
      createdAt,
    } = req.body;

    const UsersCollection = getUsersCollection();

    const existingUser = await UsersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    const newUser = {
      name,
      email,
      phone,
      password: hashedPassword,
      avatar: avatarUrl,
      roles: roles || "user",
      status: status || "active",
      purchasedCourses: [],
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    };

    const result = await UsersCollection.insertOne(newUser);

    await sendWelcomeEmail(email, name);

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Registration successful",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const UsersCollection = getUsersCollection();

    const user = await UsersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.status(200).json({ message: "Logout successful" });
};

exports.me = async (req, res) => {
  try {
    const token = req.cookies.token;
    const UsersCollection = getUsersCollection();

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UsersCollection.findOne({ email: decoded.email });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", error: err.message });
  }
};
