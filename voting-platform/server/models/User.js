const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // Basic user info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password (null for OAuth users)
    password: {
      type: String,
      default: null,
    },

    // OAuth related fields
    provider: {
      type: String, // 'google', 'linkedin', 'local'
      required: true,
      enum: ['google', 'linkedin', 'local'],
    },

    providerId: {
      type: String,
      default: null, // null for local users
    },

    profilePicture: {
      type: String, // URL to profile photo
    },

    // Social links
    linkedin: {
      type: String,
      default: ''
    },

    // When the user cast their vote
    votedAt: {
      type: Date,
      default: null,
    },

    // Voting logic
    hasVoted: {
      type: Boolean,
      default: false,
    },

    votedFor: {
      type: String,
      default: null,
    },

    // Password reset (merged fields)
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
