const router = require("express").Router();
const User = require("../models/User");
const Candidate = require("../models/Candidate");

// Middleware: Check Login
const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  return res.status(401).json({ message: "Login required" });
};

// 1. Get all candidates
router.get("/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find();
    // Compute authoritative vote counts from user records to avoid drift
    const normalized = await Promise.all(candidates.map(async (c) => {
      const obj = c.toObject ? c.toObject() : c;
      const votes = await User.countDocuments({ votedFor: obj._id });
      return { ...obj, votes };
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch candidates" });
  }
});

// 2. Get list of voters (users who voted)
router.get("/voters", async (req, res) => {
  try {
    // Return a minimal public view of voters
    const users = await User.find({ hasVoted: true })
      .select("name profilePicture votedAt linkedin")
      .sort({ votedAt: -1 });
    
    const voters = users.map(u => ({
      _id: u._id,
      name: u.name,
      profilePicture: u.profilePicture || '',
      votedAt: u.votedAt,
      linkedin: u.linkedin || '' // Return actual LinkedIn URL
    }));
    res.json(voters);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch voters" });
  }
});

// 2b. Redirect to a user's LinkedIn profile without exposing the URL in API
router.get('/linkedin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('linkedin name');
    
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    if (!user.linkedin) {
      return res.status(404).send('LinkedIn profile not found');
    }

    // Don't leak referrer and perform a server-side redirect
    res.set('Referrer-Policy', 'no-referrer');
    return res.redirect(user.linkedin);
  } catch (err) {
    console.error('LinkedIn redirect error:', err);
    return res.status(500).send('Server error');
  }
});

// 3. Update LinkedIn Profile
router.post("/update-linkedin", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ message: "LinkedIn URL is required" });
    }

    // Basic validation for LinkedIn URL
    const linkedinUrlPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/.+$/i;
    if (!linkedinUrlPattern.test(url.trim())) {
      return res.status(400).json({ message: "Please enter a valid LinkedIn URL" });
    }

    await User.findByIdAndUpdate(userId, { 
      linkedin: url.trim() 
    });

    res.json({ 
      success: true, 
      message: "LinkedIn profile updated successfully" 
    });

  } catch (err) {
    console.error("Update LinkedIn Error:", err);
    res.status(500).json({ message: "Failed to update LinkedIn profile" });
  }
});

// 4. Cast Vote
router.post("/vote/:candidateId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { candidateId } = req.params;

    const user = await User.findById(userId);
    if (user.hasVoted) {
      return res.status(400).json({ message: "You have already cast your vote!" });
    }

    // Atomic Update: Save user and increment candidate.voteCount
    await Promise.all([
      User.findByIdAndUpdate(userId, { 
        hasVoted: true, 
        votedAt: new Date(),
        votedFor: candidateId 
      }),
      Candidate.findByIdAndUpdate(candidateId, { 
        $inc: { voteCount: 1 } 
      })
    ]);

    // FETCH UPDATED DATA
    const [updatedCandidates, updatedUsers] = await Promise.all([
      Candidate.find(),
      User.find({ hasVoted: true })
        .select("name profilePicture votedAt linkedin") 
        .sort({ votedAt: -1 })
    ]);

    // Recompute authoritative votes from users (prevents drift)
    const normalized = await Promise.all(updatedCandidates.map(async (c) => {
      const obj = c.toObject ? c.toObject() : c;
      const votes = await User.countDocuments({ votedFor: obj._id });
      return { ...obj, votes };
    }));

    // Format voters with linkedin URL
    const updatedVoters = updatedUsers.map(u => ({
      _id: u._id,
      name: u.name,
      profilePicture: u.profilePicture || '',
      votedAt: u.votedAt,
      linkedin: u.linkedin || '' // Return actual LinkedIn URL
    }));

    res.status(200).json({ 
      success: true, 
      candidates: normalized,
      voters: updatedVoters
    });

  } catch (err) {
    console.error("Voting Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;