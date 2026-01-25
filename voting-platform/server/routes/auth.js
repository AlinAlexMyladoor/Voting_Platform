const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates (for development)
  }
});

// Verify transporter configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email transporter configuration error:', error.message);
    console.log('📧 Email credentials status:', {
      EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing',
      EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
      EMAIL_PORT: process.env.EMAIL_PORT || 587
    });
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// ====================
// Google OAuth Routes
// ====================
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`,
  }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`);
  }
);

// ====================
// LinkedIn OAuth Routes
// ====================
router.get(
  '/linkedin',
  passport.authenticate('linkedin', {
    scope: ['openid', 'profile', 'email'],
  })
);

router.get(
  '/linkedin/callback',
  passport.authenticate('linkedin', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`,
  }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`);
  }
);

// ====================
// Local Registration
// ====================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      provider: 'local',
      profilePicture: '',
      linkedin: '',
      votedAt: null,
    });

    await user.save();

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Login after registration failed' });
      }
      res.status(201).json({ message: 'Registration successful', user });
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration error' });
  }
});

// ====================
// Local Login
// ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Login failed' });
      }
      res.json({ message: 'Login successful', user });
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

// ====================
// Forgot Password
// ====================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Security: do not reveal user existence
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        message: 'If the email exists, a reset link will be sent',
      });
    }

    // Check if user registered with local provider
    if (user.provider !== 'local') {
      console.log(`Password reset requested for OAuth user: ${email} (provider: ${user.provider})`);
      return res.status(400).json({ 
        message: `This account was created using ${user.provider}. Please sign in with ${user.provider} instead.` 
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?resetToken=${token}`;

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email credentials not configured. Logging reset URL to console for development.');
      console.log(`\n🔗 Password reset URL for ${user.email}:\n${resetUrl}\n`);
      return res.json({ 
        message: 'Development mode: Check server console for reset link',
        resetUrl: resetUrl // Only in development
      });
    }

    // Try to send email
    try {
      const info = await transporter.sendMail({
        from: `"Voting Platform" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Reset Request - Voting Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello ${user.name},</p>
                <p>We received a request to reset your password for your Voting Platform account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
              <div class="footer">
                <p>Voting Platform &copy; ${new Date().getFullYear()}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`✅ Password reset email sent successfully to ${user.email}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      
      res.json({ 
        message: 'Password reset email sent successfully. Please check your inbox.' 
      });

    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      console.error('Email error details:', {
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        responseCode: emailError.responseCode
      });

      // Fallback: log URL to console
      console.log(`\n🔗 Fallback - Password reset URL for ${user.email}:\n${resetUrl}\n`);

      // Still return success to user for security, but with a hint
      return res.json({ 
        message: 'If the email exists, a reset link will be sent. If you don\'t receive it, please contact support.',
        resetUrl: resetUrl // Include URL in development for debugging
      });
    }

  } catch (err) {
    console.error('❌ Forgot-password error:', err);
    res.status(500).json({ 
      message: 'An error occurred while processing your request. Please try again.' 
    });
  }
});

// ====================
// Reset Password
// ====================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || password.length < 6) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalid or expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset error' });
  }
});

// ====================
// Auth Status
// ====================
router.get('/login/success', (req, res) => {
  if (req.user) {
    return res.json({ success: true, user: req.user });
  }
  res.status(401).json({ success: false });
});

// ====================
// Logout
// ====================
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/`);
    });
  });
});

module.exports = router;
