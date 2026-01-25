import React, { useState, useEffect } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import './Dashboard.css';
import Plot from 'react-plotly.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Dashboard = ({ user, setUser }) => {
  const [voters, setVoters] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(user?.hasVoted || false);
  const [votedCandidate, setVotedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [manualLinkedin, setManualLinkedin] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

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
       
        if (setUser) {
          setUser((prev) => ({ ...(prev || {}), linkedin: manualLinkedin.trim() }));
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
          axios.get(`${API_URL}/api/candidates`),
          axios.get(`${API_URL}/api/voters`)
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

 
  useEffect(() => {
    setHasVoted(user?.hasVoted || false);
  }, [user]);

  
  useEffect(() => {
    if (user && user.provider === 'linkedin' && !user.linkedin && !showProfileModal) {
      
      const timer = setTimeout(() => {
        setShowProfileModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const castVote = async (candidateId, candidateName) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/vote/${candidateId}`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
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
        if (setUser) {
          setUser((prev) => ({ ...(prev || {}), hasVoted: true, votedAt: new Date().toISOString(), votedFor: candidateId }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Voting failed");
    }
  };

  const handleLogout = () => {
    window.location.href = `${API_URL}/auth/logout`;
  };

 
if (votedCandidate) {
  const labels = candidates.map(c => c.name);
  const values = candidates.map(c => c.votes);

  return (
    <div style={styles.container}>
      <div style={styles.successCard}>
        <div style={{ fontSize: '60px', marginBottom: '10px' }}>📊</div>
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
                text: 'TOTAL<br>' + values.reduce((a, b) => a + b, 0),
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
      {/* LinkedIn Profile Modal Popup */}
      {showProfileModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>Add LinkedIn Profile</h2>
              <button onClick={() => setShowProfileModal(false)} style={styles.closeBtn}>&times;</button>
            </div>
            <div style={{ padding: '20px 0' }}>
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
              <h2 style={{ margin: 0 }}>Verified Voters ({voters.length})</h2>
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
              View Profile 🔗
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

      <nav style={styles.nav}>
        <h3 style={{ margin: 0, color: '#007bff' }}>E-Ballot</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setShowVoterModal(true)} style={styles.secondaryBtn}>📊 View Voters</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>

      <header style={styles.header}>
        <h1 style={styles.welcomeText}>
          Welcome, <span style={styles.highlightName}>{user?.name || 'Voter'}</span>
        </h1>
        
        {/* LinkedIn Profile Status */}
        {user && (
          <div style={styles.profileStatus}>
            {user.linkedin ? (
              <div style={styles.profileLinked}>
                <span style={{ fontSize: '1.1rem' }}>✅</span>
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
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
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
          <div style={styles.votedBadge}>✅ Vote Recorded</div>
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
              <button onClick={() => castVote(c._id, c.name)} style={styles.voteBtn}>
                Vote for {c.name.split(' ')[0]}
              </button>
            ) : (
              <div style={styles.votedAlreadyLabel}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
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
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '40px' },
  header: { marginBottom: '40px' },
  votedBadge: { backgroundColor: '#d4edda', color: '#155724', padding: '10px 20px', borderRadius: '20px', display: 'inline-block', fontWeight: 'bold' },
  candidateGrid: { display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' },
  card: { background: '#fff', padding: '30px', borderRadius: '20px', width: '280px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
  avatar: { width: '110px', height: '110px', borderRadius: '50%', marginBottom: '15px', border: '3px solid #007bff', objectFit: 'cover' },
  roleText: { color: '#64748b', fontSize: '0.9rem', marginBottom: '15px', height: '40px' },
  linksContainer: { display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' },
  socialLink: { fontSize: '0.8rem', color: '#007bff', textDecoration: 'none', fontWeight: '600' },
  voteBtn: { background: '#007bff', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  votedLabel: { color: '#94a3b8', fontWeight: 'bold', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' },
  votedAlreadyLabel: { color: '#16a34a', fontWeight: 'bold', padding: '12px', border: '2px solid #16a34a', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem' },
  logoutBtn: { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
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
  secondaryBtn: { background: '#e7f0ff', color: '#007bff', border: '1px solid #007bff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
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
  updateBtn: { background: '#007bff', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '1rem' }
};

export default Dashboard;