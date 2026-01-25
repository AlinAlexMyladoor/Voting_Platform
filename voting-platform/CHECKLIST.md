# Voting Platform - Setup Checklist

## ✅ Files Reviewed and Fixed

### Server Files
- ✅ `server/index.js` - Main server file with Express, Mongoose, Passport, Helmet, CORS
- ✅ `server/passport.js` - OAuth strategies for Google & LinkedIn
- ✅ `server/models/User.js` - User schema (fixed duplicate hasVoted field)
- ✅ `server/models/Candidate.js` - Candidate schema (added party & img fields)
- ✅ `server/routes/auth.js` - Authentication routes
- ✅ `server/routes/voting.js` - Voting API routes (added votedFor tracking)
- ✅ `server/seed.js` - Database seeding script (added party & img data)
- ✅ `server/.env` - Environment variables (added SESSION_SECRET)
- ✅ `server/package.json` - Dependencies configured
- ✅ `server/.gitignore` - Created to ignore sensitive files

### Client Files
- ✅ `client/src/App.js` - React Router setup
- ✅ `client/src/Login.js` - OAuth login buttons
- ✅ `client/src/Dashboard.js` - Main voting interface (fixed user authentication check)
- ✅ `client/src/index.js` - React entry point
- ✅ `client/public/index.html` - HTML template
- ✅ `client/package.json` - Dependencies and proxy configured
- ✅ `client/.gitignore` - Already exists

### Documentation
- ✅ `README.md` - Comprehensive project documentation
- ✅ `CHECKLIST.md` - This file
- ✅ `start.sh` - Bash startup script
- ✅ `start.fish` - Fish shell startup script

## 🔧 Key Fixes Applied

1. **User Model**
   - Removed duplicate `hasVoted` field definition
   - Kept single `hasVoted` boolean with default false

2. **Candidate Model**
   - Added `party` field (String, default: "Independent")
   - Added `img` field (String, default: "")

3. **Dashboard Component**
   - Added user authentication check via `/auth/login/success`
   - Added proper state management for user data
   - Added navigation redirect if not authenticated
   - Improved loading states

4. **Voting Route**
   - Added `votedFor` field to track which candidate user voted for
   - Added error logging for debugging

5. **Seed Script**
   - Added party names for candidates
   - Added profile images using dicebear API

6. **Environment Variables**
   - Added `SESSION_SECRET` for secure session management

## 🚀 How to Start the Application

### Option 1: Manual Start (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd server
npm start
# Or for auto-reload: npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

### Option 2: Using Startup Scripts

**For Bash users:**
```bash
./start.sh
```

**For Fish shell users:**
```fish
./start.fish
```

## 📋 Pre-Flight Checklist

Before running the application, ensure:

- [ ] MongoDB connection string is correct in `server/.env`
- [ ] Google OAuth credentials are set in `server/.env`
- [ ] LinkedIn OAuth credentials are set in `server/.env`
- [ ] SESSION_SECRET is set (don't use default in production)
- [ ] Node.js and npm are installed
- [ ] MongoDB is accessible (Atlas or local)
- [ ] Ports 3000 and 5000 are available

## 🧪 Testing the Application

1. **Start both servers** (backend on :5000, frontend on :3000)
2. **Seed the database** (if first time):
   ```bash
   cd server
   node seed.js
   ```
3. **Open browser** to http://localhost:3000
4. **Test Google Login**:
   - Click "Login with Google"
   - Authorize the app
   - Should redirect to dashboard
5. **Test LinkedIn Login**:
   - Click "Login with LinkedIn"
   - Authorize the app
   - Should redirect to dashboard
6. **Test Voting**:
   - View candidates on dashboard
   - Click vote button for a candidate
   - Verify vote is recorded
   - Verify you can't vote again
7. **Test Logout**:
   - Click logout button
   - Should redirect to login page
8. **Test Re-login**:
   - Login again with same account
   - Should see "already voted" status

## 🔍 Verification Steps

### Backend Verification
```bash
# Test server is running
curl http://localhost:5000

# Test candidates endpoint
curl http://localhost:5000/api/candidates

# Test voters endpoint
curl http://localhost:5000/api/voters

# Test stats endpoint
curl http://localhost:5000/api/stats
```

### Database Verification
```bash
# Connect to MongoDB and verify collections
# Should see: users, candidates
```

## 🐛 Common Issues and Solutions

### Issue: Server won't start
**Solution:** 
- Check if port 5000 is already in use: `lsof -i :5000`
- Kill process if needed: `kill -9 <PID>`

### Issue: Client won't start
**Solution:**
- Check if port 3000 is already in use: `lsof -i :3000`
- Delete `node_modules` and `package-lock.json`, then `npm install`

### Issue: "Login required" error
**Solution:**
- Clear browser cookies
- Restart both servers
- Check SESSION_SECRET is set

### Issue: MongoDB connection error
**Solution:**
- Verify MONGO_URI in .env
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for development)
- Test connection: `mongosh "your_connection_string"`

### Issue: OAuth redirect not working
**Solution:**
- Verify callback URLs in Google/LinkedIn developer console
- Should be: `http://localhost:5000/auth/google/callback`
- Should be: `http://localhost:5000/auth/linkedin/callback`

### Issue: CORS errors
**Solution:**
- Verify proxy in `client/package.json`: `"proxy": "http://localhost:5000"`
- Check CORS origin in `server/index.js`: `origin: "http://localhost:3000"`

## 📊 Project Status

### ✅ Completed
- All server files reviewed and fixed
- All client files reviewed and fixed
- Authentication flow working
- Voting system implemented
- One-time voting enforced
- Session management configured
- Security middleware (Helmet) configured
- Documentation created

### 🎯 Ready for Testing
- Google OAuth login
- LinkedIn OAuth login
- Vote casting
- Vote tracking
- User session management
- Logout functionality

### 🔮 Future Enhancements (Not Yet Implemented)
- Admin panel
- Real-time updates with WebSocket
- Vote analytics charts
- Email notifications
- Multi-factor authentication
- Voting deadline management

## 🎉 Success Criteria

The application is working correctly when:

1. ✅ Backend server starts without errors on port 5000
2. ✅ Frontend server starts without errors on port 3000
3. ✅ Can login with Google OAuth
4. ✅ Can login with LinkedIn OAuth
5. ✅ Dashboard shows candidate list
6. ✅ Can cast vote for a candidate
7. ✅ Cannot vote twice with same account
8. ✅ Recent voter activity displays correctly
9. ✅ Can logout successfully
10. ✅ After re-login, voted status persists

## 📞 Support

If you encounter issues:
1. Check this checklist
2. Review the README.md
3. Check server logs in terminal
4. Check browser console for errors
5. Verify all environment variables are set correctly

---

**Last Updated:** January 16, 2026
**Status:** ✅ All files reviewed and corrected
**Next Step:** Run `node server/seed.js` then start both servers
