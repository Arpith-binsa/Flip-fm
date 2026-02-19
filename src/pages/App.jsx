import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

import Landing from "./Landing";
import Dashboard from "./Dashboard";
import Onboarding from "./Onboarding"; 
import Login from "../components/Login"; 
import PublicProfile from "./PublicProfile";
import Explore from "./Explore";

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
        
        setHasProfile(!!data?.username);
      } else {
        setHasProfile(false);
      }
      setLoading(false);
    };

    // 1. Initial Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkUser(session);
    });

    // 2. Listen for Login/Logout/Signup events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="bg-black min-h-screen text-white p-10">Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* If no session, show landing. If session, check profile to decide destination */}
        <Route path="/" element={!session ? <Landing /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} />
        
        <Route path="/login" element={!session ? <Login /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} />

        <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" replace />} />
        
        <Route path="/dashboard" element={session ? (hasProfile ? <Dashboard /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} />

        <Route path="/explore" element={<Explore />} />

        <Route path="/u/:username" element={<PublicProfile />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}