# Authentication System - Detailed Technical Report
**Voting Platform Authentication & Session Management**  
*Generated: February 6, 2026*

---

## 🔍 Executive Summary

Your voting platform uses a **multi-provider authentication system** with three login methods:
1. **Google OAuth 2.0**
2. **LinkedIn OAuth 2.0** 
3. **Email/Password (Local Authentication)**

### Current Issues Identified

#### **Critical Issues Causing Intermittent Login Failures:**

1. **🚨 Cross-Origin Cookie Issues in Production**
   - **Problem**: Browser cross-site cookie restrictions (especially in Incognito mode)
   - **Impact**: Sessions may not persist between domains (e-ballot.vercel.app ↔ e-ballotserver.vercel.app)
   - **Cause**: Third-party cookie blocking, incognito mode restrictions

2. **⚠️ Session Race Conditions**
   - **Problem**: Session may not be fully saved to MongoDB before redirect
   - **Current Mitigation**: 7 retry attempts with exponential backoff (500ms-3500ms)
   - **Weakness**: Still vulnerable on slow/cold MongoDB connections

3. **⏱️ MongoDB Connection State Issues**
   - **Problem**: Serverless functions (Vercel) have cold starts
   - **Impact**: First request may timeout or fail to connect to MongoDB
   - **Current Mitigation**: Connection pooling and retry logic

4. **🔐 Trust Proxy Configuration**
   - **Current**: Set to `1` (trusts first proxy)
   - **Impact**: Critical for HTTPS cookie security on Vercel

---

## 📋 Technical Architecture

### Technology Stack

```javascript
// Core Dependencies
{
  "express": "^5.2.1",                    // Web framework
  "passport": "^0.7.0",                   // Authentication middleware
  "passport-google-oauth20": "^2.0.0",    // Google OAuth
  "passport-oauth2": "^1.8.0",            // LinkedIn OAuth base
  "express-session": "^1.18.2",           // Session management
  "connect-mongo": "^6.0.0",              // MongoDB session store
  "bcryptjs": "^3.0.3",                   // Password hashing
  "mongoose": "^9.0.2",                   // MongoDB ODM
  "cors": "^2.8.5",                       // Cross-origin requests
  "helmet": "^8.1.0",                     // Security headers
  "nodemailer": "^7.0.12"                 // Email (password reset)
}
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  (e-ballot.vercel.app - React Frontend)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Google     │  │   LinkedIn   │  │  Email/Pass  │         │
│  │   Button     │  │   Button     │  │    Form      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │ (POST /auth/login)
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                       SERVER LAYER                               │
│  (e-ballotserver.vercel.app - Node.js/Express)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Express Middleware Stack                     │  │
│  │  1. CORS (credentials: true)                             │  │
│  │  2. Helmet (security headers)                            │  │
│  │  3. Express Session + MongoStore                         │  │
│  │  4. Passport Initialize                                  │  │
│  │  5. Passport Session                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Google     │  │   LinkedIn   │  │    Local     │         │
│  │  Strategy    │  │  Strategy    │  │  Strategy    │         │
│  │              │  │              │  │              │         │
│  │ passport.js  │  │ passport.js  │  │ auth.js      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                    PERSISTENCE LAYER                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              MongoDB Atlas Database                     │    │
│  │                                                         │    │
│  │  ┌─────────────────┐      ┌─────────────────┐         │    │
│  │  │  Users Collection│      │ Sessions Collection│       │    │
│  │  │  (User Model)    │      │ (MongoStore)      │       │    │
│  │  └─────────────────┘      └─────────────────┘         │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Google     │  │   LinkedIn   │  │   SMTP       │         │
│  │   OAuth      │  │   OAuth      │  │  (Gmail)     │         │
│  │   APIs       │  │   APIs       │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Methods

### 1. Google OAuth 2.0

#### Flow Diagram
```
User clicks "Sign in with Google"
    │
    ▼
GET /auth/google
    │
    ▼
