import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link, useNavigate } from "react-router-dom";
import { Settings, Sparkles } from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import GoogleColorIcon from "../components/GoogleColorIcon";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [syncMatches, setSyncMatches] = useState([]); // High compatibility (70%+)
  const [flipsideMatches, setFlipsideMatches] = useState([]); // Low compatibility (0-30%)
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      // 2. Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);

      // 3. Get user's vibes
      const { data: myVibeData } = await supabase
        .from('vibes')
        .select('*')
        .eq('user_id', user.id);
      
      setMyVibes(myVibeData || []);

      // 4. Get all other users and their vibes
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          bio,
          avatar_url,
          vibes (*)
        `);

      // 5. Calculate matches and categorize
      const matches = allProfiles
        .filter(p => p.id !== user.id && p.vibes?.length > 0) // Filter out self and users with no vibes
        .map(otherUser => {
          const score = calculateVibeMatch(myVibeData || [], otherUser.vibes || []);
          return { ...otherUser, matchScore: score };
        });

      // Sort by score (highest to lowest)
      const sorted = matches.sort((a, b) => b.matchScore - a.matchScore);

      // Split into Sync (15%+) and Flipside (14% and below)
      const sync = sorted.filter(m => m.matchScore >= 15); // Already sorted high to low
      const flipside = sorted.filter(m => m.matchScore <= 14).reverse(); // Reverse to show lowest first
      
      setSyncMatches(sync);
      setFlipsideMatches(flipside.slice(0, 15)); // Cap at 15
      
      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const handleFeelingLucky = async () => {
    try {
      // Get all users except current user
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('username')
        .neq('id', currentUser.id);
      
      if (allUsers && allUsers.length > 0) {
        // Pick a random user
        const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
        navigate(`/u/${randomUser.username}`);
      }
    } catch (error) {
      console.error('Error finding random user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl font-black italic uppercase tracking-tighter animate-pulse">
            FLIP-FM
          </div>
          <div className="text-sm text-gray-500 uppercase tracking-widest">
            Loading your crate...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      
      {/* HEADER */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
              Your Crate
            </h1>
            <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">
              Welcome back, @{currentUser?.username}
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleFeelingLucky}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full transition-all text-xs uppercase tracking-widest font-bold shadow-lg"
            >
              <Sparkles size={14} />
              Feeling Lucky
            </button>
            <button 
              onClick={() => navigate('/my-profile')}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-xs uppercase tracking-widest font-bold"
            >
              <Settings size={14} />
              Edit Crate
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* YOUR 4 ALBUMS PREVIEW */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Your Identity</h2>
            <Link 
              to="/my-profile" 
              className="text-xs text-blue-500 uppercase tracking-widest font-bold hover:text-blue-400"
            >
              Edit →
            </Link>
          </div>
          
          {/* 2x2 SQUARE GRID */}
          <div className="w-full max-w-[600px] mx-auto aspect-square relative">
            <div className="grid grid-cols-2 gap-4 w-full h-full">
              {[0, 1, 2, 3].map((slot) => {
                const vibe = myVibes.find(v => v.slot_number === slot);
                return (
                  <div key={slot} className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 relative group">
                    {vibe ? (
                      <>
                        <img src={vibe.album_cover} className="w-full h-full object-cover" alt={vibe.album_title} />
                        
                        {/* Hover overlay with album info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Top-right icons */}
                          <div className="absolute top-2 right-2 flex gap-2">
                            {/* Spotify Button */}
                            <a
                              href={`https://open.spotify.com/search/${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 bg-[#1DB954] hover:bg-[#1ed760] rounded-full flex items-center justify-center transition-all shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FaSpotify size={18} className="text-white" />
                            </a>
                            
                            {/* Google Search Button */}
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist + ' album')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-all shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GoogleColorIcon size={16} />
                            </a>
                          </div>
                          
                          {/* Album info at bottom */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-sm font-bold line-clamp-2">{vibe.album_title}</p>
                            <p className="text-xs text-gray-400 line-clamp-1 mt-1">{vibe.album_artist}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl text-white/10 font-black">+</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Profile Picture Overlay - Bottom Left */}
            <div className="absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden shadow-2xl transform translate-y-1/4 translate-x-[-0.5rem]">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt={currentUser.username} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
                  {currentUser?.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SYNC MATCHES - High Compatibility */}
        <section className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Sync Matches</h2>
              <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                <span className="text-green-400 text-[10px] font-black uppercase tracking-widest">15%+ Match</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">People with similar taste (sorted from most to least similar)</p>
          </div>

          {syncMatches.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                No high matches yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {syncMatches.map(user => (
                <Link 
                  to={`/u/${user.username}`} 
                  key={user.id}
                  className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:bg-white/5 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-green-400 transition-colors">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      {/* Mini 2x2 grid preview */}
                      <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                    <div className="text-4xl font-black text-green-400">
                      {user.matchScore}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* FLIPSIDE MATCHES - Low Compatibility */}
        <section>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Flipside Matches</h2>
              <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                <span className="text-orange-400 text-[10px] font-black uppercase tracking-widest">0-14% Match</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">People with different taste (sorted from least to most similar). Break your echo chamber.</p>
          </div>

          {flipsideMatches.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                No flipside matches yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {flipsideMatches.map(user => (
                <Link 
                  to={`/u/${user.username}`} 
                  key={user.id}
                  className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:bg-white/5 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-orange-400 transition-colors">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      {/* Mini 2x2 grid preview */}
                      <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                    <div className="text-4xl font-black text-orange-400">
                      {user.matchScore}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}