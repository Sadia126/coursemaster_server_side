// controllers/userController.js
const { getUsersCollection } = require("../config/db");

exports.updateProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const { name, phone, avatarUrl } = req.body;
    const UsersCollection = getUsersCollection();

    if (req.user.email !== email) {
      return res.status(403).json({ message: "Forbidden: Not your profile" });
    }

    const updateDoc = { $set: {} };
    if (name) updateDoc.$set.name = name;
    if (phone) updateDoc.$set.phone = phone;
    if (avatarUrl) updateDoc.$set.avatar = avatarUrl;

    const result = await UsersCollection.updateOne({ email }, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await UsersCollection.findOne({ email });
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({
      message: "Profile update failed",
      error: error.message,
    });
  }
};

exports.checkAdmin = async (req, res) => {
  const email = req.params.email;
  const UsersCollection = getUsersCollection();

  if (req.user.email !== email) {
    return res.status(403).json({ isAdmin: false, message: "Forbidden" });
  }

  const user = await UsersCollection.findOne({ email });

  if (!user) {
    return res.status(404).json({ isAdmin: false });
  }

  res.send({ isAdmin: user.roles === "admin" });
};
