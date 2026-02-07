// Updated: 2026-02-07 - Session fixes applied
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const axios = require('axios');
const User = require('./models/User');

passport.serializeUser((user, done) => {
  console.log('🔐 Serializing user:', user.name, 'ID:', user._id || user.id);
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('🔓 Deserializing user ID:', id);
    const user = await User.findById(id);
    if (!user) {
      console.error('❌ User not found during deserialization:', id);
      return done(null, false);
    }
    console.log('✅ User deserialized:', user.name);
    // Return the full user object with all necessary fields
    done(null, {
      id: user._id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      profilePicture: user.profilePicture,
      linkedin: user.linkedin,
      hasVoted: user.hasVoted,
      votedAt: user.votedAt,
      votedFor: user.votedFor
    });
  } catch (err) {
    console.error('❌ Deserialization error:', err);
    done(err, null);
  }
});

// --- GOOGLE STRATEGY ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://e-ballotserver.vercel.app/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ providerId: profile.id });
      if (user) return done(null, user);

      const userEmail = (profile.emails && profile.emails.length > 0) 
        ? profile.emails[0].value 
        : undefined;

      if (userEmail) {
        user = await User.findOne({ email: userEmail });
        if (user) return done(null, user);
      }

      const newUser = await new User({
        name: profile.displayName,
        email: userEmail || "no-email@google.com",
        provider: 'google',
        providerId: profile.id,
        profilePicture: (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : "",
        linkedin: '',
        hasVoted: false
      }).save();
      
      done(null, newUser);
    } catch (err) { 
      console.error("Google Auth Error:", err);
      done(err, null); 
    }
  }
));

// --- LINKEDIN STRATEGY ---
passport.use('linkedin', new OAuth2Strategy({
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL || "https://e-ballotserver.vercel.app/auth/linkedin/callback",
    scope: ['openid', 'profile', 'email', 'w_member_social'],
    state: true
  },
  async (accessToken, refreshToken, emptyProfile, done) => {
    try {
      // Fetch user info and profile data from LinkedIn
      const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      const profile = userinfoResponse.data;
      const providerId = profile.sub; 
      const name = profile.name || "LinkedIn User";
      const email = profile.email;
      const picture = profile.picture || "";
      
      // Extract LinkedIn profile URL from various possible fields
      const linkedinUrl = profile.profile || 
                         profile.publicProfileUrl || 
                         profile.vanityName ? `https://linkedin.com/in/${profile.vanityName}` : '';
      
      console.log('LinkedIn Login - Full Profile Data:', profile);
      console.log('LinkedIn Profile URL:', linkedinUrl || 'Not found in response');

      let existingUser = await User.findOne({ providerId: providerId });
      if (existingUser) {
        // Update profile picture and LinkedIn URL if available
        if (picture && existingUser.profilePicture !== picture) {
          existingUser.profilePicture = picture;
        }
        if (linkedinUrl && !existingUser.linkedin) {
          existingUser.linkedin = linkedinUrl;
        }
        await existingUser.save();
        return done(null, existingUser);
      }

      if (email) {
        existingUser = await User.findOne({ email: email });
        if (existingUser) {
          // Update existing user with LinkedIn data
          existingUser.provider = 'linkedin';
          existingUser.providerId = providerId;
          if (picture) existingUser.profilePicture = picture;
          if (linkedinUrl && !existingUser.linkedin) {
            existingUser.linkedin = linkedinUrl;
          }
          await existingUser.save();
          return done(null, existingUser);
        }
      }

      const newUser = await new User({
        name: name,
        email: email || `${providerId}@linkedin.com`,
        provider: 'linkedin',
        providerId: providerId,
        profilePicture: picture,
        linkedin: linkedinUrl, // Save LinkedIn profile URL if provided
        hasVoted: false
      }).save();
      
      console.log(`✅ New LinkedIn user created: ${name}`);
      if (linkedinUrl) {
        console.log(`   LinkedIn Profile: ${linkedinUrl}`);
      } else {
        console.log(`   User can add their LinkedIn URL via the dashboard`);
      }
      
      done(null, newUser);
    } catch (err) {
      console.error("LinkedIn Manual Auth Error:", err.message);
      done(err, null);
    }
  }
));

module.exports = passport;