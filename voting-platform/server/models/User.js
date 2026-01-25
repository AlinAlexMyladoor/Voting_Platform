const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
  
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


    password: {
      type: String,
      default: null,
    },

    provider: {
      type: String, 
      required: true,
      enum: ['google', 'linkedin', 'local'],
    },

    providerId: {
      type: String,
      default: null, 
    },

    profilePicture: {
      type: String, 
    },

    linkedin: {
      type: String,
      default: ''
    },

    votedAt: {
      type: Date,
      default: null,
    },

    
    hasVoted: {
      type: Boolean,
      default: false,
    },

    votedFor: {
      type: String,
      default: null,
    },

  
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
