import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// --- CORRECTED IMPORTS ---
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import Onboarding from "./Onboarding"; 
import Login from "../components/Login"; // Keep this if Login is in a components folder
import SignUp from "./SignUp";           // Changed this to match your structure
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
        
        setHasProfile(!!data?.username);
      } else {
        setHasProfile(false);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      checkUser(activeSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="bg-black min-h-screen text-white flex items-center justify-center font-black italic tracking-tighter text-2xl uppercase">Flip-FM...</div>;

  return (
    <Router>
      <Routes>
        {/* LANDING */}
        <Route 
          path="/" 
          element={!session ? <Landing /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} 
        />
        
        {/* LOGIN (For returning users) */}
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} 
        />

        {/* SIGNUP (For new users) - THIS WAS THE FIX */}
        <Route 
          path="/signup" 
          element={!session ? <SignUp /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} 
        />

        {/* ONBOARDING FLOW */}
        <Route 
          path="/onboarding" 
          element={session ? (!hasProfile ? <Onboarding /> : <Navigate to="/tutorial" replace />) : <Navigate to="/login" replace />} 
        />
        
        <Route 
          path="/tutorial" 
          element={session ? (hasProfile ? <Tutorial /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} 
        />

        {/* MAIN APP */}
        <Route 
          path="/dashboard" 
          element={session ? (hasProfile ? <Dashboard /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} 
        />

        <Route path="/explore" element={<Explore />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}