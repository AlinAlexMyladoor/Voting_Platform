# Quick Start Guide - Forgot Password & Vote Status

## What Was Added

### 1. Vote Status Badge ✅
After a user votes, instead of just showing "Vote Recorded", they now see:
- **"✅ Voted Already"** badge with green styling
- Vote buttons completely disappear
- Much clearer indication that they've already voted

### 2. Forgot Password Feature 🔐
Users can now reset their password if they forget it by:
- Clicking "Forgot Password?" on the login page
- Entering their email address
- Receiving a password reset email
- Clicking the link in the email
- Setting a new password
- Password is automatically updated in the database

---

## To Get Forgot Password Working

### Step 1: Set Up Email Configuration

Edit `/server/.env` and add these lines:

**For Gmail (Recommended):**
```env
JWT_SECRET=my_super_secret_key_for_jwt
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
```

**How to get Gmail App Password:**
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click "Security" in the left menu
3. Enable "2-Step Verification" (if not already enabled)
4. Back on Security page, find "App passwords"
5. Select "Mail" and "Windows Computer"
6. Copy the 16-character password Google generates
7. Paste it as `EMAIL_PASSWORD` in `.env`

**For Other Email Providers:**
- Outlook: Use `smtp-mail.outlook.com` and port 587
- SendGrid: Use `smtp.sendgrid.net` and your API key
- Others: Update the SMTP details accordingly

### Step 2: Restart the Server

```bash
cd server
npm run dev
```

The server will now be able to send password reset emails!

---

## How It Works (User Perspective)

### Reset Password Flow:

1. **User is at login page**
   ```
   Login Page
   ├── Sign with Email
   ├── Forgot Password?
   └── Create Account
   ```

2. **Click "Sign in with Email"**
   - See email and password inputs
   - See "Forgot Password?" link

3. **Click "Forgot Password?"**
   - Enter email address
   - Click "Send Reset Link"
   - Success message: "Password reset link sent to your email!"

4. **User checks email**
   - Email from: `your_email@gmail.com`
   - Subject: "Password Reset Request"
   - Contains: Clickable button "Reset Password"

5. **Click email link**
   - Automatically redirects to login page
   - Shows "Set New Password" form
   - Fields: New Password, Confirm Password

6. **Enter new password**
   - Must be at least 6 characters
   - Passwords must match
   - Click "Reset Password"

7. **Success!**
   - Message: "Password reset successful! Redirecting to login..."
   - Back to main login page
   - Can now login with new password

---

## How It Works (Technical Details)

### Database Changes:
```javascript
User Schema now includes:
- resetToken: String (stores JWT token)
- resetTokenExpiry: Date (expires in 1 hour)
```

### Backend Routes:
```
POST /auth/forgot-password
- Input: { email }
- Generates JWT token valid 1 hour
- Sends email with reset link
- Returns: Success message

POST /auth/reset-password
- Input: { token, password }
- Validates token and expiry
- Hashes new password
- Updates database
- Clears token (single-use)
- Returns: Success message
```

### Security:
- ✅ Passwords hashed with bcryptjs
- ✅ Tokens expire in 1 hour
- ✅ Tokens are single-use only
- ✅ Password must be 6+ characters
- ✅ Email validation required
- ✅ Session-based security

---

## Testing the Feature

### Test Scenario 1: Send Reset Email
1. Go to `http://localhost:3000/login`
2. Click "Sign in with Email"
3. Click "Forgot Password?"
4. Enter your test email (e.g., `test@example.com`)
5. Click "Send Reset Link"
6. Check email inbox (or spam folder)
7. Should see email from your configured email address

### Test Scenario 2: Reset Password
1. Click the link in the email
2. You'll be redirected to reset password form
3. Enter new password (e.g., `newpass123`)
4. Confirm password
5. Click "Reset Password"
6. Success message appears
7. Try logging in with new credentials

### Test Scenario 3: Expired Token
1. Get reset link from email
2. Wait 1 hour (or modify token)
3. Try clicking the link
4. Should see: "Invalid or expired reset token"

---

## Troubleshooting

### Email not sending?
**Check 1:** Gmail credentials correct?
- Use `your_16_char_app_password` (NOT your regular password)
- Check spelling of email address

**Check 2:** Email enabled in `.env`?
- All four EMAIL_* variables set?
- JWT_SECRET set?

**Check 3:** Firewall blocking SMTP?
- Try changing port 587 to 465
- Or whitelist your email provider's IP

**Check 4:** Server logs**
```bash
cd server
npm run dev
# Look for error messages about email
```

### Reset link not working?
- **Expired?** Links only last 1 hour
- **Wrong token?** Make sure you copied full link from email
- **Wrong domain?** Currently set to `localhost:3000`

### Password not saving?
- **Too short?** Password must be 6+ characters
- **Not matching?** Passwords in both fields must be identical
- **MongoDB down?** Check database connection

---

## Production Checklist

Before deploying to production:

- [ ] Change `localhost:3000` to your actual domain
- [ ] Change `localhost:5000` to your actual domain
- [ ] Use production email credentials
- [ ] Enable HTTPS (use `secure: true` in transporter)
- [ ] Update port 587 to 465 if using SSL
- [ ] Set strong `JWT_SECRET`
- [ ] Never commit `.env` file
- [ ] Add rate limiting for password resets
- [ ] Test email delivery with real email
- [ ] Set up backup email provider

---

## File Reference

All changes are in these files:

**Frontend:**
- `client/src/Login.js` - All auth logic
- `client/src/Login.css` - Form styling
- `client/src/Dashboard.js` - Vote status display

**Backend:**
- `server/routes/auth.js` - All auth endpoints
- `server/models/User.js` - Reset token fields
- `server/.env` - Email configuration

**Dependencies Added:**
- `bcryptjs` - Password hashing
- `jsonwebtoken` - Reset tokens
- `nodemailer` - Email sending

---

## Next Steps

1. ✅ Update `.env` with email credentials
2. ✅ Test "Forgot Password" feature
3. ✅ Test voting and "Voted Already" badge
4. 📝 Optional: Customize email template
5. 📝 Optional: Add password strength requirements
6. 📝 Optional: Deploy to production

---

**Questions?** Check `FORGOT_PASSWORD_SETUP.md` for detailed setup guide!
