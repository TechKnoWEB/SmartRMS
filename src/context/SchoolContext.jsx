import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path to your supabase client
import { AlertTriangle, Lock } from 'lucide-react'; // Assuming you use lucide-react

// 1. Create the Context
const SchoolContext = createContext({
  school: null,
  hasFeature: () => true,
  loading: true
});

export function SchoolProvider({ children, user }) {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  // Note: We expect 'user' to be passed in as a prop from your existing AuthContext, 
  // and it should contain user.school_id
  const schoolId = user?.school_id;

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    // Fetch initial school configuration
    const fetchSchool = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, is_active, plan, plan_expires_at, features, admin_notes')
        .eq('id', schoolId)
        .single();

      if (!error && data) {
        setSchool(data);
      }
      setLoading(false);
    };

    fetchSchool();

    // LISTEN FOR INSTANT UPDATES FROM SUPERADMIN
    const subscription = supabase
      .channel(`public:schools:id=eq.${schoolId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'schools', filter: `id=eq.${schoolId}` },
        (payload) => {
          // Real-time school update received from superadmin
          setSchool(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [schoolId]);

  // All features are open to all users — no plan-based restrictions.
  // hasFeature always returns true so FeatureGuard never hides any content.
  // The school.features jsonb is still fetched for superadmin visibility only.
  // eslint-disable-next-line no-unused-vars
  const hasFeature = (_featureKey) => true;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // --- GLOBAL LOCK SCREENS ---

  // 1. Check if School is Deactivated
  if (school && school.is_active === false) {
    return (
      <LockScreen 
        icon={Lock}
        title="Access Suspended" 
        message="Your school's access has been deactivated by the system administrator. Please contact support to restore your access."
      />
    );
  }

  // 2. Check if Subscription is Expired
  // Subscription expiry is not enforced — all features open.

  return (
    <SchoolContext.Provider value={{ school, hasFeature, loading }}>
      {children}
    </SchoolContext.Provider>
  );
}

// 2. Export the Hook for easy access
export const useSchool = () => useContext(SchoolContext);

// 3. Optional: A wrapper component to easily hide/show UI elements
export function FeatureGuard({ feature, children, fallback = null }) {
  const { hasFeature } = useSchool();
  return hasFeature(feature) ? children : fallback;
}

// --- Lock Screen UI Component ---
function LockScreen({ title, message, icon: Icon }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-gray-800 animate-[slideDown_0.3s_ease-out]">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">{title}</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {message}
        </p>
        <button 
          onClick={() => window.location.href = 'mailto:support@yoursystem.com'}
          className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}