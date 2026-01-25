import React, { useState, useEffect } from 'react';
import './Login.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CLIENT_URL = window.location.origin;

const Login = () => {
  const [currentView, setCurrentView] = useState('oauth'); // 'oauth', 'login', 'register', 'forgot', 'reset'
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [forgotData, setForgotData] = useState({
    email: ''
  });
  const [resetData, setResetData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);

  // Detect incognito/private mode
  useEffect(() => {
    const detectIncognito = async () => {
      // Multiple detection methods for different browsers
      try {
        // Method 1: IndexedDB (works in Chrome/Edge)
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const { quota } = await navigator.storage.estimate();
          if (quota && quota < 120000000) { // Less than 120MB typically means incognito
            setIsIncognito(true);
            return;
          }
        }

        // Method 2: Storage test (works in Firefox)
        const testKey = '__incognito_test__';
        try {
          localStorage.setItem(testKey, '1');
          localStorage.removeItem(testKey);
        } catch (e) {
          setIsIncognito(true);
          return;
        }

        // Method 3: FileSystem API (Safari)
        if ('webkitRequestFileSystem' in window) {
          window.webkitRequestFileSystem(
            window.TEMPORARY,
            1,
            () => {},
            () => setIsIncognito(true)
          );
        }
      } catch (e) {
        // If detection fails, assume not incognito
        console.log('Incognito detection failed:', e);
      }
    };

    detectIncognito();
  }, []);

  // Check if there's a reset token in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setCurrentView('reset');
    }
  }, []);

  const handleOAuthLogin = (provider) => {
    // Use window.location.href instead of window.open for better reliability
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  // Login form handlers
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginData.email.trim() || !loginData.password) {
      setError('Email and password are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = `${CLIENT_URL}/dashboard`;
      }, 1000);
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Register form handlers
  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!registerData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!registerData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!registerData.password) {
      setError('Password is required');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        return;
      }

      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        setCurrentView('login');
        setLoginData({ email: registerData.email, password: '' });
        setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
        setSuccess('');
      }, 1500);
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password handlers
  const handleForgotChange = (e) => {
    const { name, value } = e.target;
    setForgotData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotData.email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send reset email');
        return;
      }

      setSuccess('Password reset link sent to your email! Check your inbox.');
      setTimeout(() => {
        setCurrentView('login');
        setForgotData({ email: '' });
        setSuccess('');
      }, 3000);
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Forgot password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password handlers
  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetData.password) {
      setError('Password is required');
      return;
    }
    if (resetData.password !== resetData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (resetData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password: resetData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to reset password');
        return;
      }

      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        setCurrentView('login');
        setResetData({ password: '', confirmPassword: '' });
        setResetToken('');
        setSuccess('');
      }, 2000);
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>VOTING</h1>
        <p>Platform v2.0</p>

        {/* Incognito Mode Warning */}
        {isIncognito && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            color: '#856404'
          }}>
            <strong>⚠️ Incognito/Private Mode Detected</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>
              OAuth login (Google/LinkedIn) may not work in incognito mode due to third-party cookie restrictions. 
              <br/>
              <strong>Recommendation:</strong> Use <strong>Email/Password login</strong> below, or open this site in a regular browser window.
            </p>
          </div>
        )}

        {/* OAuth Login View */}
        {currentView === 'oauth' && (
          <>
            <div className="button-group">
              <button className="login-btn" onClick={() => handleOAuthLogin('google')}>
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" width="24" alt="" />
                Continue with Google
              </button>
              
              <button className="login-btn" onClick={() => handleOAuthLogin('linkedin')}>
                <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="24" alt="" />
                Continue with LinkedIn
              </button>
            </div>
            
            <div className="divider">
              <span>or</span>
            </div>

            <button 
              className="register-btn" 
              onClick={() => setCurrentView('login')}
            >
              Sign in with Email
            </button>
          </>
        )}

        {/* Email/Password Login View */}
        {currentView === 'login' && (
          <>
            <h2>Sign In</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleLoginSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Your password"
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-links">
              <button 
                className="link-btn"
                onClick={() => {
                  setCurrentView('forgot');
                  setError('');
                  setSuccess('');
                }}
                disabled={isLoading}
              >
                Forgot Password?
              </button>

              <button 
                className="link-btn"
                onClick={() => {
                  setCurrentView('register');
                  setError('');
                }}
                disabled={isLoading}
              >
                Create Account
              </button>
            </div>

            <button 
              className="back-btn"
              onClick={() => {
                setCurrentView('oauth');
                setLoginData({ email: '', password: '' });
                setError('');
              }}
              disabled={isLoading}
            >
              Back
            </button>
          </>
        )}

        {/* Register View */}
        {currentView === 'register' && (
          <>
            <h2>Create Account</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleRegisterSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  placeholder="john@example.com"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input
                  type="password"
                  id="reg-password"
                  name="password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  name="confirmPassword"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Register'}
              </button>
            </form>

            <button 
              className="back-btn"
              onClick={() => {
                setCurrentView('login');
                setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
                setError('');
              }}
              disabled={isLoading}
            >
              Back to Login
            </button>
          </>
        )}

        {/* Forgot Password View */}
        {currentView === 'forgot' && (
          <>
            <h2>Reset Password</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleForgotSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  type="email"
                  id="forgot-email"
                  name="email"
                  value={forgotData.email}
                  onChange={handleForgotChange}
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <button 
              className="back-btn"
              onClick={() => {
                setCurrentView('login');
                setForgotData({ email: '' });
                setError('');
              }}
              disabled={isLoading}
            >
              Back to Login
            </button>
          </>
        )}

        {/* Reset Password View */}
        {currentView === 'reset' && (
          <>
            <h2>Set New Password</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleResetSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="reset-password">New Password</label>
                <input
                  type="password"
                  id="reset-password"
                  name="password"
                  value={resetData.password}
                  onChange={handleResetChange}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reset-confirm">Confirm Password</label>
                <input
                  type="password"
                  id="reset-confirm"
                  name="confirmPassword"
                  value={resetData.confirmPassword}
                  onChange={handleResetChange}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <button 
              className="back-btn"
              onClick={() => {
                setCurrentView('login');
                setResetData({ password: '', confirmPassword: '' });
                setResetToken('');
                setError('');
              }}
              disabled={isLoading}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
