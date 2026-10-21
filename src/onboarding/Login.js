import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { clear as clearIDB } from 'idb-keyval';
import { ACCOUNT_REMOVED_KEY } from '../context/AuthContext';
import { ORG_CODE_STORAGE_KEYS } from '../services/orgCode';
import './onboarding.css';

// localStorage.clear() without losing the once-per-device org code flag
const clearLocalStorageKeepOrgCode = () => {
  const kept = ORG_CODE_STORAGE_KEYS
    .map(key => [key, localStorage.getItem(key)])
    .filter(([, value]) => value !== null);
  localStorage.clear();
  kept.forEach(([key, value]) => localStorage.setItem(key, value));
};

const takeAccountRemovedNotice = () => {
  try {
    const shown = sessionStorage.getItem(ACCOUNT_REMOVED_KEY) === 'true';
    if (shown) sessionStorage.removeItem(ACCOUNT_REMOVED_KEY);
    return shown;
  } catch (e) {
    return false;
  }
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [accountRemoved] = useState(takeAccountRemovedNotice);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Error logging in:', error);
        alert('Login failed: ' + error.message);
        setIsLoggingIn(false);
        return;
      }

      // AuthContext handles redirect via onAuthStateChange
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setIsLoggingIn(false);
    }
  };

  const goToSignUp = () => {
    navigate('/signup');
  };

  const goToForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleClearCache = async () => {
    try {
      // Sign out of Supabase
      await supabase.auth.signOut();
      // Clear IndexedDB (cached auth/profile)
      await clearIDB();
      // Clear localStorage (the org code flag stays)
      clearLocalStorageKeepOrgCode();
      // Clear sessionStorage
      sessionStorage.clear();
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      // Reload fresh
      window.location.href = '/';
    } catch (err) {
      console.error('Error clearing cache:', err);
      // Force reload even if something fails
      clearLocalStorageKeepOrgCode();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <img src="/company-logo.png" alt="Meduloc Hub" style={{ width: '220px', marginBottom: '24px' }} />
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to continue</p>
      </div>

      {accountRemoved && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          maxWidth: '320px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          This account is no longer active. Contact your administrator if you think this is a mistake.
        </div>
      )}

      <div className="login-input-container">
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck="false"
          inputMode="email"
        />

        <div className="login-password-wrapper">
          <input
            className="login-input login-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="current-password"
            spellCheck="false"
          />
          <button
            type="button"
            className="login-toggle-button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        className="login-primary-button"
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
          <div className="login-loading">
            <div className="login-spinner"></div>
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      <button
        className="login-forgot-link"
        onClick={goToForgotPassword}
        disabled={isLoggingIn}
      >
        Forgot password?
      </button>

      <p className="login-signup-text">
        Don't have an account?{' '}
        <button
          className="login-signup-link"
          onClick={goToSignUp}
          disabled={isLoggingIn}
        >
          Sign up
        </button>
      </p>

      <button
        className="login-forgot-link"
        onClick={handleClearCache}
        disabled={isLoggingIn}
        style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}
      >
        Having trouble? Clear cache & reload
      </button>
      <p style={{ marginTop: '24px', fontSize: '0.65rem', color: 'rgba(148,163,184,0.25)' }}>
        Produced by <a href="https://appcatalyst.org" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>AppCatalyst</a> for ConveyMed
      </p>
    </div>
  );
}

export default Login;