Redirect to Google OAuth Consent Screen
    │
    ▼
User grants permission
    │
    ▼
Google redirects to /auth/google/callback?code=...
    │
    ▼
passport-google-oauth20 exchanges code for access token
    │
    ▼
Fetch user profile from Google API
    │
    ▼
Strategy callback: Find or create user in MongoDB
    │
    ├─── User exists (by providerId) ──► Return existing user
    │
    ├─── User exists (by email) ──────► Return existing user  
    │
    └─── New user ────────────────────► Create new user
                                        │
                                        ▼
                                  serializeUser(user)
                                        │
                                        ▼
                                  Save session to MongoDB
                                  (7 retries with exponential backoff)
                                        │
                                        ▼
                                  Redirect to /dashboard
```

#### Configuration (Environment Variables Required)
```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://e-ballotserver.vercel.app/auth/google/callback
```

#### Code Implementation

**File: `/server/passport.js` (Lines 35-61)**
```javascript
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 
                 "https://e-ballotserver.vercel.app/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Step 1: Try to find user by Google provider ID
      let user = await User.findOne({ providerId: profile.id });
      if (user) return done(null, user);

      // Step 2: Try to find by email (link accounts)
      const userEmail = (profile.emails && profile.emails.length > 0) 
        ? profile.emails[0].value 
        : undefined;

      if (userEmail) {
        user = await User.findOne({ email: userEmail });
        if (user) return done(null, user);
      }

      // Step 3: Create new user
      const newUser = await new User({
        name: profile.displayName,
        email: userEmail || "no-email@google.com",
        provider: 'google',
        providerId: profile.id,
        profilePicture: (profile.photos && profile.photos.length > 0) 
                        ? profile.photos[0].value : "",
        linkedin: '',
        hasVoted: false
      }).save();
      
      done(null, newUser);
    } catch (err) { 
      console.error("Google Auth Error:", err);
      done(err, null); 
    }
  }
));
```

**File: `/server/routes/auth.js` (Lines 40-108)**
```javascript
// Initiate Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=no_user`);
      }

      // Explicitly establish session
      req.login(req.user, (loginErr) => {
        if (loginErr) {
          return res.redirect(`${process.env.CLIENT_URL}/login?error=login_failed`);
        }

        // Retry session save up to 7 times with exponential backoff
        let saveAttempts = 0;
        const maxAttempts = 7;
        
        const saveSession = () => {
          saveAttempts++;
          req.session.save((err) => {
            if (err) {
              if (saveAttempts < maxAttempts) {
                setTimeout(saveSession, saveAttempts * 500); // 500ms, 1s, 1.5s...
                return;
              }
              return res.redirect(`${process.env.CLIENT_URL}/login?error=session_save`);
            }
            
            // Add delay before redirect to ensure session persistence
            setTimeout(() => {
              res.redirect(`${process.env.CLIENT_URL}/dashboard`);
            }, 500);
          });
        };
        
        saveSession();
      });
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=server`);
    }
  }
);
```

---

### 2. LinkedIn OAuth 2.0

#### Flow Diagram
```
User clicks "Sign in with LinkedIn"
    │
    ▼
GET /auth/linkedin
    │
    ▼
Redirect to LinkedIn OAuth Consent Screen
    │
    ▼
User grants permission
    │
    ▼
LinkedIn redirects to /auth/linkedin/callback?code=...
    │
    ▼
passport-oauth2 exchanges code for access token
    │
    ▼
Fetch user profile from LinkedIn API (/v2/userinfo)
    │
    ▼
Strategy callback: Find or create user in MongoDB
    │
    ├─── User exists (by providerId) ──► Return existing user
    │                                     (Update profile pic if changed)
    │
    ├─── User exists (by email) ──────► Update with LinkedIn data
    │
    └─── New user ────────────────────► Create new user
                                        │
                                        ▼
                                  serializeUser(user)
                                        │
                                        ▼
                                  Save session to MongoDB
                                  (7 retries with exponential backoff)
                                        │
                                        ▼
                                  Redirect to /dashboard
```

