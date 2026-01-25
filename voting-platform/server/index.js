// server/index.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
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
// For Vercel serverless, MongoStore will handle its own connection
try {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret_key",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
        autoRemove: 'native', // Use MongoDB's TTL feature
        touchAfter: 24 * 3600, // Lazy session update
      }),
      cookie: {
        secure: true, // Always true for production (Vercel uses HTTPS)
        sameSite: 'none', // Required for cross-domain cookies
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
      }
    })
  );
} catch (error) {
  console.error('❌ Session middleware error:', error);
  // Fallback to in-memory sessions if MongoStore fails
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
      }
    })
  );
}

// --------------------
// Passport Middleware
// --------------------
app.use(passport.initialize());
app.use(passport.session());

// --------------------
// Debug Middleware (helps diagnose session issues)
// --------------------
app.use((req, res, next) => {
  // Only log API and auth requests to reduce noise
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    console.log('📍 Request:', {
      method: req.method,
      path: req.path,
      sessionID: req.sessionID,
      hasSession: !!req.session,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      hasUser: !!req.user,
      userId: req.user?.id,
      hasCookie: !!req.headers.cookie
    });
  }
  next();
});

// --------------------
// Routes
// --------------------
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1
  });
});

app.use("/auth", authRoutes);
app.use("/api", votingRoutes);

// --------------------
// Error Handling Middleware
// --------------------
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// --------------------
// Database Connection
// --------------------
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// For local development, start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;