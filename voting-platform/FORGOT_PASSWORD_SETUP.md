# Forgot Password Setup Guide

## Overview
The forgot password feature allows users to reset their password via email. When a user clicks "Forgot Password", they receive an email with a reset link that expires in 1 hour.

## Setup Instructions

### 1. Gmail Configuration (Recommended)

To use Gmail for sending emails, you need to generate an App Password:

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security** (left sidebar)
3. Enable **2-Step Verification** if not already enabled
4. Go back to Security and find **App passwords** (appears after 2FA is enabled)
5. Select **Mail** and **Windows Computer** (or your device type)
6. Google will generate a 16-character password
7. Copy this password and use it in your `.env` file

### 2. Update .env File

Edit `/server/.env` and update these fields with your Gmail credentials:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
JWT_SECRET=your_jwt_secret_key_change_this_in_production
```

**Important:** Never commit `.env` to version control. Keep credentials private!

### 3. Alternative Email Providers

You can also use other email providers by updating the transporter configuration:

```javascript
// For Outlook/Office 365
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
});

// For SendGrid
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.EMAIL_PASSWORD, // Your SendGrid API key
  }
});
```

## How It Works

### User Flow:

1. **User enters email** → Clicks "Send Reset Link"
2. **Server validates email** → Generates JWT token (valid for 1 hour)
3. **Email is sent** → Contains reset link with token in URL
4. **User clicks link** → App detects token and shows password reset form
5. **User enters new password** → Verified and updated in database
6. **Password is hashed** → Stored securely using bcryptjs

### Database Fields:

The User model now includes:
- `resetToken`: Stores the JWT token
- `resetTokenExpiry`: Token expiration time

After successful reset, both fields are cleared.

## Testing

### Manual Test:

1. Go to login page
2. Click "Sign in with Email" → "Forgot Password?"
3. Enter your test email address
4. Check your email inbox for the reset link
5. Click the link and enter a new password
6. You should be able to login with the new password

### Test Credentials Setup:

If you want to test without a real email:

1. Create a test Gmail account
2. Generate an App Password (follow steps above)
3. Add those credentials to `.env`
4. Test the flow

## Troubleshooting

### Email not sending?

1. **Check credentials in `.env`**
   - Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct
   - For Gmail: Use the 16-character app password, NOT your regular password

2. **Check firewall/network**
   - Port 587 must be open for SMTP
   - Some networks block SMTP - try port 465 (SSL) if 587 doesn't work

3. **Enable "Less secure apps"** (older Gmail accounts)
   - Go to [myaccount.google.com/lesssecureapps](https://myaccount.google.com/lesssecureapps)
   - Toggle ON (note: this is less secure, use App Password method instead)

4. **Check server logs**
   - Run `npm run dev` in `/server` directory
   - Look for error messages related to email

### Reset link not working?

1. **Check token expiry** - Links expire after 1 hour
2. **Verify JWT_SECRET** - Must match between token generation and verification
3. **Check database** - Ensure resetToken fields are being saved

### Password not updating?

1. **Check password validation** - Must be at least 6 characters
2. **Verify database connection** - Check MongoDB connection
3. **Check bcryptjs installation** - Run `npm install bcryptjs` in `/server`

## Security Notes

- Passwords are hashed using bcryptjs (10 salt rounds)
- Reset tokens expire after 1 hour
- Tokens are single-use (cleared after reset)
- Never store plain-text passwords
- Email credentials should be environment variables only

## Production Deployment

Before deploying to production:

1. Change all credentials to production values
2. Update `localhost:3000` URLs to your actual domain
3. Use a proper email service (SendGrid, AWS SES, etc.)
4. Enable HTTPS
5. Keep `.env` file secure and never commit it
6. Consider rate-limiting password reset attempts

## Files Modified

- `server/models/User.js` - Added resetToken and resetTokenExpiry fields
- `server/routes/auth.js` - Added forgot-password and reset-password endpoints
- `server/.env` - Added EMAIL_* and JWT_SECRET variables
- `client/src/Login.js` - Added forgot password UI and email submission
- `client/src/Login.css` - Added styling for password reset forms
