# 🚀 Vercel Deployment Guide

All necessary code changes have been implemented. Follow these steps to deploy your voting platform to Vercel.

## ✅ Changes Made

### Backend (Server)
- ✅ Created `vercel.json` for Vercel configuration
- ✅ Updated CORS to use `CLIENT_URL` environment variable
- ✅ Updated session cookies for production (secure, sameSite: 'none')
- ✅ Updated Helmet CSP to include Vercel domains
- ✅ Updated all OAuth callbacks to use dynamic `CLIENT_URL`
- ✅ Updated password reset email URLs to use dynamic `CLIENT_URL`
- ✅ Updated logout redirect to use dynamic `CLIENT_URL`

### Frontend (Client)
- ✅ Created `.env.production` with `REACT_APP_API_URL` placeholder
- ✅ Created `.env.development` with local API URL
- ✅ Updated all API calls to use `REACT_APP_API_URL` environment variable
- ✅ Added `API_URL` constant in Dashboard.js, App.js, and Login.js
- ✅ Updated all hardcoded localhost URLs to use environment variables

---

## 📋 Deployment Steps

### **Step 1: Set Up MongoDB Atlas (If Not Already Done)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/votingApp`)
4. In Network Access, add IP `0.0.0.0/0` to allow connections from anywhere (Vercel)

### **Step 2: Deploy Backend to Vercel**

```bash
cd server
vercel login  # Login to Vercel
vercel        # Deploy to preview
```

During deployment, you'll be asked:
- Set up and deploy? **Yes**
- Which scope? **Select your account**
- Link to existing project? **No**
- Project name? **voting-platform-backend** (or your choice)
- Directory? **./server** (or just press Enter if already in server folder)

After deployment completes, note the URL (e.g., `https://voting-platform-backend.vercel.app`)

### **Step 3: Configure Backend Environment Variables**

Go to your Vercel dashboard → Project → Settings → Environment Variables

Add these variables for **Production**, **Preview**, and **Development**:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/votingApp
SESSION_SECRET=your_strong_random_secret_here_minimum_32_chars
JWT_SECRET=your_jwt_secret_here_minimum_32_chars

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password

CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

**Note**: You'll update `CLIENT_URL` after deploying the frontend in the next step.

### **Step 4: Update OAuth Callback URLs**

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services → Credentials**
3. Select your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   - `https://your-backend.vercel.app/auth/google/callback`
5. Click **Save**

#### LinkedIn OAuth:
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Select your app → **Auth** tab
3. Under "Redirect URLs", add:
   - `https://your-backend.vercel.app/auth/linkedin/callback`
4. Click **Update**

### **Step 5: Deploy Frontend to Vercel**

First, update `.env.production` with your actual backend URL:

```bash
# In client/.env.production
REACT_APP_API_URL=https://your-backend.vercel.app
```

Then deploy:

```bash
cd ../client
vercel        # Deploy to preview
```

During deployment:
- Set up and deploy? **Yes**
- Which scope? **Select your account**
- Link to existing project? **No**
- Project name? **voting-platform-frontend** (or your choice)
- Directory? **./client** (or just press Enter if already in client folder)

After deployment, note the URL (e.g., `https://voting-platform-frontend.vercel.app`)

### **Step 6: Configure Frontend Environment Variables**

Go to Vercel dashboard → Frontend Project → Settings → Environment Variables

Add for **Production**:
```
REACT_APP_API_URL=https://your-backend.vercel.app
```

### **Step 7: Update Backend CLIENT_URL**

Go back to your backend project on Vercel:
1. Settings → Environment Variables
2. Edit `CLIENT_URL` variable
3. Set it to: `https://your-frontend.vercel.app`
4. Save and redeploy backend:

```bash
cd server
vercel --prod
```

### **Step 8: Deploy Both to Production**

```bash
# Deploy backend to production
cd server
vercel --prod

# Deploy frontend to production
cd ../client
vercel --prod
```

---

## 🧪 Testing Your Deployment

### Test Backend:
Visit: `https://your-backend.vercel.app`
Should see: "Backend is running!"

### Test Frontend:
Visit: `https://your-frontend.vercel.app`
Should see: Login page

### Test OAuth:
1. Click "Sign in with Google" or "Sign in with LinkedIn"
2. Complete OAuth flow
3. Should redirect to Dashboard

### Test Voting:
1. Login successfully
2. Vote for a candidate
3. Check if vote is recorded
4. Verify confetti animation plays

