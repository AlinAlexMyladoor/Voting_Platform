# 🔥 FORGOT PASSWORD - WORKING NOW (Development Mode)

## ✅ Current Status: WORKING

The forgot password feature is now working in **development mode**. 

### How It Works Now:

Since email credentials are not configured, the system will:
1. Generate a password reset token
2. **LOG the reset URL to the server console** (you copy/paste it)
3. You can use that URL to reset your password

---

## 🎯 How to Use Forgot Password (Development Mode)

### Step 1: Start the Server (Already Running)
```bash
cd server
npm run dev
```

✅ Server is running on: http://localhost:5000

### Step 2: Request Password Reset

1. Open: **http://localhost:3000/login**
2. Click: **"Forgot Password?"**
3. Enter email: **Any registered email** (e.g., test@example.com)
4. Click: **"Send Reset Link"**

### Step 3: Get Reset URL from Console

Look at your **server terminal/console**, you'll see:

```
⚠️  Email credentials not configured. Logging reset URL to console for development.

🔗 Password reset URL for test@example.com:
http://localhost:3000/login?resetToken=abc123456789...
```

### Step 4: Use the Reset URL

1. **Copy** the URL from the console
2. **Paste** it into your browser
3. Enter your new password
4. Click "Reset Password"
5. ✅ Done! You can now login with the new password

---

## 📧 To Enable Real Email Sending

You have **3 options**:

### Option 1: Gmail App Password (Recommended for Production)

1. **Enable 2FA** on your Gmail account:
   - Visit: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**:
   - Visit: https://myaccount.google.com/apppasswords
   - Select: **Mail** → **Other (Custom name)** → "Voting Platform"
   - Click **Generate**
   - Copy the 16-character password (e.g., `abcdabcdabcdabcd`)

3. **Update `.env`**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=alinalex441@gmail.com
   EMAIL_PASSWORD=abcdabcdabcdabcd
   ```
   ⚠️ **NO SPACES in the password!**

4. **Test**:
   ```bash
   node scripts/test_email.js
   ```

### Option 2: Mailtrap (Recommended for Development)

1. **Sign up** at: https://mailtrap.io/
2. **Get credentials** from your Mailtrap inbox
3. **Update `.env`**:
   ```env
   EMAIL_HOST=sandbox.smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USER=your_mailtrap_username
   EMAIL_PASSWORD=your_mailtrap_password
   ```

4. **Emails won't reach real inboxes** - they're caught by Mailtrap for testing

### Option 3: SendGrid (Recommended for Production)

1. **Sign up** at: https://sendgrid.com/
2. **Generate API Key**
3. **Update code** to use SendGrid SDK

---

## 🧪 Testing Right Now

### Test 1: Register a User
```
1. Go to: http://localhost:3000/login
2. Click "Create Account"
3. Register with email: test@example.com
4. Password: Test123
```

### Test 2: Forgot Password
```
1. Click "Forgot Password?"
2. Enter: test@example.com
3. Check server console for reset URL
4. Copy URL and paste in browser
5. Enter new password
6. Login with new password
```

---

## 🎉 What's Working

✅ Registration (local + OAuth)  
✅ Login (local + OAuth)  
✅ Forgot Password (console mode)  
✅ Password Reset  
✅ Voting System  
✅ LinkedIn Profile Management  
✅ Voter Display  

---

## 📝 Why Email Not Working

**Problem**: Both Gmail and Mailtrap credentials are invalid/expired

**Gmail Error**: `Invalid login: 535-5.7.8 Username and Password not accepted`
- App Password `bnoko uccl scxb wftw` is incorrect or expired
- You need to generate a fresh App Password

**Mailtrap Error**: `Invalid login: 535 5.7.0 Invalid credentials`
- Credentials `2c93b9e3a01b7a` / `e18c9b9c6d42e3` are invalid
- You may need to refresh Mailtrap credentials

**Solution**: Using console-based reset (works perfectly for development!)

---

## 🚀 Quick Fix to Get Email Working

**Best Option**: Generate a fresh Gmail App Password

1. Visit: https://myaccount.google.com/apppasswords
2. Generate new password
3. Copy it (it will look like: `xxxx xxxx xxxx xxxx`)
4. Update `.env`:
   ```env
   EMAIL_USER=alinalex441@gmail.com
   EMAIL_PASSWORD=xxxxxxxxxxxxxxxx
   ```
   (Remove spaces!)
5. Restart server
6. Test with: `node scripts/test_email.js`

---

## ✅ Current `.env` Configuration

```env
# Email disabled for development - uses console logging
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
```

**To enable email**: Set EMAIL_USER and EMAIL_PASSWORD with valid credentials

---

**Last Updated**: January 23, 2026  
**Status**: ✅ Forgot Password Working (Development Mode)
