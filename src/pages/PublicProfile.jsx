import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { FaSpotify } from "react-icons/fa";
import GoogleColorIcon from "../components/GoogleColorIcon";

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [theirVibes, setTheirVibes] = useState([]);
  const [myVibes, setMyVibes] = useState([]); 
  const [matchScore, setMatchScore] = useState(null); 

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get the Public Profile (CHANGED TO .maybeSingle())
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, bio, avatar_url')
        .eq('username', username)
        .maybeSingle(); // <--- THIS FIXES THE 406 ERROR

      if (profileData) {
        setProfile(profileData);

        // 2. Get THEIR Vibes
        const { data: theirVibeData } = await supabase
          .from('vibes')
          .select('*')
          .eq('user_id', profileData.id);
        
        setTheirVibes(theirVibeData || []);

        // 3. Get YOUR Vibes (to compare)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: myVibeData } = await supabase
            .from('vibes')
            .select('*')
            .eq('user_id', session.user.id);
          
          setMyVibes(myVibeData || []);
          
          // 4. RUN THE MATH
          if (myVibeData && theirVibeData) {
            const score = calculateVibeMatch(myVibeData, theirVibeData);
            setMatchScore(score);
          }
        }
      } else {
        // If no user is found, set profile to a specific "not found" state
        setProfile("NOT_FOUND");
      }
    };
    fetchData();
  }, [username]);

  // NEW: Handle the "User Not Found" screen
  if (profile === "NOT_FOUND") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center space-y-4">
        <h1 className="text-4xl font-black italic uppercase">404: Vibe Not Found</h1>
        <p className="text-gray-500 uppercase tracking-widest text-xs">No user exists with the username "{username}"</p>
      </div>
    );
  }

  if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center uppercase font-black tracking-widest text-sm">Loading Profile...</div>;

  // Determine if this is a Sync or Flipside match
  const isSync = matchScore !== null && matchScore >= 15;
  const isFlipside = matchScore !== null && matchScore <= 14;
  
  // Dynamic color schemes
  const syncColors = {
    bg: "from-green-500/10 to-blue-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
    glow: "shadow-[0_0_50px_rgba(34,197,94,0.2)]",
    badge: "bg-green-500/20 border-green-500/30",
    badgeText: "text-green-400"
  };
  
  const flipsideColors = {
    bg: "from-orange-500/10 to-pink-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    glow: "shadow-[0_0_50px_rgba(249,115,22,0.2)]",
    badge: "bg-orange-500/20 border-orange-500/30",
    badgeText: "text-orange-400"
  };
  
  const defaultColors = {
    bg: "from-white/5 to-white/5",
    border: "border-white/20",
    text: "text-white",
    glow: "",
    badge: "bg-white/5 border-white/20",
    badgeText: "text-white"
  };
  
  const theme = isSync ? syncColors : isFlipside ? flipsideColors : defaultColors;

  return (
    <div className={`min-h-screen bg-black text-white p-6 flex flex-col items-center bg-gradient-to-br ${theme.bg}`}>
      
      {/* TOP NAV */}
      <div className="w-full max-w-6xl mb-8">
        <Link 
          to="/dashboard" 
          className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors inline-block"
        >
          FLIP-FM
        </Link>
      </div>
      
      {/* HEADER WITH MATCH SCORE */}
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-5xl font-black italic tracking-tighter uppercase">{profile.username}</h1>
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">{profile.bio}</p>
        
        {matchScore !== null && (
          <div className={`inline-block mt-4 px-6 py-2 rounded-full border ${theme.badge} backdrop-blur-md ${theme.glow}`}>
            <span className="text-gray-400 text-[10px] uppercase tracking-widest mr-2">
              {isSync ? "Sync Match" : isFlipside ? "Flipside Match" : "Vibe Match"}
            </span>
            <span className={`text-xl font-black ${theme.badgeText}`}>
              {matchScore}%
            </span>
          </div>
        )}
      </div>

      {/* THEIR CRATE (2x2 Square Grid) */}
      <div className="w-full max-w-[600px] mx-auto aspect-square relative">
        <div className="grid grid-cols-2 gap-4 w-full h-full has-[.bottom-left:hover]:[&_.profile-pic]:opacity-0">
          {[0, 1, 2, 3].map((slot) => {
            const vibe = theirVibes.find(v => v.slot_number === slot);
            return (
              <div key={slot} className={`aspect-square bg-[#111] rounded-2xl border ${theme.border} overflow-hidden relative group ${theme.glow} ${slot === 2 ? 'bottom-left' : ''}`}>
                {vibe ? (
                  <>
                    <img src={vibe.album_cover} alt={vibe.album_title} className="w-full h-full object-cover" />
                    
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
                        >
                          <FaSpotify size={18} className="text-white" />
                        </a>
                        
                        {/* Google Search Button */}
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist + ' album')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-all shadow-lg"
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
                  <div className="w-full h-full flex items-center justify-center text-gray-800 font-bold uppercase tracking-widest text-xs">
                    Empty
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Profile Picture Overlay - Bottom Left */}
        <div className="profile-pic absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden shadow-2xl transform translate-y-1/4 translate-x-[-0.5rem] transition-opacity duration-300 pointer-events-none">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
              {profile?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}