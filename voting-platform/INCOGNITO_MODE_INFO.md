# Incognito Mode and OAuth Login

## Why LinkedIn/Google Login Doesn't Work in Incognito Mode

### Technical Explanation

**The Issue:**
OAuth login (Google/LinkedIn) requires **third-party cookies** to work across different domains:
- Frontend: `e-ballot.vercel.app`
- Backend: `e-ballotserver.vercel.app`

When you login with OAuth:
1. You're redirected to Google/LinkedIn
2. They authenticate you
3. They redirect back to `e-ballotserver.vercel.app/auth/callback`
4. Backend sets a session cookie
5. Browser redirects to `e-ballot.vercel.app/dashboard`
6. Frontend needs to read the cookie from backend domain

**Incognito Mode Blocks This:**
- Incognito/Private browsing **blocks third-party cookies by default**
- The session cookie from `e-ballotserver.vercel.app` cannot be read by `e-ballot.vercel.app`
- Result: You appear logged out even after successful authentication

### Browser Cookie Policies

| Browser | Incognito Behavior | OAuth Impact |
|---------|-------------------|--------------|
| **Chrome** | Blocks 3rd-party cookies | ❌ OAuth fails |
| **Firefox** | Blocks 3rd-party cookies | ❌ OAuth fails |
| **Safari** | Blocks 3rd-party cookies | ❌ OAuth fails |
| **Edge** | Blocks 3rd-party cookies | ❌ OAuth fails |

### Solutions Implemented

#### 1. **Cookie Partitioning (CHIPS)**
```javascript
cookie: {
  secure: true,
  sameSite: 'none',
  partitioned: true,  // New: Chrome's CHIPS standard
}
```

**Status:** Helps in Chrome 115+, but not universally supported yet.

#### 2. **Incognito Detection & Warning**
The login page now:
- Detects incognito/private mode automatically
- Shows a warning banner
- Recommends using Email/Password login instead

#### 3. **Alternative: Email/Password Login**
✅ **Works in incognito mode** because:
- No cross-domain cookies needed
- Session is established on same request
- No OAuth redirect flow

### User Recommendations

#### ✅ **Best Options for Incognito Mode:**

1. **Use Email/Password Login**
   - Click "Login with Email/Password"
   - Works perfectly in incognito mode
   - No cookie restrictions

2. **Register a New Account**
   - Click "Don't have an account? Register"
   - Create account with email
   - Works in incognito mode

#### ⚠️ **For OAuth (Google/LinkedIn):**

**Option A:** Use Regular Browser Window
```
Close incognito → Open normal window → Login with OAuth
```

**Option B:** Allow Third-Party Cookies (Chrome)
```
Settings → Privacy → Cookies → Allow all cookies (temporary)
```

**Option C:** Use Same-Domain Setup (Advanced)
```
Deploy both frontend and backend on same domain
Example: e-ballot.com (frontend) and e-ballot.com/api (backend)
```

### Why Not Fix It Completely?

**Technical Limitations:**

1. **Different Domains Required:**
   - Vercel free tier assigns different subdomains
   - `e-ballot.vercel.app` vs `e-ballotserver.vercel.app`
   - Custom domain ($) required for same-domain setup

2. **Browser Security:**
   - Third-party cookie blocking is **intentional security**
   - Prevents tracking across sites
   - OAuth fundamentally requires cross-domain trust

3. **OAuth Protocol:**
   - OAuth 2.0 spec relies on cookies/sessions
   - Alternative (JWT tokens in URL) has security risks
   - Industry standard is cookie-based

### Future Solutions

#### Option 1: Custom Domain (Recommended)
```
Buy domain: votingplatform.com
Frontend: votingplatform.com
Backend: votingplatform.com/api
```
**Cost:** ~$12/year + Vercel Pro ($20/month)

#### Option 2: Proxy Backend Through Frontend
```
Vercel rewrite rules:
/api/* → e-ballotserver.vercel.app/*
```
**Limitation:** May increase latency, complex setup

#### Option 3: Token-Based Auth (JWT)
```
Return JWT in URL parameter after OAuth
Store in localStorage (not cookies)
```
**Risk:** More vulnerable to XSS attacks, not recommended

### For Developers

#### Testing Incognito Mode:

```bash
# Open in incognito
# Chrome
open -a "Google Chrome" --args --incognito https://e-ballot.vercel.app

# Firefox
open -a Firefox --args -private-window https://e-ballot.vercel.app
```

#### Debugging:

1. Open DevTools → Application → Cookies
2. Look for `connect.sid` cookie
3. Check `sameSite` and `secure` flags
4. In incognito: cookie won't persist across domains

### Current Status

✅ **Working:**
- Email/Password login in incognito ✅
- All logins in regular browser ✅
- Incognito detection & warning ✅
- Cookie partitioning (CHIPS) ✅

⚠️ **Limited:**
- OAuth in incognito (browser limitation)

### Summary

**Incognito mode OAuth failure is not a bug** - it's a browser security feature. 

**Workarounds provided:**
1. Warning message for users
2. Email/Password alternative
3. Cookie partitioning for newer browsers

**For full OAuth support in incognito:** Would require custom domain and same-domain deployment.
