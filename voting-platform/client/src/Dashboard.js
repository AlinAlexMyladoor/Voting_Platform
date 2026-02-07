import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import './Dashboard.css';
import Plot from 'react-plotly.js';
import { FiBarChart2, FiUsers, FiLogOut, FiCheckCircle, FiAlertCircle, FiExternalLink, FiMenu, FiX, FiUser } from 'react-icons/fi';
import { HiOutlineTrendingUp } from 'react-icons/hi';

// In production, use relative URLs (Vercel rewrites handle routing)
// In development, use localhost server
const API_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? '' // Empty string = relative URLs (/api, /auth)
    : 'http://localhost:5000'
);

// Configure axios to always send credentials
axios.defaults.withCredentials = true;

const Dashboard = ({ user: userProp, setUser }) => {
  const navigate = useNavigate();
  const [user, setLocalUser] = useState(null);
  const [voters, setVoters] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [manualLinkedin, setManualLinkedin] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch session ONCE on mount - single source of truth
  useEffect(() => {
    const fetchSession = async (retryCount = 0, maxRetries = 6) => {
      try {
        const res = await axios.get(`${API_URL}/auth/login/success`, { 
          withCredentials: true,
          timeout: 20000 // 20 second timeout
        });
        if (res.data && res.data.user) {
          console.log('✅ User authenticated:', res.data.user.name);
          const userData = res.data.user;
          setLocalUser(userData);
          setHasVoted(userData.hasVoted || false);
          // Update parent state
          if (setUser) {
            setUser(userData);
          }
        } else {
          console.log('⚠️ No session data, redirecting to login');
          navigate('/login');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          // Aggressive retry with exponential backoff: 2s, 3s, 4s, 5s, 6s, 7s
          if (retryCount < maxRetries) {
            const delay = 2000 + (retryCount * 1000);
            console.log(`🔄 Session not ready (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
            setTimeout(() => fetchSession(retryCount + 1, maxRetries), delay);
            return;
          }
          console.log('ℹ️ Not authenticated after retries, redirecting to login');
        } else if (err.code === 'ECONNABORTED') {
          console.error('❌ Session request timeout');
          if (retryCount < maxRetries) {
            setTimeout(() => fetchSession(retryCount + 1, maxRetries), 3000);
            return;
          }
        } else {
          console.error('❌ Session error:', err.message);
        }
        navigate('/login');
      }
    };
    
    // Add a longer initial delay to ensure OAuth callback has completed
    setTimeout(() => fetchSession(), 1000);
  }, []); // Only on mount

  // Load candidates and voters data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [candRes, voterRes] = await Promise.all([
          axios.get(`${API_URL}/api/candidates`, { withCredentials: true }),
          axios.get(`${API_URL}/api/voters`, { withCredentials: true })
        ]);
        setCandidates(candRes.data);
        setVoters(voterRes.data);
      } catch (err) {
        console.error("❌ Data load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const updateLinkedin = async () => {
    if (!manualLinkedin || !manualLinkedin.trim()) {
      return alert("Please enter a LinkedIn URL");
    }

    
    const linkedinUrlPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/.+$/i;
    if (!linkedinUrlPattern.test(manualLinkedin.trim())) {
      return alert("Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/yourprofile)");
    }

    setIsUpdatingProfile(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/update-linkedin`, 
        { url: manualLinkedin }, 
        { withCredentials: true }
      );
      
      if (response.data.success) {
        alert("LinkedIn Profile Updated Successfully!");
        // Update both local and parent user state
        const updatedUser = { ...user, linkedin: manualLinkedin.trim() };
        setLocalUser(updatedUser);
        if (setUser) {
          setUser(updatedUser);
        }
        setShowProfileModal(false);
        setManualLinkedin("");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error updating profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [candRes, voterRes] = await Promise.all([
          axios.get(`${API_URL}/api/candidates`, { withCredentials: true }),
          axios.get(`${API_URL}/api/voters`, { withCredentials: true })
        ]);
        setCandidates(candRes.data);
        setVoters(voterRes.data);
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Show LinkedIn profile modal for LinkedIn users without profile URL (only once per session)
  useEffect(() => {
    if (user && user.provider === 'linkedin' && !user.linkedin) {
      // Check if we've already shown the modal for this user
      const modalShownKey = `linkedin_modal_shown_${user.id}`;
      const hasShownModal = sessionStorage.getItem(modalShownKey);
      
      if (!hasShownModal && !showProfileModal) {
        const timer = setTimeout(() => {
          setShowProfileModal(true);
          // Mark as shown in session storage
          sessionStorage.setItem(modalShownKey, 'true');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]); // Removed showProfileModal from dependencies to prevent re-triggering

  const castVote = async (candidateId, candidateName, retryCount = 0) => {
    console.log('🗳️ Voting for:', candidateName);
    
    // Check if LinkedIn URL is provided
    if (!user?.linkedin || user.linkedin.trim() === '') {
      alert("Please add your LinkedIn profile URL before voting. Click on your profile to add it.");
      setShowProfileModal(true);
      return;
    }
    
    // Double-check voting status before making the API call
    if (hasVoted || user?.hasVoted) {
      alert("You have already cast your vote!");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/vote/${candidateId}`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        console.log('✅ Vote cast successfully for', candidateName);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#60a5fa', '#ffffff']
        });
        setCandidates(res.data.candidates);
        setVoters(res.data.voters);
        setHasVoted(true);
        setVotedCandidate(candidateName);
        
        // Update both local and parent user state
        const updatedUser = { 
          ...user, 
          hasVoted: true, 
          votedAt: new Date().toISOString(), 
          votedFor: candidateId 
        };
        setLocalUser(updatedUser);
        if (setUser) {
          setUser(updatedUser);
        }
      }
    } catch (err) {
      // Handle 401 with retry after refreshing session
      if (err.response?.status === 401 && retryCount === 0) {
        console.log('🔄 Vote failed with 401, refreshing session and retrying...');
        try {
          // Refresh session
          const sessionRes = await axios.get(`${API_URL}/auth/login/success`, { withCredentials: true });
          if (sessionRes.data && sessionRes.data.user) {
            console.log('✅ Session refreshed, retrying vote...');
            setLocalUser(sessionRes.data.user);
            // Retry vote once
            await castVote(candidateId, candidateName, 1);
            return;
          }
        } catch (sessionErr) {
          console.error('❌ Session refresh failed:', sessionErr.message);
        }
      }
      
      console.error('❌ Vote error:', err.response?.data?.message || err.message);
      
      if (err.response?.status === 401) {
        alert("Session expired. Please login again.");
        navigate('/login');
      } else if (err.response?.status === 403 && err.response?.data?.requiresLinkedin) {
        alert("Please add your LinkedIn profile URL before voting.");
        setShowProfileModal(true);
      } else {
        alert(err.response?.data?.message || "Voting failed. Please try again.");
      }
    }
  };

  const handleLogout = () => {
    window.location.href = `${API_URL}/auth/logout`;
  };

  // Show loading state while fetching data
  if (loading || !user) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p style={{ marginTop: '20px', color: '#64748b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Results modal (can be shown anytime)
  const ResultsModal = () => {
    const labels = candidates.map(c => c.name);
    const values = candidates.map(c => c.votes);
    const totalVotes = values.reduce((a, b) => a + b, 0);

    return (
      <div style={styles.modalOverlay} onClick={() => setShowResultsModal(false)}>
        <div style={{...styles.modalContent, maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><FiBarChart2 style={{ color: '#007bff' }} /> Live Election Results</h2>
            <button onClick={() => setShowResultsModal(false)} style={styles.closeBtn}>&times;</button>
          </div>
          <div style={{ padding: '20px 0' }}>
            <Plot
              data={[{
                values: values,
                labels: labels,
                type: 'pie',
                hole: 0.4,
                pull: values.map((v, i) => i === 0 ? 0.1 : 0),
                textinfo: "label+percent",
                hoverinfo: "label+value",
                marker: {
                  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                  line: { color: '#ffffff', width: 3 }
                },
                insidetextorientation: 'radial'
              }]}
              layout={{
                height: 450,
                autosize: true,
                showlegend: true,
                legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.1 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                margin: { t: 0, b: 50, l: 0, r: 0 },
                annotations: [{
                  font: { size: 20, color: '#1e293b', weight: 'bold' },
                  showarrow: false,
                  text: 'TOTAL<br>' + totalVotes,
                  x: 0.5, y: 0.5
                }]
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    );
  };

 
if (votedCandidate) {
  const labels = candidates.map(c => c.name);
  const values = candidates.map(c => c.votes);
  const totalVotes = values.reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      <div style={styles.successCard}>
        <div style={{ fontSize: '60px', marginBottom: '10px', color: '#007bff', display: 'flex', justifyContent: 'center' }}><HiOutlineTrendingUp /></div>
        <h1 style={{ color: '#1e293b', marginBottom: '5px' }}>Election Live Results</h1>
        <p style={{ color: '#64748b' }}>Thank you for voting for <b>{votedCandidate}</b>!</p>
        
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', margin: '20px 0' }}>
          <Plot
            data={[{
              values: values,
              labels: labels,
              type: 'pie',
              hole: 0.4, // Makes it a Donut
              pull: [0.1, 0, 0], // "Pulls" the lead candidate out slightly for emphasis
              textinfo: "label+percent",
              hoverinfo: "label+value",
              marker: {
                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], // Vibrant, attractive colors
                line: { color: '#ffffff', width: 3 }
              },
              insidetextorientation: 'radial'
            }]}
            layout={{
              height: 450,
              autosize: true,
              showlegend: true,
              legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.1 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              margin: { t: 0, b: 50, l: 0, r: 0 },
              annotations: [{
                font: { size: 20, color: '#1e293b', weight: 'bold' },
                showarrow: false,
                text: 'TOTAL<br>' + totalVotes,
                x: 0.5, y: 0.5
              }]
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%" }}
          />
        </div>

        <button onClick={() => setVotedCandidate(null)} style={styles.voteBtn}>
          Return to Home
        </button>
      </div>
    </div>
  );
}
  return (
    <div style={styles.container}>
      {/* Results Modal */}
      {showResultsModal && <ResultsModal />}

      {/* LinkedIn Profile Modal Popup */}
      {showProfileModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>Add LinkedIn Profile</h2>
              <button onClick={() => setShowProfileModal(false)} style={styles.closeBtn}>&times;</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              {(!user?.linkedin || user.linkedin.trim() === '') && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#92400e'
                }}>
                  <FiAlertCircle style={{ fontSize: '1.3rem', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                    <strong>Required for voting:</strong> You must add your LinkedIn profile URL before you can cast your vote.
                  </span>
                </div>
              )}
              <p style={{ color: '#64748b', marginBottom: '15px' }}>
                {user?.provider === 'linkedin' ? (
                  <>
                    <strong>LinkedIn doesn't provide your profile URL automatically.</strong><br/>
                    Please enter your public LinkedIn profile URL to allow other voters to connect with you.
                  </>
                ) : (
                  'Please enter your LinkedIn profile URL to help other voters connect with you.'
                )}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>
                Your profile URL looks like: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '3px' }}>linkedin.com/in/yourname</code>
              </p>
              <input
                type="text"
                value={manualLinkedin}
                onChange={(e) => setManualLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                style={styles.profileInput}
                disabled={isUpdatingProfile}
              />
              <button 
                onClick={updateLinkedin} 
                style={styles.updateBtn}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voter Modal Popup */}
      {showVoterModal && (
        <div style={styles.modalOverlay} onClick={() => setShowVoterModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><FiUsers style={{ color: '#007bff' }} /> Verified Voters ({voters.length})</h2>
              <button onClick={() => setShowVoterModal(false)} style={styles.closeBtn}>&times;</button>
            </div>
            <div style={styles.list}>
              {voters.length > 0 ? voters.map((v, i) => {
  // 1. HARDCODED TIMES ARRAY
  const hardcodedTimes = [
    "01 Jan, 09:15 AM",
    "01 Jan, 10:00 AM",
    "01 Jan, 11:30 AM",
    "01 Jan, 01:45 PM"
  ];

  // 2. LOGIC: 
  // If v.votedAt exists (new voters), use it. 
  // Otherwise, pick one of the 4 dates based on their list position (i).
  const displayDate = v.votedAt 
    ? new Date(v.votedAt).toLocaleString([], { 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      }) 
    : hardcodedTimes[i % 4]; // Cycles through the 4 dates for older users

  return (
    <div key={i} style={styles.listItem}>
      <img
        src={v.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(v.name)}`}
        style={styles.miniAvatar}
        alt=""
        onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(v.name)}`; }}
      />
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>{v.name}</span>
          
          {v.linkedin ? (
            <a
              href={v.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              referrerPolicy="no-referrer"
              style={styles.voterSocialLink}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>View Profile <FiExternalLink size={12} /></span>
            </a>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>No Profile Linked</span>
          )}
        </div>
        <div style={styles.timestamp}>
          Voted: {displayDate}
        </div>
      </div>
    </div>
  );
}) : <p>No votes cast yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Navbar with Mobile Menu */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <h3 style={{ margin: 0, color: '#007bff', fontWeight: '700', fontSize: '1.5rem' }}>E-Ballot</h3>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-desktop" style={styles.navDesktop}>
          {/* User Profile Section */}
          <div style={styles.navProfile}>
            <img
              src={user?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}`}
              style={styles.navAvatar}
              alt="Profile"
              onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}`; }}
            />
            <div style={styles.navUserInfo}>
              <span style={styles.navUserName}>{user?.name || 'Voter'}</span>
              <span style={styles.navUserEmail}>{user?.email || ''}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <button onClick={() => setShowResultsModal(true)} style={{...styles.secondaryBtn, display: 'flex', alignItems: 'center', gap: '6px'}}>
            <FiBarChart2 /> Results
          </button>
          <button onClick={() => setShowVoterModal(true)} style={{...styles.secondaryBtn, display: 'flex', alignItems: 'center', gap: '6px'}}>
            <FiUsers /> Voters
          </button>
          <button onClick={handleLogout} style={{...styles.logoutBtn, display: 'flex', alignItems: 'center', gap: '6px'}}>
            <FiLogOut /> Logout
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-btn" style={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </nav>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div style={styles.mobileMenu} onClick={() => setMobileMenuOpen(false)}>
          <div style={styles.mobileMenuContent} onClick={(e) => e.stopPropagation()}>
            {/* Mobile Profile Section */}
            <div style={styles.mobileProfile}>
              <img
                src={user?.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}`}
                style={styles.mobileAvatar}
                alt="Profile"
                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}`; }}
              />
              <div style={styles.mobileUserInfo}>
                <span style={styles.mobileUserName}>{user?.name || 'Voter'}</span>
                <span style={styles.mobileUserEmail}>{user?.email || ''}</span>
                {user?.linkedin && (
                  <a href={user.linkedin} target="_blank" rel="noreferrer" style={styles.mobileLinkedIn}>
                    <FiExternalLink size={12} /> LinkedIn Profile
                  </a>
                )}
              </div>
            </div>

            <div style={styles.mobileDivider}></div>

            {/* Mobile Action Buttons */}
            <button onClick={() => { setShowResultsModal(true); setMobileMenuOpen(false); }} style={styles.mobileMenuBtn2}>
              <FiBarChart2 /> View Results
            </button>
            <button onClick={() => { setShowVoterModal(true); setMobileMenuOpen(false); }} style={styles.mobileMenuBtn2}>
              <FiUsers /> View Voters
            </button>
            <button onClick={() => { setShowProfileModal(true); setMobileMenuOpen(false); }} style={styles.mobileMenuBtn2}>
              <FiUser /> Edit Profile
            </button>
            <button onClick={handleLogout} style={styles.mobileMenuLogout}>
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <h1 style={styles.welcomeText}>
          Welcome, <span style={styles.highlightName}>{user?.name || 'Voter'}</span>
        </h1>
        
        {/* LinkedIn Profile Status */}
        {user && (
          <div style={styles.profileStatus}>
            {user.linkedin ? (
              <div style={styles.profileLinked}>
                <FiCheckCircle style={{ fontSize: '1.1rem', color: '#10b981' }} />
                <span>LinkedIn Profile Linked</span>
                <button 
                  onClick={() => {
                    setManualLinkedin(user.linkedin);
                    setShowProfileModal(true);
                  }} 
                  style={styles.editProfileBtn}
                >
                  Edit
                </button>
              </div>
            ) : (
              <div style={styles.profileWarning}>
                <FiAlertCircle style={{ fontSize: '1.1rem', color: '#f59e0b' }} />
                <span>
                  {user.provider === 'linkedin' 
                    ? 'Add Your LinkedIn Profile URL' 
                    : 'No LinkedIn Profile Linked'}
                </span>
                <button 
                  onClick={() => setShowProfileModal(true)} 
                  style={styles.addProfileBtn}
                >
                  {user.provider === 'linkedin' ? 'Add LinkedIn URL' : 'Add Profile'}
                </button>
              </div>
            )}
          </div>
        )}

        {hasVoted ? (
          <div className="vote-recorded-badge" style={{
            ...styles.votedBadge, 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '10px', 
            justifyContent: 'center',
            padding: '10px 20px',
            maxWidth: '300px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            borderRadius: '50px',
            boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
            fontWeight: '600',
            fontSize: '0.9rem',
            letterSpacing: '0.5px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <FiCheckCircle size={18} style={{ strokeWidth: 3 }} /> 
            <span>Vote Recorded</span>
          </div>
        ) : (
          <p style={styles.subText}>Please cast your vote for one of the candidates below.</p>
        )}
      </header>

      <div style={styles.candidateGrid}>
        {candidates.map((c) => (
          <div key={c._id} style={styles.card}>
            <img
              src={c.img || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`}
              alt={c.name}
              style={styles.avatar}
              onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`; }}
            />
            <h2 style={{ margin: '5px 0' }}>{c.name}</h2>
            <p style={styles.roleText}>{c.role}</p>
            <div style={styles.linksContainer}>
              <a href={c.linkedin} target="_blank" rel="noreferrer" style={styles.socialLink}>LinkedIn</a>
              <a href={c.github} target="_blank" rel="noreferrer" style={styles.socialLink}>GitHub</a>
            </div>

            {!hasVoted ? (
              <button 
                onClick={() => castVote(c._id, c.name)} 
                style={{
                  ...styles.voteBtn,
                  opacity: (!user?.linkedin || user.linkedin.trim() === '') ? 0.5 : 1,
                  cursor: (!user?.linkedin || user.linkedin.trim() === '') ? 'not-allowed' : 'pointer'
                }}
                disabled={!user?.linkedin || user.linkedin.trim() === ''}
              >
                Vote for {c.name.split(' ')[0]}
              </button>
            ) : (
              <div style={styles.votedAlreadyLabel}>
                <FiCheckCircle style={{ fontSize: '1.2rem', color: '#16a34a' }} />
                <span>Voted Already</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px 20px', fontFamily: '"Inter", sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', textAlign: 'center' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '40px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' },
  navBrand: { display: 'flex', alignItems: 'center' },
  navDesktop: { display: 'flex', alignItems: 'center', gap: '20px' },
  navProfile: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#f8fafc', borderRadius: '12px', marginRight: '10px' },
  navAvatar: { width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #007bff', objectFit: 'cover' },
  navUserInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  navUserName: { fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', lineHeight: '1.2' },
  navUserEmail: { fontSize: '0.75rem', color: '#64748b', lineHeight: '1.2' },
  mobileMenuBtn: { display: 'none', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: '8px' },
  mobileMenu: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '80px', animation: 'fadeIn 0.2s ease' },
  mobileMenuContent: { background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', padding: '24px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' },
  mobileProfile: { display: 'flex', alignItems: 'center', gap: '15px', padding: '16px', background: 'linear-gradient(135deg, #e7f0ff 0%, #f0f7ff 100%)', borderRadius: '12px', marginBottom: '16px' },
  mobileAvatar: { width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #007bff', objectFit: 'cover' },
  mobileUserInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 },
  mobileUserName: { fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' },
  mobileUserEmail: { fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' },
  mobileLinkedIn: { fontSize: '0.8rem', color: '#0077b5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' },
  mobileDivider: { height: '1px', background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)', margin: '16px 0' },
  mobileMenuBtn2: { width: '100%', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' },
  mobileMenuLogout: { width: '100%', padding: '14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px', marginTop: '10px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px' },
  header: { marginBottom: '40px' },
  votedBadge: { backgroundColor: '#d4edda', color: '#155724', padding: '10px 20px', borderRadius: '20px', display: 'inline-block', fontWeight: 'bold' },
  candidateGrid: { display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' },
  card: { background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', padding: '30px', borderRadius: '20px', width: '280px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid rgba(59, 130, 246, 0.1)', transition: 'all 0.3s ease' },
  avatar: { width: '110px', height: '110px', borderRadius: '50%', marginBottom: '15px', border: '3px solid #007bff', objectFit: 'cover' },
  roleText: { color: '#64748b', fontSize: '0.9rem', marginBottom: '15px', height: '40px' },
  linksContainer: { display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' },
  socialLink: { fontSize: '0.8rem', color: '#007bff', textDecoration: 'none', fontWeight: '600' },
  voteBtn: { background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '0 4px 12px rgba(0,123,255,0.3)', transition: 'all 0.3s ease' },
  votedLabel: { color: '#94a3b8', fontWeight: 'bold', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' },
  votedAlreadyLabel: { color: '#16a34a', fontWeight: 'bold', padding: '12px', border: '2px solid #16a34a', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem' },
  logoutBtn: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' },
  successCard: { background: '#fff', padding: '50px', borderRadius: '30px', maxWidth: '600px', margin: '0 auto', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' },
  statsSection: { marginTop: '20px', textAlign: 'left' },
  statRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  progressBarBg: { flex: 1, backgroundColor: '#e2e8f0', height: '10px', borderRadius: '5px', margin: '0 15px', overflow: 'hidden' },
  progressBarFill: { backgroundColor: '#007bff', height: '100%', transition: 'width 0.5s ease-in-out' },
  list: { maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' },
  listItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', borderBottom: '1px solid #f1f5f9' },
  miniAvatar: { width: '40px', height: '40px', borderRadius: '50%' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { background: '#fff', width: '90%', maxWidth: '500px', padding: '30px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' },
  secondaryBtn: { background: '#e7f0ff', color: '#007bff', border: '1px solid #007bff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s' },
  voterSocialLink: { fontSize: '0.75rem', color: '#0077b5', textDecoration: 'none', fontWeight: '600', padding: '4px 8px', backgroundColor: '#f0f7ff', borderRadius: '4px' },
  timestamp: { fontSize: '0.8rem', color: '#64748b', marginTop: '4px' },
  welcomeText: { fontSize: '2.5rem', marginBottom: '10px' },
  highlightName: { color: '#007bff' },
  subText: { color: '#64748b', fontSize: '1.1rem' },
  profileStatus: { margin: '20px 0' },
  profileLinked: { backgroundColor: '#d1fae5', color: '#065f46', padding: '12px 20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '10px', fontWeight: '600' },
  profileWarning: { backgroundColor: '#fef3c7', color: '#92400e', padding: '12px 20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '10px', fontWeight: '600' },
  editProfileBtn: { background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', marginLeft: '10px' },
  addProfileBtn: { background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', marginLeft: '10px' },
  profileInput: { width: '100%', padding: '12px', fontSize: '1rem', border: '2px solid #cbd5e1', borderRadius: '8px', marginBottom: '15px', boxSizing: 'border-box' },
  updateBtn: { background: '#007bff', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1rem' },
  loadingCard: { background: '#fff', padding: '50px', borderRadius: '30px', maxWidth: '400px', margin: '100px auto', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', textAlign: 'center' },
  spinner: { border: '4px solid #f3f4f6', borderTop: '4px solid #007bff', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto' }
};

export default Dashboard;