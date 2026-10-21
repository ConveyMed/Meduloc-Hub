import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { get, set, del } from 'idb-keyval';
import { logoutOneSignal } from '../services/onesignal';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
// Note: OneSignal initialization is now handled by dedicated components in App.js

const AuthContext = createContext({});

// Keys for cached auth data
const CACHED_USER_KEY = 'cached_auth_user';
const CACHED_PROFILE_KEY = 'cached_auth_profile';

// Set when a removed account is signed out, so the login screen can say why
export const ACCOUNT_REMOVED_KEY = 'account_removed_notice';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const profileFetchRef = useRef(null);
  const accountCheckRef = useRef(false);

  // Fetch profile when user changes
  useEffect(() => {
    if (!authChecked) return; // Wait for auth to be checked first

    if (!user?.id) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Keep loading true while fetching profile
    setLoading(true);

    if (profileFetchRef.current) {
      profileFetchRef.current.cancelled = true;
    }

    const fetchProfile = async () => {
      const fetchState = { cancelled: false };
      profileFetchRef.current = fetchState;

      // Check if offline
      const isOffline = !navigator.onLine;

      if (isOffline) {
        // Load cached profile when offline
        try {
          const cachedProfile = await get(CACHED_PROFILE_KEY);
          if (cachedProfile && cachedProfile.id === user.id) {
            setUserProfile(cachedProfile);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Error loading cached profile:', e);
        }
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchState.cancelled) return;

        if (error) {
          console.log('Profile fetch error:', error);
          // Try cached profile on error
          const cachedProfile = await get(CACHED_PROFILE_KEY);
          if (cachedProfile && cachedProfile.id === user.id) {
            setUserProfile(cachedProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
          return;
        }

        // Cache the profile for offline use
        await set(CACHED_PROFILE_KEY, profile);
        setUserProfile(profile);
        setLoading(false);
      } catch (err) {
        console.log('Profile fetch error:', err);
        // Try cached profile on error
        try {
          const cachedProfile = await get(CACHED_PROFILE_KEY);
          if (cachedProfile && cachedProfile.id === user.id) {
            setUserProfile(cachedProfile);
          } else {
            setUserProfile(null);
          }
        } catch (e) {
          setUserProfile(null);
        }
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (profileFetchRef.current) {
        profileFetchRef.current.cancelled = true;
      }
    };
  }, [user?.id, authChecked]);

  // Main auth effect
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const isOffline = !navigator.onLine;

      if (isOffline) {
        // Offline: try to load cached user
        try {
          const cachedUser = await get(CACHED_USER_KEY);
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.log('Error loading cached user:', e);
          setUser(null);
        }
        setAuthChecked(true);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.log('getSession error:', error);
          // Try cached user on error
          const cachedUser = await get(CACHED_USER_KEY);
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            setUser(null);
          }
          setAuthChecked(true);
          return;
        }

        if (session) {
          // Cache user for offline use
          await set(CACHED_USER_KEY, session.user);
          setUser(session.user);
          // OneSignal initialization handled by dedicated components in App.js
        } else {
          setUser(null);
        }

        setAuthChecked(true);
      } catch (err) {
        console.log('Auth init error:', err);
        // Try cached user on error
        try {
          const cachedUser = await get(CACHED_USER_KEY);
          if (cachedUser) {
            setUser(cachedUser);
          }
        } catch (e) {
          // Ignore cache error
        }
        setAuthChecked(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        logoutOneSignal();
      } else if (session) {
        setUser(session.user);
        // OneSignal device registration handled by DeviceRegistration component in App.js
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // The login was deleted, or its users row was: sign out locally and land on login
  const signOutRemovedAccount = useCallback(async () => {
    // Set first: signOut fires SIGNED_OUT, which mounts the login screen
    try {
      sessionStorage.setItem(ACCOUNT_REMOVED_KEY, 'true');
    } catch (e) {
      // Notice is optional
    }
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.log('Local sign out error:', e);
    }
    try {
      await logoutOneSignal();
    } catch (e) {
      console.log('OneSignal logout error:', e);
    }
    try {
      await del(CACHED_USER_KEY);
      await del(CACHED_PROFILE_KEY);
    } catch (e) {
      console.log('Error clearing cached auth:', e);
    }
    setUser(null);
    setUserProfile(null);
    setLoading(false);
  }, []);

  // Fresh server check that this login still exists. Only a definite answer
  // signs out: the auth server rejecting the user (401/403, user_not_found), or
  // a confirmed-valid login whose users row is gone. Network errors do nothing.
  // A new signup always has its row: the on_auth_user_created trigger inserts
  // it in the same transaction that creates the login.
  const verifyAccount = useCallback(async (userId) => {
    if (!userId || !navigator.onLine || accountCheckRef.current) return;
    accountCheckRef.current = true;

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        const status = error.status;
        // bad_jwt is an expired or clock-skewed token, not a missing account
        if (error.code === 'user_not_found'
          || ((status === 401 || status === 403) && error.code !== 'bad_jwt')) {
          console.log('Account no longer exists, signing out:', error.code || status);
          await signOutRemovedAccount();
        }
        return;
      }

      if (!data?.user || data.user.id !== userId) return;

      const { data: row, error: rowError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!rowError && !row) {
        console.log('Profile row is gone, signing out');
        await signOutRemovedAccount();
      }
    } catch (err) {
      console.log('Account check error:', err);
    } finally {
      accountCheckRef.current = false;
    }
  }, [signOutRemovedAccount]);

  useEffect(() => {
    if (authChecked && user?.id) verifyAccount(user.id);
  }, [authChecked, user?.id, verifyAccount]);

  // Re-check whenever the app comes back to the foreground or reconnects
  useRefreshOnFocus(() => {
    if (authChecked && user?.id) verifyAccount(user.id);
  });

  const refreshProfile = async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('Refresh profile error:', error);
        return;
      }

      setUserProfile(profile);
    } catch (err) {
      console.log('Refresh error:', err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Logout from OneSignal
    await logoutOneSignal();
    // Clear cached auth data
    try {
      await del(CACHED_USER_KEY);
      await del(CACHED_PROFILE_KEY);
    } catch (e) {
      console.log('Error clearing cached auth:', e);
    }
    // The org code flag is per device and stays set on sign-out
    setUser(null);
    setUserProfile(null);
  };

  const resetIntake = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ profile_complete: false })
        .eq('id', user.id)
        .select('id');

      if (error || !data?.length) {
        console.log('Reset intake error:', error || 'no row updated');
        return;
      }

      // Update local state
      setUserProfile(prev => prev ? { ...prev, profile_complete: false } : null);
    } catch (err) {
      console.log('Reset intake error:', err);
    }
  };

  const isAuthenticated = !!user;
  const isProfileComplete = userProfile?.profile_complete === true;

  const value = {
    user,
    userProfile,
    loading,
    refreshProfile,
    signOut,
    resetIntake,
    isAuthenticated,
    isProfileComplete
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
