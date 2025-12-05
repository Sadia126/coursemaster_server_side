
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const corsOptions = require("./config/corsOptions");
const { connectDB } = require("./config/db");

// Routes
const webhookRoutes = require("./routes/webhookRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");

const app = express();
const port = process.env.PORT || 5000;

// CORS + cookies
app.use(cors(corsOptions));
app.use(cookieParser());

// ⚠️ Stripe webhook MUST be before express.json()
app.use("/webhook", webhookRoutes);

// Parse JSON for the rest
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Server is Running...");
});

// API routes
app.use(authRoutes);
app.use(userRoutes);
app.use(courseRoutes);
app.use(paymentRoutes);
app.use(assignmentRoutes);

// Start server after DB connected
async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();
