// server/models/Candidate.js
const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  linkedinUrl: {
    type: String,
    required: true,
  },
  party: {
    type: String,
    default: "Independent",
  },
  team: {
    type: String,
    default: "White Matrix Team",
  },
  img: {
    type: String,
    default: "",
  },
  // We will increment this number when someone votes for them
  voteCount: {
    type: Number,
    default: 0,
  }
});

module.exports = mongoose.model('Candidate', CandidateSchema);