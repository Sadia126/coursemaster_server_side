// config/corsOptions.js
const FRONTEND = process.env.CLIENT_URL || "http://localhost:5173";

const corsOptions = {
  origin: [FRONTEND, "http://localhost:5173"],
  credentials: true,
};

module.exports = corsOptions;
