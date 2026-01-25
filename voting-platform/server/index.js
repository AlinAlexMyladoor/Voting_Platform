// server/index.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");

// Import Passport config and routes
require("./passport");
const authRoutes = require("./routes/auth");
const votingRoutes = require("./routes/voting");

const app = express();

// ==========================================
// 🚨 CRITICAL FIX FOR VERCEL DEPLOYMENT 🚨
// ==========================================
// Vercel sits behind a proxy. Without this, Express thinks the connection is HTTP 
// and refuses to set the 'secure' cookie, causing the login loop.
app.set("trust proxy", 1); 
// ==========================================


// --------------------
// Middleware
// --------------------
app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://e-ballot.vercel.app", 
    credentials: true, // Allows cookies to be sent back and forth
  })
);

// --------------------
// Helmet Security Middleware
// --------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "connect-src": [
          "'self'",
          process.env.CLIENT_URL, // Allow your frontend
          "https://*.vercel.app",
          "https://*.linkedin.com",
          "https://*.google.com",
        ],
        "img-src": [
          "'self'",
          "data:",
          "https://*.googleusercontent.com",
          "https://*.licdn.com",
        ],
        "navigate-to": ["'self'", "https://*.linkedin.com", "https://*.google.com"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// --------------------
// Session Middleware
// --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // PRO TIP: On Vercel, we almost always want these set to true/none for cross-site auth
      secure: true,        // REQUIRED: browser only sends cookie over HTTPS
      sameSite: 'none',    // REQUIRED: allows cookie between frontend/backend domains
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// --------------------
// Passport Middleware
// --------------------
app.use(passport.initialize());
app.use(passport.session());

// --------------------
// Routes
// --------------------
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.use("/auth", authRoutes);
app.use("/api", votingRoutes);

// --------------------
// Database Connection
// --------------------
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });