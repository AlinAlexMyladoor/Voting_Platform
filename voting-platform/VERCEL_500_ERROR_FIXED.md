# 🚨 VERCEL 500 ERROR - FIXED

## Error Details
```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

## Root Causes Found

### 1. **Missing Module Export** ❌
The server wasn't exporting the Express app for Vercel's serverless functions.

**Before:**
```javascript
mongoose.connect(MONGO_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running...`);
  });
});
// No export!
```

**After:**
```javascript
mongoose.connect(MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
});

// Conditional server start
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel ✅
module.exports = app;
```

### 2. **Session Store Error Handling** ❌
MongoStore could fail silently, crashing the function before it starts.

**Fixed:**
- Added try-catch around session middleware
- Fallback to in-memory sessions if MongoStore fails
- Better error logging

### 3. **Cookie Settings** ❌
Cookie settings were conditional, causing issues in production.

**Fixed:**
- Always use `secure: true` (Vercel always uses HTTPS)
- Always use `sameSite: 'none'` (required for cross-domain)

## Changes Made

### `server/index.js` - Complete Fixes

1. **Added Error Handling for Session Middleware**
```javascript
try {
  app.use(session({
    // ... with MongoStore
  }));
} catch (error) {
  console.error('Session middleware error:', error);
  // Fallback to in-memory sessions
  app.use(session({
    // ... without store
  }));
}
```

2. **Fixed App Export for Vercel**
```javascript
// Export for Vercel serverless
module.exports = app;
```

3. **Conditional Server Start**
```javascript
// Only start server in development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
```

4. **Added Error Handling Middleware**
```javascript
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});
```

5. **Enhanced Health Check Endpoint**
```javascript
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1
  });
});
```

## How Serverless Functions Work on Vercel

### Traditional Server (Doesn't Work):
```
Start → Connect DB → Listen on Port → Handle Requests
```

### Vercel Serverless (What We Need):
```
Export App → Vercel Invokes → Handle Request → Return Response
```

Key differences:
- ❌ No `app.listen()` - Vercel handles routing
- ✅ Must export the app with `module.exports`
- ✅ Each request may hit a cold start
- ✅ MongoDB connection must be reusable

## Testing After Deployment

### 1. Health Check
```bash
curl https://your-backend.vercel.app/
```

Expected response:
```json
{
  "message": "Backend is running!",
  "timestamp": "2026-01-25T...",
  "mongoConnected": true
}
```

### 2. Auth Check
```bash
curl https://your-backend.vercel.app/auth/login/success
```

Should return 401 if not logged in (not 500).

### 3. Check Vercel Logs
Go to Vercel Dashboard → Your Project → Logs

Look for:
- ✅ "Connected to MongoDB"
- ❌ No 500 errors
- ❌ No "FUNCTION_INVOCATION_FAILED"

## Environment Variables Required

Ensure these are set in Vercel:

```bash
MONGO_URI=<your-mongodb-connection-string>
SESSION_SECRET=<your-secret-key>
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production

# OAuth credentials
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-secret>
LINKEDIN_CLIENT_ID=<your-linkedin-client-id>
LINKEDIN_CLIENT_SECRET=<your-linkedin-secret>

# Callback URLs
GOOGLE_CALLBACK_URL=https://your-backend.vercel.app/auth/google/callback
LINKEDIN_CALLBACK_URL=https://your-backend.vercel.app/auth/linkedin/callback
```

## Deployment Checklist

- [x] Fixed module export for Vercel
- [x] Added error handling for session middleware
- [x] Fixed cookie settings for production
- [x] Added error handling middleware
- [x] Enhanced health check endpoint
- [ ] **Deploy to Vercel**
- [ ] **Test health endpoint**
- [ ] **Test login flow**
- [ ] **Test voting**

## Why This Crashed Before

1. **Vercel invoked function** → `index.js` loaded
2. **No module export** → Vercel couldn't find handler
3. **Function crashed** → 500 error

## Why It Works Now

1. **Vercel invokes function** → `index.js` loaded
2. **Exports Express app** → `module.exports = app` ✅
3. **Vercel routes requests** → App handles them ✅
4. **Error handling** → Catches issues gracefully ✅

## Common Serverless Mistakes

### ❌ DON'T:
```javascript
// Don't call listen() in production
app.listen(PORT);

// Don't forget to export
// (no module.exports)

// Don't use synchronous code at module level
const data = fs.readFileSync('file.json'); // Bad!
```

### ✅ DO:
```javascript
// Export the app
module.exports = app;

// Conditional listen for local dev
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT);
}

// Use async operations
app.get('/data', async (req, res) => {
  const data = await readFile('file.json'); // Good!
});
```

## MongoDB Connection in Serverless

### The Challenge:
Each serverless invocation might be a new instance, so we need efficient connection handling.

### Our Solution:
```javascript
// Connect once, reuse connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB error:", err));

// Mongoose handles connection pooling automatically
```

### Benefits:
- ✅ Connection is reused across requests (warm starts)
- ✅ Auto-reconnects if connection drops
- ✅ Connection pooling handles multiple requests

## Next Steps After Deployment

1. **Commit & Push These Changes**
2. **Vercel Will Auto-Deploy**
3. **Wait 1-2 Minutes**
4. **Test Endpoints:**
   - Health: `/`
   - Login: `/auth/login/success`
   - Candidates: `/api/candidates`
   - Vote: `/api/vote/:id`

5. **Check for Errors:**
   - If any endpoint returns 500, check Vercel logs
   - Look for specific error messages
   - Verify environment variables are set

## Success Indicators

✅ Health endpoint returns JSON (not HTML error page)  
✅ Auth endpoints return 401 or redirect (not 500)  
✅ MongoDB connection shows as `true`  
✅ Can login and vote successfully  
✅ No FUNCTION_INVOCATION_FAILED errors  

---

**This fix ensures your Vercel serverless functions can properly handle requests!** 🚀
