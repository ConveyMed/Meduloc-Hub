import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const FieldIntelContext = createContext({});

export const useFieldIntel = () => {
  const context = useContext(FieldIntelContext);
  if (!context) {
    throw new Error('useFieldIntel must be used within a FieldIntelProvider');
  }
  return context;
};

export const FieldIntelProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [role, setRole] = useState(null);
  const [regionIds, setRegionIds] = useState([]);
  const [parentUserId, setParentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Extract stable primitives for the dependency array
  const userId = user?.id || null;
  const profileIsAdmin = userProfile?.is_admin === true;
  const profileIsOwner = userProfile?.is_owner === true;
  const profileRole = userProfile?.role || null;
  const profileLoaded = !!userProfile;

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setRegionIds([]);
      setParentUserId(null);
      setLoading(false);
      return;
    }

    // Wait for userProfile to finish loading
    if (!profileLoaded) {
      return;
    }

    const fetchHierarchy = async () => {
      setLoading(true);

      // Admin/Owner always gets admin dashboard, regardless of hierarchy assignments
      const isAdmin = profileIsAdmin || profileIsOwner || profileRole === 'admin' || profileRole === 'owner';

      if (isAdmin) {
        setRole('admin');
        setRegionIds([]);
        setParentUserId(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('hierarchy_assignments')
          .select('role_tier, parent_user_id, region_id')
          .eq('user_id', userId);

        if (error) {
          console.error('[FieldIntel] Error fetching hierarchy:', error);
          setRole(null);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setRole(null);
          setRegionIds([]);
          setParentUserId(null);
          setLoading(false);
          return;
        }

        const assignment = data[0];
        setRole(assignment.role_tier);
        setParentUserId(assignment.parent_user_id);

        const regions = data
          .map(d => d.region_id)
          .filter(Boolean);
        setRegionIds(regions);
      } catch (err) {
        console.error('[FieldIntel] Error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [userId, profileLoaded, profileIsAdmin, profileIsOwner, profileRole]);

  const value = {
    role,
    regionIds,
    parentUserId,
    loading,
  };

  return (
    <FieldIntelContext.Provider value={value}>
      {children}
    </FieldIntelContext.Provider>
  );
};
