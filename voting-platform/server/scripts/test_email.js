require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n🔍 Testing Email Configuration...\n');

// Display current configuration (masked)
console.log('📧 Current Email Settings:');
console.log('━'.repeat(50));
console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? `${process.env.EMAIL_PASSWORD.substring(0, 4)}****` : 'NOT SET');
console.log('━'.repeat(50));

// Check if credentials are set
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('\n❌ ERROR: Email credentials not configured!');
  console.log('\nPlease set EMAIL_USER and EMAIL_PASSWORD in your .env file');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test 1: Verify connection
console.log('\n📡 Test 1: Verifying SMTP connection...');
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Connection Failed:', error.message);
    console.log('\n🔧 Possible Solutions:');
    console.log('1. Check if EMAIL_USER and EMAIL_PASSWORD are correct');
    console.log('2. For Gmail, enable "App Passwords": https://myaccount.google.com/apppasswords');
    console.log('3. App Password should be 16 characters without spaces (e.g., abcdabcdabcdabcd)');
    console.log('4. Make sure "Less secure app access" is enabled (if not using App Password)');
    console.log('5. Check if your account has 2FA enabled (requires App Password)');
    
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  Authentication Error: Invalid credentials');
      console.log('   Your password might be incorrect or expired');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n⚠️  Connection Error: Cannot reach SMTP server');
      console.log('   Check your internet connection and firewall settings');
    }
    
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!\n');
    
    // Test 2: Send test email
    console.log('📧 Test 2: Sending test email...');
    
    const mailOptions = {
      from: `"Voting Platform Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self
      subject: '✅ Test Email - Voting Platform',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007bff;">✅ Email Configuration Successful!</h1>
          <p>This is a test email from your Voting Platform application.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">
            Sent at: ${new Date().toLocaleString()}<br>
            From: ${process.env.EMAIL_USER}<br>
            SMTP Host: ${process.env.EMAIL_HOST}<br>
            SMTP Port: ${process.env.EMAIL_PORT}
          </p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('\nError details:', error);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        console.log('📧 Check your inbox at:', process.env.EMAIL_USER);
        console.log('\n🎉 Email configuration is working properly!\n');
      }
    });
  }
});
