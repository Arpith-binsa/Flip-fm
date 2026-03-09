import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";

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
        .select('id, username, bio')
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
      <div className="w-full max-w-[600px] mx-auto aspect-square">
        <div className="grid grid-cols-2 gap-4 w-full h-full">
          {[0, 1, 2, 3].map((slot) => {
            const vibe = theirVibes.find(v => v.slot_number === slot);
            return (
              <div key={slot} className={`aspect-square bg-[#111] rounded-2xl border ${theme.border} overflow-hidden relative group ${theme.glow}`}>
                {vibe ? (
                  <>
                    <img src={vibe.album_cover} alt={vibe.album_title} className="w-full h-full object-cover" />
                    {/* Hover overlay with album info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    </div>
  );
}