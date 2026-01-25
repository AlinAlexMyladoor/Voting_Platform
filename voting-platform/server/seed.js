// server/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Candidate = require('./models/Candidate');

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to DB for seeding'))
  .catch(err => console.log(err));

// The 2 Candidates Data
const candidates = [
  {
    name: "Candidate A",
    linkedinUrl: "https://www.linkedin.com/in/candidate-a",
    party: "Progressive Party",
    team: "White Matrix Team",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=CandidateA",
    voteCount: 0
  },
  {
    name: "Candidate B",
    linkedinUrl: "https://www.linkedin.com/in/candidate-b",
    party: "Innovation Party",
    team: "White Matrix Team",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=CandidateB",
    voteCount: 0
  }
];

const seedDB = async () => {
  // Clear existing candidates to avoid duplicates
  await Candidate.deleteMany({});
  // Insert new ones
  await Candidate.insertMany(candidates);
  console.log("Database Seeded with 2 Candidates!");
  mongoose.connection.close();
};

seedDB();