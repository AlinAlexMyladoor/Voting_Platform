// server/index.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const helmet = require("helmet");

const app = express();

// ==========================================
// 🚨 MONGODB CONNECTION - MUST BE FIRST 🚨
// ==========================================
// Connect to MongoDB before anything else
// Vercel serverless needs this at the top
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('♻️ Using existing MongoDB connection');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Increased from 5s to 10s
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Connection pool size
      minPoolSize: 2,  // Minimum connections
      retryWrites: true,
      retryReads: true,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isConnected = false; // Ensure flag is reset on failure
    throw error;
  }
};

// Initialize connection
connectDB().catch(err => console.error('Initial MongoDB connection error:', err));

// Import Passport config and routes AFTER mongoose is initialized
require("./passport");
const authRoutes = require("./routes/auth");
const votingRoutes = require("./routes/voting");

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
        // Note: "navigate-to" is not a standard CSP directive and causes warnings
        // Navigation is controlled by form-action and frame-ancestors instead
        "form-action": ["'self'", "https://*.linkedin.com", "https://*.google.com"],
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
      resave: true, // Force session save on every request
      saveUninitialized: false, // Don't create session until something stored
      rolling: true, // Reset cookie maxAge on every request
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
        autoRemove: 'native', // Use MongoDB's TTL feature
        touchAfter: 0, // Update session immediately
        crypto: {
          secret: process.env.SESSION_SECRET || "secret_key"
        }
      }),
      cookie: {
        secure: true, // Always true for production (Vercel uses HTTPS)
        sameSite: 'none', // Required for cross-domain cookies
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        // Note: Incognito mode may block third-party cookies
        // This affects cross-domain (e-ballot.vercel.app → e-ballotserver.vercel.app)
        partitioned: true, // Chrome's new CHIPS - allows cross-site cookies in incognito
      }
    })
  );
  console.log('✅ Session middleware configured with MongoStore');
} catch (error) {
  console.error('❌ Session middleware error:', error);
  // Fallback to in-memory sessions if MongoStore fails
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret_key",
      resave: true,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
      }
    })
  );
  console.log('⚠️ Fallback to in-memory sessions');
}

// --------------------
// Passport Middleware
// --------------------
app.use(passport.initialize());
app.use(passport.session());

// --------------------
// Debug Middleware (reduced logging for production)
// --------------------
app.use(async (req, res, next) => {
  // Ensure MongoDB is connected for all routes (except health check)
  if (req.path !== '/') {
    try {
      // Check if connection is alive
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ MongoDB disconnected, reconnecting...');
        isConnected = false;
      }
      await connectDB();
    } catch (error) {
      console.error('❌ MongoDB not available:', error.message);
      return res.status(503).json({ 
        message: 'Database temporarily unavailable',
        error: 'Please try again in a moment'
      });
    }
  }
  
  // Only log authentication-related requests
  if (req.path.includes('/auth') || req.path.includes('/api/vote')) {
    console.log(`📍 ${req.method} ${req.path}`, {
      hasUser: !!req.user,
      userId: req.user?.id || 'guest',
      dbState: mongoose.connection.readyState // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
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
  console.error('❌ Server Error:', {
    message: err.message,
    stack: err.stack?.split('\n')[0], // First line of stack trace
    path: req.path,
    method: req.method
  });
  
  // Check if it's a MongoDB connection error
  if (err.name === 'MongooseError' || err.message?.includes('mongo')) {
    return res.status(503).json({ 
      message: 'Database Connection Error',
      error: 'Unable to connect to database. Please try again.'
    });
  }
  
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    path: req.path
  });
});

// --------------------
// Server Port
// --------------------
const PORT = process.env.PORT || 5000;

// For local development, start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;