# ⚡ Quick Deployment Reference

## 🎯 What Was Changed

### ✅ Server Files Modified:
- [server/index.js](server/index.js) - CORS, session cookies, Helmet CSP
- [server/routes/auth.js](server/routes/auth.js) - OAuth callbacks, logout, password reset URLs
- [server/vercel.json](server/vercel.json) - ✨ NEW - Vercel configuration

### ✅ Client Files Modified:
- [client/src/App.js](client/src/App.js) - API URL environment variable
- [client/src/Login.js](client/src/Login.js) - API URL environment variable
- [client/src/Dashboard.js](client/src/Dashboard.js) - API URL environment variable
- [client/.env.production](client/.env.production) - ✨ NEW - Production API URL
- [client/.env.development](client/.env.development) - ✨ NEW - Development API URL

---

## 🚀 Deploy Commands

### Deploy Backend:
```bash
cd server
vercel login
vercel              # Preview deployment
vercel --prod       # Production deployment
```

### Deploy Frontend:
```bash
cd client
vercel login
vercel              # Preview deployment
vercel --prod       # Production deployment
```

---

## 🔑 Required Environment Variables

### Backend (Vercel Dashboard):
```env
MONGO_URI=mongodb+srv://...
SESSION_SECRET=min_32_chars_random
JWT_SECRET=min_32_chars_random
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASSWORD=app_password
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Frontend (Vercel Dashboard):
```env
REACT_APP_API_URL=https://your-backend.vercel.app
```

---

## 📝 Deployment Checklist

- [ ] MongoDB Atlas cluster created with `0.0.0.0/0` IP whitelist
- [ ] Backend deployed to Vercel
- [ ] Backend environment variables configured
- [ ] Google OAuth redirect URI updated: `https://backend.vercel.app/auth/google/callback`
- [ ] LinkedIn OAuth redirect URI updated: `https://backend.vercel.app/auth/linkedin/callback`
- [ ] Frontend `.env.production` updated with backend URL
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variable configured
- [ ] Backend `CLIENT_URL` updated with frontend URL
- [ ] Backend redeployed with updated `CLIENT_URL`
- [ ] Test Google OAuth login
- [ ] Test LinkedIn OAuth login
- [ ] Test local login/register
- [ ] Test voting functionality
- [ ] Test forgot password flow

---

## 🧪 Test URLs

Replace with your actual URLs:

```bash
# Backend Health Check
curl https://your-backend.vercel.app

# Frontend
open https://your-frontend.vercel.app

# Test OAuth (in browser)
https://your-backend.vercel.app/auth/google
https://your-backend.vercel.app/auth/linkedin
```

---

## 🆘 Quick Fixes

### CORS Error:
```bash
# Set CLIENT_URL in backend Vercel dashboard
# Then redeploy
cd server && vercel --prod
```

### OAuth Not Working:
1. Check callback URLs in Google/LinkedIn console
2. Must be: `https://your-backend.vercel.app/auth/{provider}/callback`
3. Verify `CLIENT_URL` is set in backend

### Session Lost:
- Already fixed in code (secure cookies, sameSite: none)
- Clear browser cookies and try again

### MongoDB Connection:
- Whitelist `0.0.0.0/0` in MongoDB Atlas
- Verify `MONGO_URI` in Vercel

---

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md) for complete details.

---

**Status**: ✅ All code changes complete - Ready to deploy!
