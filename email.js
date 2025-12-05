const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // your email
    pass: process.env.SMTP_PASS, // app password or email password
  },
});

const sendWelcomeEmail = async (to, name) => {
  try {
    const mailOptions = {
      from: `"Course Master" <${process.env.SMTP_USER}>`,
      to,
      subject: "Welcome to Course Master!",
      html: `
        <h1>Hello ${name},</h1>
        <p>Thank you for registering at Course Master.</p>
        <p>We are excited to have you on board!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
  } catch (err) {
    console.error("Error sending welcome email:", err);
  }
};

module.exports = { sendWelcomeEmail };
