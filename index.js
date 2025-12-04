const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
}); // use latest
const FRONTEND = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
// app.use(
//   cors({
//     origin: ["https://rentraa.netlify.app"],
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(cookieParser());

// Port
const port = process.env.PORT || 5000;

// MongoDB Setup
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Forbidden: Invalid token" });
  }
};

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");

    const UsersCollection = client.db("UserDB").collection("Users");
    const CoursesCollection = client.db("CourseDB").collection("Courses");

    app.post(
      "/webhook",
      express.raw({ type: "application/json" }), // required for Stripe webhook signature
      async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;

        try {
          event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err) {
          console.error("Webhook signature verification failed.", err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle successful payment
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          const courseId = session.metadata.courseId;
          const userEmail = session.metadata.userEmail;

          try {
            await UsersCollection.updateOne(
              { email: userEmail },
              {
                $addToSet: {
                  purchasedCourses: {
                    courseId: new ObjectId(courseId),
                    completedModules: [],
                  },
                },
              }
            );

            console.log(`Added course ${courseId} to user ${userEmail}`);
          } catch (err) {
            console.error("Failed to add purchased course:", err);
          }
        }

        res.status(200).json({ received: true });
      }
    );
    app.use(express.json());
    app.post("/api/register", async (req, res) => {
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

        // Check if user already exists
        const existingUser = await UsersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).json({ message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(passwordHash, 10);

        // Create new user
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

        // Insert into database
        const result = await UsersCollection.insertOne(newUser);

        // Generate JWT
        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        // Set cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: true, // required for cross-site cookies
          sameSite: "none", // required for cross-site cookies
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
    });

    //user login
    app.post("/api/login", async (req, res) => {
      try {
        const { email, password } = req.body;

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
          secure: true, //  required for cross-site cookies
          sameSite: "none", //  required for cross-site cookies
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({ message: "Login successful", user });
      } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
      }
    });

    //Logout user
    app.post("/api/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });

      res.status(200).json({ message: "Logout successful" });
    });

    //Check if user is logged in
    app.get("/api/me", async (req, res) => {
      try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UsersCollection.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ user });
      } catch (err) {
        res.status(401).json({ message: "Unauthorized", error: err.message });
      }
    });

    //  Update user profile
    app.patch("/api/users/:email", verifyToken, async (req, res) => {
      try {
        const { email } = req.params;
        const { name, phone, avatarUrl } = req.body;

        // Authorization check
        if (req.user.email !== email) {
          return res
            .status(403)
            .json({ message: "Forbidden: Not your profile" });
        }

        // Prepare update object dynamically
        const updateDoc = {
          $set: {},
        };

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
    });

    //Check admin or not
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // check if token email matches route email
      if (req.user.email !== email) {
        return res.status(403).json({ isAdmin: false, message: "Forbidden" });
      }

      const user = await UsersCollection.findOne({ email });

      // if no user found
      if (!user) {
        return res.status(404).json({ isAdmin: false });
      }

      res.send({ isAdmin: user.roles === "admin" });
    });

    // ================================== Course Endpoints ============================
    // Create a new course
    app.post("/api/courses", verifyToken, async (req, res) => {
      try {
        const {
          title,
          description,
          instructor,
          syllabus,
          price,
          category,
          tags,
          modules,
          batches,
          image,
        } = req.body;

        if (
          !title ||
          !modules ||
          !Array.isArray(modules) ||
          modules.length === 0
        ) {
          return res
            .status(400)
            .json({ message: "Title and at least one module are required" });
        }

        const course = {
          title,
          description: description || "",
          instructor: instructor || "",
          syllabus: syllabus || "",
          price: price || 0,
          category: category || "",
          tags: Array.isArray(tags) ? tags : [],
          modules,
          batches: batches || [],
          image: image || "",
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
        res
          .status(500)
          .json({ message: "Failed to create course", error: err.message });
      }
    });

    // Fetch all courses (optional)
    app.get("/api/courses", async (req, res) => {
      try {
        const { page = 1, limit = 6, search, sort, category, tags } = req.query;
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

        // Sorting
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
    });

    // Get single course by ID
    app.get("/api/courses/:id", async (req, res) => {
      try {
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
    });
    // Mark a module as complete
    app.patch(
      "/api/users/:email/completeModule",
      verifyToken,
      async (req, res) => {
        try {
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
      }
    );

    // ================================= Payment Integration =================
    // POST /api/create-checkout-session
    app.post("/api/create-checkout-session", verifyToken, async (req, res) => {
      try {
        const { courseId } = req.body;
        if (!courseId)
          return res.status(400).json({ message: "courseId required" });

        // fetch course from DB (adjust collection name if different)
        const course = await CoursesCollection.findOne({
          _id: new ObjectId(courseId),
        });
        if (!course)
          return res.status(404).json({ message: "Course not found" });

        // Convert to cents (Stripe expects integer in smallest currency unit)
        const priceInCents = Math.round((course.price || 0) * 100);

        // create a Checkout Session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "usd", // change if needed
                product_data: {
                  name: course.title,
                  description: course.description || undefined,
                },
                unit_amount: priceInCents,
              },
              quantity: 1,
            },
          ],
          customer_email: req.user?.email, // optional: pre-fill email
          success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${courseId}`,
          cancel_url: `${FRONTEND}/course/${courseId}`,
          metadata: {
            courseId: courseId,
            userEmail: req.user?.email || "",
          },
        });

        // return session URL (simplest) or session.id
        res.json({ url: session.url });
      } catch (err) {
        console.error("Create checkout session error:", err);
        res.status(500).json({
          message: "Failed to create checkout session",
          error: err.message,
        });
      }
    });
    app.get("/api/session/:id", async (req, res) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(req.params.id);
        res.json(session);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
  } catch (error) {
    console.error("MongoDB connection failed", error);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("Server is Running...");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
