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
let connectionPromise = null;

const connectDB = async () => {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('♻️ Using existing MongoDB connection');
    return;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    console.log('⏳ Waiting for existing connection attempt...');
    return connectionPromise;
  }

  // Start new connection attempt
  connectionPromise = (async () => {
    try {
      console.log('🔌 Initiating MongoDB connection...');
      const db = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000, // 15 seconds for first connection
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      });
      isConnected = db.connections[0].readyState === 1;
      console.log('✅ MongoDB connected successfully');
      return db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      isConnected = false;
      connectionPromise = null; // Allow retry
      throw error;
    }
  })();

  return connectionPromise;
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
      resave: false, // Don't save session if unmodified (prevents race conditions)
      saveUninitialized: false, // Don't create session until something stored
      rolling: true, // Reset cookie maxAge on every request
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
        autoRemove: 'native', // Use MongoDB's TTL feature
        touchAfter: 24 * 3600, // Only update session once per 24h unless changed
        crypto: {
          secret: process.env.SESSION_SECRET || "secret_key"
        }
      }),
      cookie: {
        secure: true, // Always true for production (Vercel uses HTTPS)
        sameSite: 'lax', // Same-site cookies work now with Vercel rewrites
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        // With Vercel rewrites, all requests appear same-origin
        // No need for partitioned cookies or sameSite: 'none'
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
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: true,
        sameSite: 'lax',
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

// Middleware to ensure MongoDB is connected before processing auth/api requests
const ensureMongoConnected = async (req, res, next) => {
  // If already connected, proceed
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  
  console.log('⏳ MongoDB not ready, attempting connection...');
  
  try {
    // Wait for connection with timeout
    await connectDB();
    
    // Double check connection is established
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB connected, proceeding with request');
      return next();
    }
    
    throw new Error('MongoDB connection not established');
  } catch (error) {
    console.error('❌ MongoDB connection failed in middleware:', error.message);
    return res.status(503).json({ 
      error: 'Database connection error. Please try again in a moment.',
      message: 'Service temporarily unavailable'
    });
  }
};

// Apply MongoDB check middleware to auth and api routes
app.use("/auth", ensureMongoConnected, authRoutes);
app.use("/api", ensureMongoConnected, votingRoutes);

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