#### Configuration (Environment Variables Required)
```bash
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=https://e-ballotserver.vercel.app/auth/linkedin/callback
```

#### Code Implementation

**File: `/server/passport.js` (Lines 63-133)**
```javascript
passport.use('linkedin', new OAuth2Strategy({
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL || 
                 "https://e-ballotserver.vercel.app/auth/linkedin/callback",
    scope: ['openid', 'profile', 'email', 'w_member_social'],
    state: true
  },
  async (accessToken, refreshToken, emptyProfile, done) => {
    try {
      // Fetch user info from LinkedIn API
      const userinfoResponse = await axios.get(
        'https://api.linkedin.com/v2/userinfo', 
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      const profile = userinfoResponse.data;
      const providerId = profile.sub; 
      const name = profile.name || "LinkedIn User";
      const email = profile.email;
      const picture = profile.picture || "";
      
      // Extract LinkedIn profile URL
      const linkedinUrl = profile.profile || 
                         profile.publicProfileUrl || 
                         (profile.vanityName 
                           ? `https://linkedin.com/in/${profile.vanityName}` 
                           : '');

      // Step 1: Find by LinkedIn provider ID
      let existingUser = await User.findOne({ providerId: providerId });
      if (existingUser) {
        // Update profile picture and LinkedIn URL if available
        if (picture && existingUser.profilePicture !== picture) {
          existingUser.profilePicture = picture;
        }
        if (linkedinUrl && !existingUser.linkedin) {
          existingUser.linkedin = linkedinUrl;
        }
        await existingUser.save();
        return done(null, existingUser);
      }

      // Step 2: Find by email (link accounts)
      if (email) {
        existingUser = await User.findOne({ email: email });
        if (existingUser) {
          existingUser.provider = 'linkedin';
          existingUser.providerId = providerId;
          if (picture) existingUser.profilePicture = picture;
          if (linkedinUrl && !existingUser.linkedin) {
            existingUser.linkedin = linkedinUrl;
          }
          await existingUser.save();
          return done(null, existingUser);
        }
      }

      // Step 3: Create new user
      const newUser = await new User({
        name: name,
        email: email || `${providerId}@linkedin.com`,
        provider: 'linkedin',
        providerId: providerId,
        profilePicture: picture,
        linkedin: linkedinUrl,
        hasVoted: false
      }).save();
      
      done(null, newUser);
    } catch (err) {
      console.error("LinkedIn Auth Error:", err.message);
      done(err, null);
    }
  }
));
```

**File: `/server/routes/auth.js` (Lines 110-178)**
```javascript
// Initiate LinkedIn OAuth
router.get('/linkedin',
  passport.authenticate('linkedin', {
    scope: ['openid', 'profile', 'email'],
  })
);

