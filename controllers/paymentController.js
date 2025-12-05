// controllers/paymentController.js
const stripe = require("../config/stripe");
const { getCoursesCollection } = require("../config/db");
const { ObjectId } = require("mongodb");

const FRONTEND = process.env.CLIENT_URL || "http://localhost:5173";

exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: "courseId required" });

    const CoursesCollection = getCoursesCollection();
    const course = await CoursesCollection.findOne({ _id: new ObjectId(courseId) });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const priceInCents = Math.round((course.price || 0) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: course.description || undefined,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      customer_email: req.user?.email,
      success_url: `${FRONTEND}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${courseId}`,
      cancel_url: `${FRONTEND}/course/${courseId}`,
      metadata: {
        courseId: courseId,
        userEmail: req.user?.email || "",
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Create checkout session error:", err);
    res.status(500).json({ message: "Failed to create checkout session", error: err.message });
  }
};

// ✅ Add this function
exports.getSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (!sessionId) return res.status(400).json({ message: "Session ID required" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (err) {
    console.error("Get session error:", err);
    res.status(500).json({ message: "Failed to get session", error: err.message });
  }
};
