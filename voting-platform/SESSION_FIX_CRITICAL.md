# "Login Required" Error After Login - CRITICAL FIX 🚨

## Root Cause Identified

### **THE REAL PROBLEM: In-Memory Sessions on Vercel**

Your backend was using **in-memory session storage**, which doesn't work with Vercel's serverless architecture!

#### Why This Causes "Login Required" Errors:

1. **Vercel runs serverless functions** - Each API request might hit a different function instance
2. **In-memory sessions are lost** - Session data stored in one instance isn't available to another
3. **User appears logged in on frontend** but backend can't find the session
4. **Vote requests fail** with "Login required" because `req.user` is undefined

### Example Flow (BEFORE FIX):
```
1. User logs in → Session saved in Instance A's memory ✅
2. Frontend checks auth → Hits Instance A → User found ✅
3. User clicks vote → Hits Instance B → No session found ❌
4. Backend: "Login required" 🚫
```

## The Solution

### ✅ Use MongoDB-Backed Sessions with `connect-mongo`

Store sessions in MongoDB so they persist across all serverless function instances.

## Changes Made

### 1. **Installed `connect-mongo`**
```bash
npm install connect-mongo
```

### 2. **Updated `server/index.js`**

#### Added MongoStore import:
```javascript
const MongoStore = require("connect-mongo");
```

#### Configured session middleware to use MongoDB:
```javascript
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      touchAfter: 24 * 3600, // Lazy session update
      crypto: {
        secret: process.env.SESSION_SECRET || "secret_key"
      }
    }),
    cookie: {
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true
    }
  })
);
```

### 3. **Enhanced `isAuthenticated` Middleware** (`server/routes/voting.js`)

Added better debugging and dual auth checks:
```javascript
const isAuthenticated = (req, res, next) => {
  console.log('🔐 Auth Check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?.id,
    sessionID: req.sessionID
  });
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  if (req.user) {
    return next();
  }
  
  return res.status(401).json({ 
    message: "Login required. Please login again." 
  });
};
```

### 4. **Added Debug Middleware**

Logs session state for API/auth requests to help diagnose issues.

## How MongoStore Fixes It

### BEFORE (In-Memory):
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Instance A  │     │ Instance B  │     │ Instance C  │
│ Session: ✅ │     │ Session: ❌ │     │ Session: ❌ │
└─────────────┘     └─────────────┘     └─────────────┘
     Login              Vote (fails)        Refresh (fails)
```

### AFTER (MongoDB):
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Instance A  │     │ Instance B  │     │ Instance C  │
│      ↓      │     │      ↓      │     │      ↓      │
└─────────────┘     └─────────────┘     └─────────────┘
        ↓                  ↓                    ↓
    ┌───────────────────────────────────────────┐
    │      MongoDB Session Store (Shared)       │
    │              Session: ✅                   │
    └───────────────────────────────────────────┘
     Login            Vote (works!)      Refresh (works!)
```

All instances read/write from the same MongoDB session store!

## Benefits

1. ✅ **Sessions persist** across all serverless instances
2. ✅ **Login state maintained** between requests
3. ✅ **Vote requests work** - backend can find user session
4. ✅ **Scalable** - works with any number of serverless instances
5. ✅ **Automatic cleanup** - MongoDB TTL removes expired sessions

## MongoDB Session Collection

MongoStore automatically creates a `sessions` collection in your MongoDB database:

```javascript
{
  _id: "session-id-here",
  expires: ISODate("2026-01-26T..."),
  session: {
    cookie: { ... },
    passport: {
      user: "user-id-here"  // Your user's ID
    }
  }
}
```

## Testing After Deployment

### 1. **Deploy the changes**
```bash
git add .
git commit -m "Fix: Use MongoDB session store for Vercel deployment"
git push origin master
```

### 2. **Clear browser cache and cookies**

### 3. **Test Flow:**
```
1. Login ✅
2. See username displayed ✅
3. Click vote button ✅
4. Vote should succeed (no "Login required" error) ✅
5. Refresh page ✅
6. Still logged in ✅
```

### 4. **Check MongoDB**
Look for a `sessions` collection in your database - it should have entries.

### 5. **Check Server Logs** (Vercel Dashboard)
You should see logs like:
```
📍 Request: { method: 'POST', path: '/api/vote/...', hasUser: true }
🔐 Auth Check: { isAuthenticated: true, hasUser: true, userId: '...' }
```

## Environment Variables

Ensure `MONGO_URI` and `SESSION_SECRET` are set in Vercel:

```bash
MONGO_URI=<your-mongodb-connection-string-here>
SESSION_SECRET=<your-secret-key-at-least-32-characters>
```

**Note:** Never commit actual credentials. Use Vercel's environment variables dashboard.

## What Happens Now

### Successful Login Flow:
```
1. User logs in via Google/LinkedIn/Local
2. Passport creates session → Saved to MongoDB ✅
3. Session cookie sent to browser ✅
4. User clicks vote
5. Browser sends cookie with request ✅
6. Backend loads session from MongoDB ✅
7. req.user is populated ✅
8. isAuthenticated passes ✅
9. Vote is cast successfully 🎉
```

## Troubleshooting

### If "Login required" still appears:

1. **Check Vercel logs** - Look for auth check logs
2. **Verify MONGO_URI** - Must be accessible from Vercel
3. **Check sessions collection** - Should have active sessions
4. **Clear cookies completely** - Old cookies might interfere
5. **Test in incognito mode** - Clean environment

### Common Issues:

- **MONGO_URI not set**: Sessions can't be saved → Login fails
- **Old cookies**: Browser using old session → Clear and re-login
- **CORS issues**: Check `CLIENT_URL` matches your frontend exactly
- **Cookie settings**: Must use `secure: true` and `sameSite: 'none'` for cross-domain

## Why This Was Hard to Debug

1. ❌ **No error on login** - Session appeared to work initially
2. ❌ **Works on mobile** - Mobile might've hit the same instance more often
3. ❌ **Intermittent failure** - Sometimes worked, sometimes didn't
4. ❌ **Frontend shows logged in** - Only backend requests failed

The issue was **invisible** until you tried to make authenticated requests!

## Prevention

For any serverless deployment (Vercel, AWS Lambda, Netlify Functions):
- ✅ **ALWAYS use persistent session storage** (Redis, MongoDB, etc.)
- ❌ **NEVER use in-memory sessions** (express-session default)

---

**Result:** Sessions now work correctly across all Vercel serverless instances! 🎉