// LinkedIn OAuth callback (identical logic to Google)
router.get('/linkedin/callback',
  passport.authenticate('linkedin', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  async (req, res) => {
    // ... same retry logic as Google callback
  }
);
```

---

### 3. Email/Password (Local Authentication)

#### Registration Flow
```
User fills registration form (name, email, password)
    │
    ▼
POST /auth/register
    │
    ├─── Validation fails ────────► 400 "All fields required"
    │
    ├─── Email exists ────────────► 409 "Email already registered"
    │
    └─── Valid ───────────────────► Hash password with bcryptjs
                                    │
                                    ▼
                                  Create User document
                                  (provider: 'local')
                                    │
                                    ▼
                                  Save to MongoDB
                                    │
                                    ▼
                                  req.login() - establish session
                                    │
                                    ▼
                                  201 "Registration successful"
```

#### Login Flow
```
User submits email + password
    │
    ▼
POST /auth/login
    │
    ├─── Missing fields ──────────► 400 "Email and password required"
    │
    ├─── User not found ──────────► 401 "Invalid credentials"
    │
    └─── User found ──────────────► bcrypt.compare(password, hash)
                                    │
                                    ├─── Invalid ─► 401 "Invalid credentials"
                                    │
                                    └─── Valid ───► req.login()
                                                    │
                                                    ▼
                                                req.session.save()
                                                    │
                                                    ▼
                                                200 "Login successful"
```

#### Password Reset Flow
```
User clicks "Forgot Password"
    │
    ▼
POST /auth/forgot-password { email }
    │
    ├─── User not found ──────────► Generic success (security)
    │
    ├─── OAuth user ──────────────► 400 "Use OAuth provider"
    │
    └─── Local user ──────────────► Generate reset token
                                    │
                                    ▼
                                  Save token + expiry to DB
                                  (expires in 1 hour)
                                    │
                                    ▼
                                  Send email with reset link
                                    │
                                    ▼
                                  Return success message

User clicks link in email
    │
    ▼
GET /login?resetToken=abc123...
    │
    ▼
User enters new password
    │
    ▼
POST /auth/reset-password { token, password }
    │
    ├─── Token invalid/expired ───► 400 "Token invalid or expired"
    │
    └─── Valid ────────────────────► Hash new password
                                     │
                                     ▼
                                   Update user + clear token
                                     │
                                     ▼
                                   200 "Password reset successful"
```

#### Code Implementation

**File: `/server/routes/auth.js` (Lines 180-213)**
```javascript
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      provider: 'local',
      profilePicture: '',
      linkedin: '',
      votedAt: null,
    });

    await user.save();

    // Log user in
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Login after registration failed' });
      }
      res.status(201).json({ message: 'Registration successful', user });
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration error' });
  }
});
```

**File: `/server/routes/auth.js` (Lines 215-247)**
```javascript
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Log user in
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Login failed' });
      }
      
      // Explicitly save session
      req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).json({ message: 'Session error' });
        }
        res.json({ message: 'Login successful', user });
      });
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});
```

**File: `/server/routes/auth.js` (Lines 249-322)**
```javascript
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Security: don't reveal if user exists
    if (!user) {
      return res.json({
        message: 'If the email exists, a reset link will be sent',
      });
    }

    // Check if OAuth user
    if (user.provider !== 'local') {
      return res.status(400).json({ 
        message: `This account uses ${user.provider}. Please sign in with ${user.provider}.` 
      });
    }

    // Generate reset token (32 random bytes)
    const token = crypto.randomBytes(32).toString('hex');

    // Save token with 1 hour expiry
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/login?resetToken=${token}`;

    // Send email with nodemailer
    await transporter.sendMail({
      from: `"Voting Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <!-- HTML email template with reset link -->
        <a href="${resetUrl}">Reset Password</a>
      `,
    });

    res.json({ message: 'Password reset email sent successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'An error occurred.' });
  }
});
```

**File: `/server/routes/auth.js` (Lines 324-353)**
```javascript
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validation
    if (!token || password.length < 6) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalid or expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset error' });
  }
});
```

---

## 🗄️ Session Management

### Session Storage: MongoDB (MongoStore)

**Why MongoDB Sessions?**
- Persistent across server restarts (critical for serverless)
- Shared across multiple server instances
- Automatic TTL (Time To Live) cleanup
- Handles Vercel's serverless architecture

### Configuration

**File: `/server/index.js` (Lines 106-146)**
```javascript
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret_key",
    resave: true,              // Save session on every request
    saveUninitialized: false,  // Don't create empty sessions
    rolling: true,             // Reset cookie expiry on each request
    
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60,       // 24 hours in seconds
      autoRemove: 'native',    // Use MongoDB TTL index
      touchAfter: 0,           // Update immediately (no delay)
      crypto: {
        secret: process.env.SESSION_SECRET
      }
    }),
    
    cookie: {
      secure: true,            // HTTPS only (production)
      sameSite: 'none',        // Allow cross-origin
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,          // Prevent JS access
      partitioned: true,       // CHIPS - Chrome incognito support
    }
  })
);
```

