# 📧 Email Configuration Guide - Forgot Password Setup

## Issue: Emails Not Being Sent

The forgot password feature requires proper email configuration. Follow this guide to fix the issue.

---

## 🔍 Current Problem

Your `.env` file shows:
```
EMAIL_PASSWORD=bpddyfbihzhbmniyr
```

This password format looks incorrect for Gmail App Passwords.

---

## ✅ Solution: Set Up Gmail App Password

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled
4. Follow the prompts to set it up

### Step 2: Generate App Password

1. After 2FA is enabled, go to: https://myaccount.google.com/apppasswords
2. Sign in if prompted
3. Select:
   - **App**: Mail
   - **Device**: Other (Custom name) → Type "Voting Platform"
4. Click **Generate**
5. Copy the **16-character password** (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Update Your .env File

Open `/server/.env` and update:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=alinalex441@gmail.com
EMAIL_PASSWORD=xxxxxxxxxxxxxxxx
```

**Important:**
- Remove ALL spaces from the App Password
- It should be exactly 16 lowercase letters
- Example: `abcdabcdabcdabcd`

---

## 🧪 Testing Your Configuration

### Quick Test (Recommended)

Run the test script:

```bash
cd server
node scripts/test_email.js
```

This will:
1. ✅ Verify your SMTP connection
2. ✅ Send a test email to yourself
3. ✅ Show detailed error messages if something fails

### Expected Output (Success)

```
🔍 Testing Email Configuration...

📧 Current Email Settings:
EMAIL_HOST: smtp.gmail.com
EMAIL_PORT: 587
EMAIL_USER: alinalex441@gmail.com
EMAIL_PASSWORD: abcd****

📡 Test 1: Verifying SMTP connection...
✅ SMTP Connection Successful!

📧 Test 2: Sending test email...
✅ Test email sent successfully!
📬 Message ID: <xxx@gmail.com>
📧 Check your inbox at: alinalex441@gmail.com

🎉 Email configuration is working properly!
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Problem:** Wrong password or App Password not set up

**Solution:**
1. Generate a new App Password (see Step 2 above)
2. Copy it WITHOUT spaces
3. Update `.env` file
4. Restart your server

### Issue 2: "Less secure app access" error

**Problem:** Trying to use regular Gmail password

**Solution:**
- Don't use your regular Gmail password
- Always use App Passwords for applications
- App Passwords bypass "less secure app" restrictions

### Issue 3: Connection timeout or ECONNECTION

**Problem:** Firewall or network issue

**Solution:**
1. Check your internet connection
2. Disable firewall temporarily to test
3. Try port 465 (secure) instead of 587:
   ```env
   EMAIL_PORT=465
   ```
   And update code to use `secure: true`

### Issue 4: "Self-signed certificate" error

**Problem:** SSL/TLS certificate verification

**Solution:**
Already fixed in the updated code with:
```javascript
tls: {
  rejectUnauthorized: false
}
```

---

## 📝 Updated Code Features

The code has been updated with:

✅ **Better Error Handling**
- Detailed error messages
- Specific error codes (EAUTH, ECONNECTION, etc.)
- Fallback to console logging if email fails

✅ **Connection Verification**
- Tests SMTP connection on server startup
- Shows configuration status in console

✅ **Enhanced Email Template**
- Professional HTML email design
- Clear call-to-action button
- Mobile-responsive layout

✅ **Better Logging**
- Success/failure messages with emojis
- Message IDs for tracking
- Detailed error information

---

## 🚀 Quick Start Checklist

- [ ] Enable 2FA on Google Account
- [ ] Generate App Password
- [ ] Update `EMAIL_PASSWORD` in `.env` (no spaces, 16 chars)
- [ ] Save `.env` file
- [ ] Restart server: `npm run dev`
- [ ] Run test: `node scripts/test_email.js`
- [ ] Check server logs for "✅ Email server is ready"
- [ ] Test forgot password on the login page

---

## 🔐 Security Notes

1. **Never commit `.env` file** to git
2. **App Passwords** are safer than regular passwords
3. **Rotate passwords** periodically
4. **Revoke unused** App Passwords from Google Account

---

## 🆘 Still Not Working?

### Alternative: Use Mailtrap (Development)

For development/testing, use Mailtrap:

1. Sign up at: https://mailtrap.io/
2. Get your credentials from the SMTP settings
3. Update `.env`:

```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_username
EMAIL_PASSWORD=your_mailtrap_password
```

### Alternative: Use SendGrid (Production)

For production, consider SendGrid:

1. Sign up at: https://sendgrid.com/
2. Generate API key
3. Install: `npm install @sendgrid/mail`
4. Use SendGrid SDK instead of nodemailer

---

## 📞 Need Help?

Check the server logs when you test forgot password:
- Look for 🔗 reset URLs
- Look for ✅ success messages
- Look for ❌ error messages
- Check email error codes

The logs will tell you exactly what's wrong!

---

## ✨ Testing the Feature

1. **Start Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Look for this message:**
   ```
   ✅ Email server is ready to send messages
   ```

3. **Test Forgot Password:**
   - Go to: http://localhost:3000/login
   - Click "Forgot Password?"
   - Enter: alinalex441@gmail.com
   - Click "Send Reset Link"
   - Check your email inbox

4. **Check Server Console:**
   - Should see: `✅ Password reset email sent successfully`
   - Should see: `📧 Message ID: <...>`

---

**Last Updated:** January 23, 2026
