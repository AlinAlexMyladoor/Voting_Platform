# 🎯 Vercel Deployment Checklist

Use this checklist to deploy your voting platform step by step.

---

## 📋 Pre-Deployment Setup

### 1. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
- [ ] Create a free cluster
- [ ] Create database user with password
- [ ] Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/votingApp`)
- [ ] Go to Network Access
- [ ] Click "Add IP Address"
- [ ] Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
- [ ] Confirm settings

**Your MongoDB URI**: ________________________________

### 2. Generate Secrets
Run these commands to generate secure secrets:

```bash
# Session Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Your SESSION_SECRET**: ________________________________

```bash
# JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Your JWT_SECRET**: ________________________________

### 3. Google OAuth Setup
- [ ] Go to https://console.cloud.google.com/
- [ ] Navigate to: APIs & Services → Credentials
- [ ] Note your existing credentials or create new ones
- [ ] Keep tab open - you'll add redirect URI later

**Your GOOGLE_CLIENT_ID**: ________________________________

**Your GOOGLE_CLIENT_SECRET**: ________________________________

### 4. LinkedIn OAuth Setup
- [ ] Go to https://www.linkedin.com/developers/apps
- [ ] Note your existing app credentials
- [ ] Keep tab open - you'll add redirect URI later

**Your LINKEDIN_CLIENT_ID**: ________________________________

**Your LINKEDIN_CLIENT_SECRET**: ________________________________

### 5. Email Setup
- [ ] Gmail account ready
- [ ] 2FA enabled on Gmail
- [ ] App password generated (https://myaccount.google.com/apppasswords)

**Your EMAIL_USER**: ________________________________

**Your EMAIL_PASSWORD** (16 chars): ________________________________

---

## 🚀 Backend Deployment

### Step 1: Deploy Backend to Vercel
```bash
cd /home/alin/Desktop/WhiteMatrix\(v1\)/Project_\ \(2\)/voting-platform/server
vercel login
vercel
```

- [ ] Logged into Vercel CLI
- [ ] Deployment started
- [ ] Deployment completed successfully

**Your Backend URL**: ________________________________
(e.g., https://voting-platform-backend.vercel.app)

### Step 2: Configure Backend Environment Variables

Go to: Vercel Dashboard → Your Backend Project → Settings → Environment Variables

Add these variables for **Production, Preview, and Development**:

- [ ] `MONGO_URI` = (your MongoDB connection string)
- [ ] `SESSION_SECRET` = (your session secret)
- [ ] `JWT_SECRET` = (your JWT secret)
- [ ] `GOOGLE_CLIENT_ID` = (your Google client ID)
- [ ] `GOOGLE_CLIENT_SECRET` = (your Google client secret)
- [ ] `LINKEDIN_CLIENT_ID` = (your LinkedIn client ID)
- [ ] `LINKEDIN_CLIENT_SECRET` = (your LinkedIn client secret)
- [ ] `EMAIL_HOST` = smtp.gmail.com
- [ ] `EMAIL_PORT` = 587
- [ ] `EMAIL_USER` = (your email)
- [ ] `EMAIL_PASSWORD` = (your app password)
- [ ] `CLIENT_URL` = https://TEMPORARY (will update after frontend deployment)
- [ ] `NODE_ENV` = production

### Step 3: Update OAuth Redirect URLs

#### Google OAuth:
- [ ] Go to Google Cloud Console → APIs & Services → Credentials
- [ ] Click on your OAuth 2.0 Client ID
- [ ] Under "Authorized redirect URIs", click "ADD URI"
- [ ] Add: `https://YOUR-BACKEND-URL.vercel.app/auth/google/callback`
- [ ] Click SAVE

#### LinkedIn OAuth:
- [ ] Go to LinkedIn Developers → Your App → Auth tab
- [ ] Under "Redirect URLs", click "Add redirect URL"
- [ ] Add: `https://YOUR-BACKEND-URL.vercel.app/auth/linkedin/callback`
- [ ] Click UPDATE

### Step 4: Test Backend
```bash
curl https://YOUR-BACKEND-URL.vercel.app
```
- [ ] Response: "Backend is running!"

---

## 🎨 Frontend Deployment

### Step 5: Update Frontend Environment File

Edit: `client/.env.production`

```bash
cd ../client
nano .env.production
```

Change to your actual backend URL:
```
REACT_APP_API_URL=https://YOUR-ACTUAL-BACKEND-URL.vercel.app
```

- [ ] File updated with correct backend URL
- [ ] File saved

### Step 6: Deploy Frontend to Vercel
```bash
vercel
```

- [ ] Deployment started
- [ ] Deployment completed successfully

