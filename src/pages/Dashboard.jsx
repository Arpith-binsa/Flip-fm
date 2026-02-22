import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link } from "react-router-dom";

// Helper to extract a user's top 2 genres from their crate
const getTopGenres = (vibes) => {
  if (!vibes) return [];
  const allGenres = vibes.flatMap(v => v.album_genres || []);
  const counts = allGenres.reduce((acc, g) => { 
    acc[g] = (acc[g] || 0) + 1; 
    return acc; 
  }, {});
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2);
};

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [topMatches, setTopMatches] = useState([]);
  const [wildcards, setWildcards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dropdown states
  const [showAllSync, setShowAllSync] = useState(false);
  const [showAllWild, setShowAllWild] = useState(false);

  useEffect(() => {
    const loadFeed = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get Current User Profile for the top right PFP
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(myProfile);

      // Get Your Vibes
      const { data: myVibes } = await supabase.from('vibes').select('*').eq('user_id', user.id);

      // Get Everyone Else
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select(`id, username, avatar_url, vibes (*)`);

      const scoredUsers = allProfiles
        .filter(p => p.id !== user.id)
        .map(otherUser => {
          const score = calculateVibeMatch(myVibes || [], otherUser.vibes || []);
          const topGenres = getTopGenres(otherUser.vibes);
          return { ...otherUser, matchScore: score, topGenres };
        });

      // Sort into Sync (Highest) and Wildcards (Lowest)
      const sortedByMatch = [...scoredUsers].sort((a, b) => b.matchScore - a.matchScore);
      setTopMatches(sortedByMatch.filter(u => u.matchScore > 10)); // Arbitrary threshold for "Sync"
      
      const sortedByOpposite = [...scoredUsers].sort((a, b) => a.matchScore - b.matchScore);
      setWildcards(sortedByOpposite.filter(u => u.matchScore <= 10)); // Wildcards are very low scores

      setLoading(false);
    };

    loadFeed();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#111] text-white flex items-center justify-center font-bold">Tuning the frequency...</div>;

  const displaySync = showAllSync ? topMatches : topMatches.slice(0, 4);
  const displayWild = showAllWild ? wildcards : wildcards.slice(0, 4);

  // REUSABLE CARD COMPONENT
  const UserCard = ({ user, type }) => (
    <Link to={`/u/${user.username}`} className="bg-[#1a1b1e] rounded-3xl p-5 flex justify-between items-center hover:bg-[#252629] transition-all group">
      {/* LEFT SIDE: Info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold">{user.username?.[0]}</div>}
          </div>
          
          {/* BADGE */}
          {type === "sync" ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <span className="text-lg leading-none">~</span> {user.matchScore}% Vibe Match
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 text-orange-400 text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              ? {user.matchScore === 0 ? "0% Match" : "Unknown Vibe"}
            </div>
          )}
        </div>

        <h3 className="text-2xl font-bold text-white tracking-tight">@{user.username}</h3>
        
        {/* GENRE PILLS */}
        <div className="flex gap-2">
          {user.topGenres.map((genre, i) => (
            <span key={i} className="bg-white/5 text-gray-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{genre}</span>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: 2x2 Crate Grid */}
      <div className="grid grid-cols-2 gap-1 w-28 h-28 flex-shrink-0 bg-black/50 p-1 rounded-xl">
        {[0, 1, 2, 3].map(slot => {
          const vibe = user.vibes?.find(v => v.slot_number === slot);
          return (
            <div key={slot} className="w-full h-full bg-[#111] rounded-md overflow-hidden">
              {vibe && <img src={vibe.album_cover} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />}
            </div>
          );
        })}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white p-8 pb-32">
      {/* TOP NAV & PROFILE LINK */}
      <div className="flex justify-end mb-12">
        <Link to="/my-profile" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all">
          <span className="text-sm font-bold text-gray-300">@{currentUser?.username}</span>
          <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden">
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{currentUser?.username?.[0]}</div>}
          </div>
        </Link>
      </div>

      {/* SECTION 1: SYNC YOUR SOUND */}
      <section className="max-w-6xl mx-auto mb-16">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Sync Your Sound</h1>
            <p className="text-gray-500">People with similar taste.</p>
          </div>
          {topMatches.length > 4 && (
            <button onClick={() => setShowAllSync(!showAllSync)} className="text-blue-400 text-sm font-bold hover:text-blue-300 transition-colors">
              {showAllSync ? "Show Less" : "See All"}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displaySync.map(user => <UserCard key={user.id} user={user} type="sync" />)}
        </div>
      </section>

      {/* SECTION 2: WILDCARDS */}
      <section className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Wildcard</h1>
            <p className="text-gray-500">Step out of the algorithm. Draw a Wildcard.</p>
          </div>
          {wildcards.length > 4 && (
            <button onClick={() => setShowAllWild(!showAllWild)} className="text-orange-400 text-sm font-bold hover:text-orange-300 transition-colors">
              {showAllWild ? "Show Less" : "See All"}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayWild.map(user => <UserCard key={user.id} user={user} type="wildcard" />)}
        </div>
      </section>
    </div>
  );
}