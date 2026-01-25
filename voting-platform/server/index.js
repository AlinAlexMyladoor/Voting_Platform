// server/index.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet"); // ✅ ADD THIS

// Import Passport config and routes
require("./passport"); // passport strategies
const authRoutes = require("./routes/auth");
const votingRoutes = require("./routes/voting");

const app = express();

// --------------------
// Middleware
// --------------------
app.use(express.json()); // Parse JSON bodies

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// --------------------
// Helmet Security Middleware ✅
// --------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],

        // React scripts
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],

        // Backend + OAuth providers
        "connect-src": [
          "'self'",
          "http://localhost:5000",
          "https://*.vercel.app",
          "https://*.linkedin.com",
          "https://*.google.com",
        ],

        // Google / LinkedIn profile images
        "img-src": [
          "'self'",
          "data:",
          "https://*.googleusercontent.com",
          "https://*.licdn.com",
        ],
        // Allow top-level navigation to OAuth providers' profile pages
        "navigate-to": ["'self'", "https://*.linkedin.com", "https://*.google.com"],
      },
    },

    // Required for OAuth popups (Google / LinkedIn)
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// --------------------
// Session Middleware (MUST be before passport)
// --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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

// debug: list mounted routes (dev only)
app.get('/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(mw => {
    if (mw.route) {
      const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
      routes.push({ path: mw.route.path, methods });
    } else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
      mw.handle.stack.forEach(r => {
        if (r.route) routes.push({ path: r.route.path, methods: Object.keys(r.route.methods).join(',').toUpperCase() });
      });
    }
  });
  res.json(routes);
});

app.use("/auth", authRoutes);
app.use("/api", votingRoutes);

// --------------------
// Database Connection
// --------------------
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/votingApp")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