**Your Frontend URL**: ________________________________
(e.g., https://voting-platform-frontend.vercel.app)

### Step 7: Configure Frontend Environment Variable

Go to: Vercel Dashboard → Your Frontend Project → Settings → Environment Variables

- [ ] Add `REACT_APP_API_URL` = (your backend URL) for **Production**

---

## 🔄 Final Configuration

### Step 8: Update Backend CLIENT_URL

Go to: Vercel Dashboard → Backend Project → Settings → Environment Variables

- [ ] Edit `CLIENT_URL` variable
- [ ] Set to your actual frontend URL: `https://YOUR-FRONTEND-URL.vercel.app`
- [ ] Save changes

### Step 9: Redeploy Backend with Updated CLIENT_URL
```bash
cd ../server
vercel --prod
```
- [ ] Backend redeployed successfully

### Step 10: Deploy Both to Production
```bash
# Deploy backend to production
vercel --prod
```
- [ ] Backend production deployment successful

```bash
# Deploy frontend to production
cd ../client
vercel --prod
```
- [ ] Frontend production deployment successful

---

## ✅ Testing Phase

### Step 11: Test Frontend Access
- [ ] Open: https://YOUR-FRONTEND-URL.vercel.app
- [ ] Page loads without errors
- [ ] Login form visible
- [ ] No console errors (F12 → Console)

### Step 12: Test Google OAuth
- [ ] Click "Sign in with Google"
- [ ] Google login page opens
- [ ] Select account
- [ ] Redirects to Dashboard
- [ ] User profile visible
- [ ] Session persists on page refresh

### Step 13: Test LinkedIn OAuth
- [ ] Logout first
- [ ] Click "Sign in with LinkedIn"
- [ ] LinkedIn login page opens
- [ ] Authorize app
- [ ] Redirects to Dashboard
- [ ] User profile visible

### Step 14: Test Local Registration
- [ ] Logout
- [ ] Click "Create Account"
- [ ] Fill in details
- [ ] Click Register
- [ ] Redirects to Dashboard
- [ ] User created successfully

### Step 15: Test Local Login
- [ ] Logout
- [ ] Click "Sign In with Email"
- [ ] Enter registered credentials
- [ ] Click Login
- [ ] Redirects to Dashboard

### Step 16: Test Forgot Password
- [ ] Logout
- [ ] Click "Forgot Password?"
- [ ] Enter email address
- [ ] Click "Send Reset Link"
- [ ] Check email inbox
- [ ] Email received with reset link

### Step 17: Test Password Reset
- [ ] Click link in email
- [ ] Redirects to reset page
- [ ] Enter new password
- [ ] Click "Reset Password"
- [ ] Success message shown
- [ ] Can login with new password

### Step 18: Test Voting
- [ ] Login to Dashboard
- [ ] Candidates list visible with photos
- [ ] Click "Vote" on a candidate
- [ ] Confirmation shown
- [ ] Confetti animation plays
- [ ] Vote button becomes "Voted"
- [ ] Cannot vote again

### Step 19: Test Vote Charts
- [ ] Scroll to "Live Vote Results"
- [ ] Bar chart visible
- [ ] Shows correct vote counts
- [ ] Updates after voting

### Step 20: Test LinkedIn Profile Update
- [ ] Login with LinkedIn (if profile not set)
- [ ] Modal appears asking for LinkedIn URL
- [ ] Enter LinkedIn profile URL
- [ ] Click "Update Profile"
- [ ] Success message shown
- [ ] Modal closes

---

## 🎉 Deployment Complete!

If all checkboxes are checked, your application is successfully deployed!

### 📝 Save These URLs:

**Frontend**: ________________________________

**Backend**: ________________________________

### 🔐 Security Reminders:

- [ ] .env files are in .gitignore
- [ ] Secrets are only in Vercel dashboard
- [ ] OAuth redirect URLs are HTTPS
- [ ] MongoDB has IP whitelist
- [ ] Email using app password (not account password)

---

## 🆘 If Something Fails:

1. **Check Vercel Logs**:
   ```bash
   vercel logs <deployment-url>
   ```

2. **Check Browser Console**: F12 → Console tab

3. **Verify Environment Variables**: Vercel Dashboard → Settings → Environment Variables

4. **Check Documentation**: See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

5. **Common Issues**: See "Common Issues & Fixes" section in deployment guide

---

## 📊 Deployment Summary

| Component | Status | URL |
|-----------|--------|-----|
| Backend | ⬜ | ________________ |
| Frontend | ⬜ | ________________ |
| MongoDB | ⬜ | ________________ |
| Google OAuth | ⬜ | Configured |
| LinkedIn OAuth | ⬜ | Configured |
| Email Service | ⬜ | Configured |

**Date Deployed**: ________________

**Deployed By**: ________________

---

## 🔄 For Future Updates:

```bash
# Make code changes, then:

# Update backend
cd server
git add .
git commit -m "Your changes"
vercel --prod

# Update frontend
cd ../client
git add .
git commit -m "Your changes"
vercel --prod
```

Or connect to GitHub for automatic deployments!

---

**Good luck with your deployment! 🚀**
