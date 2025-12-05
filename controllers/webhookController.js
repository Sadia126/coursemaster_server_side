// controllers/webhookController.js
const stripe = require("../config/stripe");
const { getUsersCollection, ObjectId } = require("../config/db");

exports.handleStripeWebhook = async (req, res) => {
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const courseId = session.metadata.courseId;
    const userEmail = session.metadata.userEmail;

    try {
      const UsersCollection = getUsersCollection();
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
};