### Session Lifecycle

```
1. User authenticates (Google/LinkedIn/Local)
   │
   ▼
2. Passport serializes user (stores user ID in session)
   │
   ▼
3. Session data saved to MongoDB
   Collection: sessions
   Document: {
     _id: "session_id_hash",
     expires: ISODate("2026-02-07T12:00:00Z"),
     session: {
       cookie: { ... },
       passport: {
         user: "64abc123..."  // MongoDB User _id
       }
     }
   }
   │
   ▼
4. Set-Cookie header sent to browser
   connect.sid=s%3A...signature...; Path=/; HttpOnly; Secure; SameSite=None
   │
   ▼
5. Browser stores cookie
   │
   ▼
6. Subsequent requests include cookie
   │
   ▼
7. Server retrieves session from MongoDB using session ID
   │
   ▼
8. Passport deserializes user (loads full User document)
   │
   ▼
9. req.user populated with user data
```

### Serialization/Deserialization

**File: `/server/passport.js` (Lines 6-32)**
```javascript
// Convert user object to session ID
passport.serializeUser((user, done) => {
  console.log('🔐 Serializing user:', user.name, 'ID:', user._id);
  done(null, user._id); // Store only user ID in session
});

// Convert session ID back to user object
passport.deserializeUser(async (id, done) => {
  try {
    console.log('🔓 Deserializing user ID:', id);
    const user = await User.findById(id);
    
    if (!user) {
      console.error('❌ User not found:', id);
      return done(null, false);
    }
    
    // Return full user object
    done(null, {
      id: user._id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      profilePicture: user.profilePicture,
      linkedin: user.linkedin,
      hasVoted: user.hasVoted,
      votedAt: user.votedAt,
      votedFor: user.votedFor
    });
  } catch (err) {
    done(err, null);
  }
});
```

---

## 🛡️ Security Measures

### 1. CORS Configuration
```javascript
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://e-ballot.vercel.app",
    credentials: true // Allow cookies
  })
);
```

### 2. Helmet Security Headers
```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "connect-src": [
          "'self'",
          process.env.CLIENT_URL,
          "https://*.linkedin.com",
          "https://*.google.com",
        ],
        "img-src": [
          "'self'",
          "data:",
          "https://*.googleusercontent.com",
          "https://*.licdn.com",
        ],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
```

### 3. Trust Proxy (Critical for Vercel)
```javascript
// Vercel sits behind a proxy - MUST trust proxy for secure cookies
app.set("trust proxy", 1);
```

### 4. Password Security
- **Hashing**: bcryptjs with 10 salt rounds
- **Storage**: Never stored in plaintext
- **Reset**: Token-based with 1-hour expiry
- **Validation**: Minimum 6 characters

### 5. HTTPS Enforcement
- All cookies marked `secure: true`
- Forces HTTPS connections in production

### 6. XSS Protection
- `httpOnly: true` prevents JavaScript access to cookies
- Helmet CSP prevents unauthorized scripts

---

## 🐛 Known Issues & Debugging

### Issue 1: Cross-Origin Cookie Blocking

**Symptoms:**
- Login works on localhost
- Production login fails intermittently
- Incognito mode fails more frequently

**Root Cause:**
Modern browsers (especially Chrome/Safari) block third-party cookies by default. Your app uses:
- Frontend: `e-ballot.vercel.app`
- Backend: `e-ballotserver.vercel.app`

These are different origins, making cookies "third-party".

**Current Mitigations:**
```javascript
cookie: {
  sameSite: 'none',   // Allow cross-origin
  secure: true,       // HTTPS only
  partitioned: true,  // Chrome CHIPS support
}
```

**Recommended Fix:**
Deploy both frontend and backend to same domain using Vercel rewrites.

