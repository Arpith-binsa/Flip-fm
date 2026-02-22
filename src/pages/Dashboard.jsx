import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link } from "react-router-dom";

// Helper for top genres
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
  const [flipsideMatches, setFlipsideMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAllSync, setShowAllSync] = useState(false);
  const [showAllFlip, setShowAllFlip] = useState(false);

  useEffect(() => {
    const loadFeed = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(myProfile);

      const { data: myVibes } = await supabase.from('vibes').select('*').eq('user_id', user.id);
      const { data: allProfiles } = await supabase.from('profiles').select(`id, username, avatar_url, vibes (*)`);

      const scoredUsers = allProfiles
        .filter(p => p.id !== user.id)
        .map(otherUser => {
          const score = calculateVibeMatch(myVibes || [], otherUser.vibes || []);
          return { ...otherUser, matchScore: score, topGenres: getTopGenres(otherUser.vibes) };
        });

      // Sort logic
      setTopMatches([...scoredUsers].sort((a, b) => b.matchScore - a.matchScore));
      setFlipsideMatches([...scoredUsers].sort((a, b) => a.matchScore - b.matchScore));

      setLoading(false);
    };
    loadFeed();
  }, []);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black italic uppercase tracking-widest">Tuning frequencies...</div>;

  const UserCard = ({ user, type }) => (
    <Link to={`/u/${user.username}`} className="bg-[#161618] rounded-3xl p-5 flex justify-between items-center hover:bg-[#1c1c1f] transition-all group border border-white/5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold">{user.username?.[0]}</div>}
          </div>
          
          {type === "sync" ? (
            <div className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest">
              {user.matchScore}% Sync
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-widest">
              The Flipside
            </div>
          )}
        </div>
        <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">@{user.username}</h3>
        <div className="flex gap-2">
          {user.topGenres.map((genre, i) => (
            <span key={i} className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em]">{genre}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 w-24 h-24 bg-black/40 p-1 rounded-xl">
        {[0, 1, 2, 3].map(slot => {
          const vibe = user.vibes?.find(v => v.slot_number === slot);
          return (
            <div key={slot} className="w-full h-full bg-zinc-900 rounded-md overflow-hidden">
              {vibe && <img src={vibe.album_cover} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />}
            </div>
          );
        })}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-16">
        <h2 className="text-xl font-black italic uppercase tracking-widest text-white/20">FLIP-FM</h2>
        <Link to="/my-profile" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all border border-white/10">
          <span className="text-xs font-black uppercase tracking-widest">@{currentUser?.username}</span>
          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{currentUser?.username?.[0]}</div>}
          </div>
        </Link>
      </div>

      {/* SECTION 1: SYNC */}
      <section className="max-w-6xl mx-auto mb-20">
        <div className="mb-8">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">Sync Your Sound</h1>
          <p className="text-zinc-500 uppercase text-xs font-bold tracking-[0.3em]">The matches that mirror your crate.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(showAllSync ? topMatches : topMatches.slice(0, 4)).map(user => <UserCard key={user.id} user={user} type="sync" />)}
        </div>
      </section>

      {/* SECTION 2: THE FLIPSIDE */}
      <section className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2 text-orange-500">The Flipside</h1>
          <p className="text-zinc-500 uppercase text-xs font-bold tracking-[0.3em]">sonic opposites. draw a wildcard.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(showAllFlip ? flipsideMatches : flipsideMatches.slice(0, 4)).map(user => <UserCard key={user.id} user={user} type="flip" />)}
        </div>
      </section>
    </div>
  );
}