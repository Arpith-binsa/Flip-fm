import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link } from "react-router-dom";

const getTopGenres = (vibes) => {
  if (!vibes || vibes.length === 0) return ["Unknown"];
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

  useEffect(() => {
    const loadFeed = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: myVibes } = await supabase.from('vibes').select('*').eq('user_id', user.id);
      const { data: allProfiles } = await supabase.from('profiles').select(`id, username, avatar_url, vibes (*)`);
      
      setCurrentUser(myProfile);

      const scoredUsers = allProfiles
        .filter(p => p.id !== user.id)
        .map(otherUser => ({
          ...otherUser,
          matchScore: calculateVibeMatch(myVibes || [], otherUser.vibes || []),
          topGenres: getTopGenres(otherUser.vibes)
        }));

      // --- THE 10% THRESHOLD LOGIC ---
      
      // 1. Sync Logic: >= 10% match, sorted high to low
      const syncSection = scoredUsers
        .filter(u => u.matchScore >= 10)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 4);
      setTopMatches(syncSection);

      // 2. Flipside Logic: < 10% match, sorted low to high (0% first)
      const flipsideSection = scoredUsers
        .filter(u => u.matchScore < 10)
        .sort((a, b) => a.matchScore - b.matchScore)
        .slice(0, 4);
      setFlipsideMatches(flipsideSection);

      setLoading(false);
    };
    loadFeed();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-black italic uppercase tracking-widest">
      Tuning Frequencies...
    </div>
  );

  const UserCard = ({ user, type }) => {
    const badgeColor = type === "sync" 
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400" 
      : "border-orange-600/30 bg-orange-600/10 text-orange-500";

    return (
      <Link to={`/u/${user.username}`} className="bg-[#111113] rounded-3xl p-5 flex justify-between items-center hover:bg-[#161619] transition-all group border border-white/5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-white/10 shadow-2xl">
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold uppercase">{user.username?.[0]}</div>}
            </div>
            
            <div className="flex flex-col gap-1">
              <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest text-center ${badgeColor}`}>
                {user.matchScore}% Sync
              </div>
              {type === "flipside" && user.matchScore === 0 && (
                <span className="text-[8px] font-black text-orange-600/60 uppercase tracking-tighter text-center">Sonic Opposite</span>
              )}
            </div>
          </div>
          
          <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase leading-none">@{user.username}</h3>
          
          <div className="flex gap-2">
            {user.topGenres.map((genre, i) => (
              <span key={i} className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em]">{genre}</span>
            ))}
          </div>
        </div>

        {/* 2x2 GRID WITH ASPECT RATIO FIX */}
        <div className="grid grid-cols-2 gap-1.5 w-24 h-24 bg-black/40 p-1.5 rounded-2xl shrink-0">
          {[0, 1, 2, 3].map(slot => {
            const vibe = user.vibes?.find(v => v.slot_number === slot);
            return (
              <div key={slot} className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-white/5">
                {vibe && (
                  <img 
                    src={vibe.album_cover} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 ease-in-out" 
                    alt=""
                  />
                )}
              </div>
            );
          })}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      {/* BRAND HEADER */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-16">
        <h2 className="text-xl font-black italic uppercase tracking-widest text-white/10">FLIP-FM</h2>
        <Link to="/my-profile" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all border border-white/5">
          <span className="text-xs font-black uppercase tracking-widest">@{currentUser?.username}</span>
          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{currentUser?.username?.[0]}</div>}
          </div>
        </Link>
      </div>

      {/* SYNC YOUR SOUND */}
      <section className="max-w-6xl mx-auto mb-20">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">Sync Your Sound</h1>
        <p className="text-zinc-500 uppercase text-xs font-bold tracking-[0.3em] mb-8">Matches that mirror your crate.</p>
        
        {topMatches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {topMatches.map(user => <UserCard key={user.id} user={user} type="sync" />)}
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 border-dashed rounded-3xl p-12 text-center">
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No high-sync matches found yet.</p>
          </div>
        )}
      </section>

      {/* THE FLIPSIDE */}
      <section className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2 text-orange-600">The Flipside</h1>
        <p className="text-zinc-500 uppercase text-xs font-bold tracking-[0.3em] mb-8">sonic opposites. draw a wildcard.</p>
        
        {flipsideMatches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {flipsideMatches.map(user => <UserCard key={user.id} user={user} type="flipside" />)}
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 border-dashed rounded-3xl p-12 text-center">
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No distinct flipsides found yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}