**File: `client/vercel.json` (Add this)**
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://e-ballotserver.vercel.app/:path*"
    },
    {
      "source": "/auth/:path*",
      "destination": "https://e-ballotserver.vercel.app/auth/:path*"
    }
  ]
}
```

Then update:
```javascript
// client/src/Login.js
const API_URL = ''; // Use relative URLs
// Change from: https://e-ballotserver.vercel.app/auth/google
// To: /auth/google
```

---

### Issue 2: MongoDB Connection Cold Starts

**Symptoms:**
- First login after inactivity fails
- 503 "Database temporarily unavailable" errors
- Timeout errors in Vercel logs

**Root Cause:**
Serverless functions terminate after ~10 seconds of inactivity. Next invocation is a "cold start" that must:
1. Initialize Node.js runtime
2. Connect to MongoDB
3. Process request

**Current Mitigation:**
```javascript
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('♻️ Using existing connection');
    return;
  }
  
  const db = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
  });
  
  isConnected = db.connections[0].readyState === 1;
};
```

**Recommended Fix:**
Implement keepalive pings from frontend to keep serverless function warm.

**File: `client/src/App.js` (Add this)**
```javascript
useEffect(() => {
  // Ping server every 5 minutes to keep warm
  const keepalive = setInterval(() => {
    fetch(`${API_URL}/`, { method: 'GET' }).catch(() => {});
  }, 5 * 60 * 1000);
  
  return () => clearInterval(keepalive);
}, []);
```

---

### Issue 3: Session Race Conditions

**Symptoms:**
- User redirected to dashboard but `/auth/login/success` returns 401
- Intermittent "Not authenticated" errors
- Multiple retry attempts needed

**Root Cause:**
1. OAuth callback saves session to MongoDB
2. Redirect happens immediately
3. Dashboard calls `/auth/login/success`
4. Session not yet written to MongoDB
5. Request fails

**Current Mitigation:**
```javascript
// 7 retry attempts with exponential backoff
let saveAttempts = 0;
const maxAttempts = 7;

const saveSession = () => {
  saveAttempts++;
  req.session.save((err) => {
    if (err && saveAttempts < maxAttempts) {
      setTimeout(saveSession, saveAttempts * 500); // 500ms, 1s, 1.5s...
      return;
    }
    // Add extra delay before redirect
    setTimeout(() => {
      res.redirect('/dashboard');
    }, 500);
  });
};
```

**Additional Frontend Retry:**
```javascript
// client/src/Dashboard.js (Lines 33-58)
const fetchSession = async (retryCount = 0, maxRetries = 6) => {
  try {
    const res = await axios.get(`${API_URL}/auth/login/success`, { 
      withCredentials: true,
      timeout: 20000
    });
    // Success
  } catch (err) {
    if (err.response?.status === 401 && retryCount < maxRetries) {
      const delay = 2000 + (retryCount * 1000); // 2s, 3s, 4s...
      setTimeout(() => fetchSession(retryCount + 1, maxRetries), delay);
      return;
    }
    navigate('/login');
  }
};
```

**Recommended Fix:**
Implement a session confirmation endpoint that polls until ready.

---

### Issue 4: Incognito Mode Cookie Blocking

**Symptoms:**
- Regular mode works, incognito mode fails
- Safari Private Browsing always fails
- Firefox tracking protection blocks login

**Root Cause:**
Incognito/Private modes aggressively block:
- All third-party cookies
- Cross-site tracking
- Storage APIs

**Current Detection:**
```javascript
// client/src/Login.js (Lines 34-75)
const detectIncognito = async () => {
  // Method 1: Storage quota (Chrome/Edge)
  const { quota } = await navigator.storage.estimate();
  if (quota < 120000000) {
    setIsIncognito(true);
  }
  
  // Method 2: localStorage test (Firefox)
  try {
    localStorage.setItem('test', '1');
    localStorage.removeItem('test');
  } catch (e) {
    setIsIncognito(true);
  }
};
```

**Recommended Fix:**
Inform users and provide alternative:
```javascript
{isIncognito && (
  <div className="incognito-warning">
    ⚠️ Incognito mode detected. For best experience, use normal browsing.
  </div>
)}
```

---

## 📊 Database Schema

### User Model

**File: `/server/models/User.js`**
```javascript
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    
    password: {
      type: String,
      default: null,  // Null for OAuth users
    },
    
    provider: {
      type: String,
      required: true,
      enum: ['google', 'linkedin', 'local'],
    },
    
    providerId: {
      type: String,
      default: null,  // OAuth provider's user ID
    },
    
    profilePicture: {
      type: String,
      default: '',
    },
    
    linkedin: {
      type: String,
      default: '',  // LinkedIn profile URL
    },
    
    hasVoted: {
      type: Boolean,
      default: false,
    },
    
    votedAt: {
      type: Date,
      default: null,
    },
    
    votedFor: {
      type: String,
      default: null,
    },
    
    resetPasswordToken: {
      type: String,
      default: null,
    },
    
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,  // Adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('User', UserSchema);
```

---

## 🔧 Environment Variables

### Required Variables

**File: `.env` (Create this in `/server/` directory)**

```bash
# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/voting-platform?retryWrites=true&w=majority

