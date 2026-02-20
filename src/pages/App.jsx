import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

import Landing from "./Landing";
import Dashboard from "./Dashboard";
import Onboarding from "./Onboarding"; 
import Login from "../components/Login"; 
import PublicProfile from "./PublicProfile";
import Explore from "./Explore";
import Tutorial from "./Tutorial";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkUser = async (currentSession) => {
      if (currentSession) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentSession.user.id)
          .maybeSingle();
        
        // If they have a username, we consider the profile "complete"
        setHasProfile(!!data?.username);
      } else {
        setHasProfile(false);
      }
      setLoading(false);
    };

    // 1. Initial Check on load
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      checkUser(activeSession);
    });

    // 2. Listen for Auth changes (Login, Logout, Signup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a clean loading state while checking the database
  if (loading) {
    return (
      <div className="bg-black min-h-screen text-white flex items-center justify-center font-black italic tracking-tighter text-2xl uppercase">
        Flip-FM...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* --- 1. THE FRONT DOOR (LANDING) --- */}
        <Route 
          path="/" 
          element={!session ? <Landing /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} 
        />
        
        {/* --- 2. AUTHENTICATION --- */}
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} 
        />
        <Route 
          path="/signup" 
          element={!session ? <Login /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} 
        />

        {/* --- 3. THE ONBOARDING FLOW --- */}
        <Route 
          path="/onboarding" 
          element={session ? (!hasProfile ? <Onboarding /> : <Navigate to="/tutorial" replace />) : <Navigate to="/login" replace />} 
        />
        
        <Route 
          path="/tutorial" 
          element={session ? (hasProfile ? <Tutorial /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} 
        />

        {/* --- 4. THE MAIN APP (DASHBOARD) --- */}
        <Route 
          path="/dashboard" 
          element={session ? (hasProfile ? <Dashboard /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} 
        />

        {/* --- 5. PUBLIC COMMUNITY ROUTES --- */}
        <Route path="/explore" element={<Explore />} />
        <Route path="/u/:username" element={<PublicProfile />} />

        {/* --- 6. CATCH-ALL REDIRECT --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}