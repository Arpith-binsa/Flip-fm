import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom"; // <-- ADDED Link here
import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

import Landing from "./Landing";
import Dashboard from "./Dashboard";
import Onboarding from "./Onboarding"; 
import Login from "../components/Login"; 
import SignUp from "./SignUp";           
import PublicProfile from "./PublicProfile";
import Explore from "./Explore";
import Tutorial from "./Tutorial";

// --- NEW FLOATING NAVBAR ---
const Navbar = () => (
  <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111]/80 backdrop-blur-2xl border border-white/10 px-8 py-4 rounded-full flex gap-12 z-[100] shadow-2xl">
    <Link to="/dashboard" className="text-gray-400 hover:text-white hover:scale-105 transition-all font-black uppercase text-xs tracking-widest">
      Crate
    </Link>
    <Link to="/explore" className="text-gray-400 hover:text-white hover:scale-105 transition-all font-black uppercase text-xs tracking-widest">
      Explore
    </Link>
  </nav>
);

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
        <Route path="/" element={!session ? <Landing /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} />
        <Route path="/signup" element={!session ? <SignUp /> : <Navigate to={hasProfile ? "/dashboard" : "/onboarding"} replace />} />
        <Route path="/onboarding" element={session ? (!hasProfile ? <Onboarding /> : <Navigate to="/tutorial" replace />) : <Navigate to="/login" replace />} />
        <Route path="/tutorial" element={session ? (hasProfile ? <Tutorial /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={session ? (hasProfile ? <Dashboard /> : <Navigate to="/onboarding" replace />) : <Navigate to="/login" replace />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* THE NAVBAR SHOWS UP HERE (Only if logged in and profile is complete) */}
      {session && hasProfile && <Navbar />}
    </Router>
  );
}