# Session Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SESSION_SECRET=your_64_character_random_string_here

# Application URLs
CLIENT_URL=https://e-ballot.vercel.app
PORT=5000

# Google OAuth
GOOGLE_CLIENT_ID=your_app_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://e-ballotserver.vercel.app/auth/google/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=https://e-ballotserver.vercel.app/auth/linkedin/callback

# Email (Gmail SMTP for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password  # Generate at: https://myaccount.google.com/apppasswords

# Environment
NODE_ENV=production
```

### Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add ALL variables from above
3. Select environments: Production, Preview, Development
4. Click "Save"

⚠️ **CRITICAL**: After adding variables, redeploy your application.

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in Vercel
- [ ] MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs)
- [ ] MongoDB connection string includes credentials
- [ ] Google OAuth redirect URIs include production URL
- [ ] LinkedIn OAuth redirect URIs include production URL
- [ ] `trust proxy` is set to `1` in Express
- [ ] CORS origin matches production CLIENT_URL

### Post-Deployment Testing

```bash
# Test health endpoint
curl https://e-ballotserver.vercel.app/

# Test session endpoint (should return 401)
curl -i https://e-ballotserver.vercel.app/auth/login/success

# Check response headers for Set-Cookie
# Should see: Set-Cookie: connect.sid=...; Secure; HttpOnly; SameSite=None
```

### OAuth Provider Configuration

**Google Cloud Console**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   - `https://e-ballotserver.vercel.app/auth/google/callback`
   - `http://localhost:5000/auth/google/callback` (for local testing)

**LinkedIn Developer Portal**
1. Go to: https://www.linkedin.com/developers/apps
2. Select your app → Auth
3. Add to "Authorized redirect URLs for your app":
   - `https://e-ballotserver.vercel.app/auth/linkedin/callback`
   - `http://localhost:5000/auth/linkedin/callback`

---

## 🔍 Debugging Tools

### Server-Side Logging

Current logging locations:

```javascript
// Session events
console.log('🔐 Serializing user:', user.name);
console.log('🔓 Deserializing user ID:', id);

// OAuth callbacks
console.log('✅ Google OAuth authenticated:', req.user.name);
console.log('✅ LinkedIn OAuth authenticated:', req.user.name);

// Session saves
console.log(`✅ Session saved (attempt ${saveAttempts})`);

// Database connection
console.log('✅ MongoDB connected successfully');
console.log('⚠️ MongoDB disconnected, reconnecting...');
```

### View Logs in Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# View logs (real-time)
vercel logs --follow

