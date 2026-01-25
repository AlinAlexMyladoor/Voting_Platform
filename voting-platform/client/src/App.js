import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Login from './Login';
import Dashboard from './Dashboard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Wrapper component to handle route-based session refresh
function AppContent() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  // Fetch session only on routes that need authentication
  useEffect(() => {
    const fetchSession = async () => {
      // Only fetch session if we're on dashboard or being redirected there
      const needsAuth = location.pathname === '/dashboard';
      
      if (!needsAuth) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await axios.get(`${API_URL}/auth/login/success`, { withCredentials: true });
        if (res.data && res.data.user) {
          console.log('✅ User authenticated:', res.data.user.name);
          setUser(res.data.user);
        } else {
          console.log('⚠️ No active session');
          setUser(null);
        }
      } catch (err) {
        // 401 is expected when not logged in
        if (err.response?.status === 401) {
          console.log('ℹ️ Not logged in (expected)');
        } else {
          console.error('❌ Session check error:', err.message);
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [location.pathname]); // Re-fetch when route changes

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} isLoading={isLoading} />} />
      <Route path="/" element={<Login />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;