### Test Email:
1. Go to "Forgot Password"
2. Enter email
3. Check inbox for reset email (or check server logs if email fails)

---

## 🔧 Common Issues & Fixes

### Issue 1: CORS Error
**Symptom**: Console shows "CORS policy" errors
**Fix**: 
- Ensure `CLIENT_URL` is set correctly in backend environment variables
- Make sure it matches your frontend URL exactly (with https://)
- Redeploy backend after changing environment variables

### Issue 2: OAuth Redirect Fails
**Symptom**: After OAuth login, shows "Cannot GET /auth/google/callback"
**Fix**:
- Verify callback URLs in Google/LinkedIn match your backend URL exactly
- Check that `CLIENT_URL` environment variable is set in backend
- Clear cookies and try again

### Issue 3: Session Lost on Refresh
**Symptom**: User logged out when page refreshes
**Fix**:
- Ensure session cookie settings have `secure: true` and `sameSite: 'none'` in production
- This is already implemented in the updated code
- Clear browser cookies and test again

### Issue 4: MongoDB Connection Fails
**Symptom**: Backend logs show "MongooseServerSelectionError"
**Fix**:
- Check MongoDB Atlas → Network Access
- Ensure `0.0.0.0/0` is whitelisted
- Verify `MONGO_URI` in Vercel environment variables is correct
- Check MongoDB username/password have no special characters that need URL encoding

### Issue 5: Environment Variables Not Working
**Symptom**: Application behaves like localhost URLs
**Fix**:
- Verify environment variables are set in Vercel dashboard
- Make sure variables are set for all environments (Production, Preview, Development)
- Redeploy after adding/changing variables
- Check build logs for environment variable loading

### Issue 6: "Invalid resetToken" Error
**Symptom**: Password reset link shows "Token invalid or expired"
**Fix**:
- Links expire in 1 hour
- Ensure `CLIENT_URL` is set correctly so reset URLs point to production
- Try generating a new reset link

---

## 📊 Monitoring & Logs

### View Backend Logs:
```bash
vercel logs <backend-deployment-url>
```

### View Frontend Logs:
```bash
vercel logs <frontend-deployment-url>
```

Or view in Vercel Dashboard → Project → Deployments → Click deployment → View Logs

---

## 🔒 Security Checklist

- [ ] `SESSION_SECRET` is a strong random string (32+ characters)
- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] MongoDB credentials are not exposed in code
- [ ] OAuth client secrets are stored only in environment variables
- [ ] Email password is an app-specific password, not account password
- [ ] `.env` files are in `.gitignore`
- [ ] MongoDB Atlas has IP whitelist configured
- [ ] OAuth redirect URLs are HTTPS (not HTTP)

---

## 📝 Environment Variables Reference

### Backend Required Variables:
```
MONGO_URI                 - MongoDB connection string
SESSION_SECRET           - Express session secret
JWT_SECRET              - JWT signing secret
GOOGLE_CLIENT_ID        - Google OAuth client ID
GOOGLE_CLIENT_SECRET    - Google OAuth client secret
LINKEDIN_CLIENT_ID      - LinkedIn OAuth client ID
LINKEDIN_CLIENT_SECRET  - LinkedIn OAuth client secret
EMAIL_HOST              - SMTP host (smtp.gmail.com)
EMAIL_PORT              - SMTP port (587)
EMAIL_USER              - Email address
EMAIL_PASSWORD          - Email app password
CLIENT_URL              - Frontend URL (https://your-frontend.vercel.app)
NODE_ENV                - production
```

### Frontend Required Variables:
```
REACT_APP_API_URL       - Backend URL (https://your-backend.vercel.app)
```

---

## 🎉 Success!

If everything works:
- ✅ You can access frontend at your Vercel URL
- ✅ OAuth login works for Google and LinkedIn
- ✅ Local login/register works
- ✅ Voting functionality works
- ✅ Password reset emails are sent
- ✅ Session persists across page refreshes

---

## 🆘 Need Help?

Check these resources:
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth Setup](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)

---

## 🔄 Future Updates

To update your deployment:

```bash
# Make your code changes, then:

# Update backend:
cd server
git add .
git commit -m "Your changes"
vercel --prod

# Update frontend:
cd ../client
git add .
git commit -m "Your changes"
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments on push!

---

**Last Updated**: January 25, 2026
**Status**: ✅ All code changes implemented and ready for deployment