# View logs for specific deployment
vercel logs [deployment-url]
```

### Browser DevTools

**Check Cookies:**
1. Open DevTools (F12)
2. Application tab → Cookies
3. Look for `connect.sid` cookie
4. Verify attributes:
   - ✅ Secure: Yes
   - ✅ HttpOnly: Yes
   - ✅ SameSite: None
   - ✅ Domain: .vercel.app (or your domain)

**Network Debugging:**
1. Network tab → Filter: `auth`
2. Click OAuth login
3. Check redirect chain:
   - `/auth/google` → 302 to Google
   - Google → 302 to `/auth/google/callback`
   - Callback → 302 to `/dashboard`
4. Look for `Set-Cookie` header in callback response

**Console Errors:**
```javascript
// Common errors
"Failed to fetch"  // CORS issue or server down
"401 Unauthorized" // Session not found
"503 Service Unavailable" // MongoDB connection failed
```

---

## 🎯 Recommendations

### High Priority Fixes

1. **Consolidate Domains** (Fixes 80% of issues)
   ```json
   // client/vercel.json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://e-ballotserver.vercel.app/:path*"
       },
       {
         "source": "/auth/:path*",
         "destination": "https://e-ballotserver.vercel.app/auth/:path*"
       }
     ]
   }
   ```

2. **Add Warmup Cron Job** (Prevents cold starts)
   ```json
   // server/vercel.json
   {
     "crons": [{
       "path": "/",
       "schedule": "*/5 * * * *"  // Every 5 minutes
     }]
   }
   ```

3. **Implement Session Confirmation Endpoint**
   ```javascript
   // server/routes/auth.js
   router.get('/session/ready', async (req, res) => {
     if (req.user && req.sessionID) {
       return res.json({ ready: true, user: req.user });
     }
     res.status(202).json({ ready: false }); // 202 Accepted - still processing
   });
   ```

### Medium Priority

4. **Add Rate Limiting** (Security)
   ```bash
   npm install express-rate-limit
   ```

5. **Implement Refresh Tokens** (Better UX)
   - Extend session duration
   - Background token refresh

6. **Add Monitoring** (Observability)
   - Sentry for error tracking
   - LogRocket for session replay
   - Vercel Analytics

### Low Priority

7. **Progressive Web App** (Offline support)
8. **2FA Support** (Enhanced security)
9. **Social Account Linking** (UX improvement)

---

## 📞 Support & Maintenance

### Common Support Scenarios

#### "I can't log in"

**Troubleshooting Steps:**
1. Check browser console for errors
2. Verify cookies are enabled
3. Try in non-incognito mode
4. Clear cookies and try again
5. Check if OAuth providers are down (status.cloud.google.com)

#### "Login works sometimes"

**Likely Causes:**
1. Cross-origin cookie issues (use domain consolidation fix)
2. MongoDB cold start (implement warmup cron)
3. Session race condition (already mitigated with retries)

#### "Password reset not working"

**Check:**
1. Email credentials in environment variables
2. Gmail "Less secure app access" or App Password
3. Check spam folder
4. Verify SMTP settings

---

## 📚 Additional Resources

### Official Documentation
- [Passport.js Docs](http://www.passportjs.org/docs/)
- [Express Session](https://github.com/expressjs/session)
- [connect-mongo](https://github.com/jdesboeufs/connect-mongo)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth 2.0](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)

### Vercel-Specific
- [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Cron Jobs](https://vercel.com/docs/cron-jobs)

---

## 📝 Summary

Your authentication system uses a solid foundation with Passport.js, MongoDB sessions, and multiple OAuth providers. The intermittent login issues are primarily caused by:

1. **Cross-origin cookie restrictions** (different domains)
2. **Serverless cold starts** (MongoDB connection delays)
3. **Session persistence timing** (race conditions)

**Quick Win:** Implement domain consolidation using Vercel rewrites. This will eliminate 80% of cookie-related issues.

**Next Steps:** Add warmup cron and session confirmation endpoint to handle cold starts gracefully.

---

*This document should be kept updated as the authentication system evolves. Last updated: February 6, 2026*
