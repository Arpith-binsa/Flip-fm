import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { calculateVibeMatch } from "../vibeMath"; // <--- IMPORT THE BRAIN

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [theirVibes, setTheirVibes] = useState([]);
  const [myVibes, setMyVibes] = useState([]); // <--- NEW STATE FOR YOUR VIBES
  const [matchScore, setMatchScore] = useState(null); // <--- NEW STATE FOR SCORE

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get the Public Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .eq('username', username)
        .single();

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
      }
    };
    fetchData();
  }, [username]);

  if (!profile) return <div className="text-white p-10">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      
      {/* HEADER WITH MATCH SCORE */}
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-5xl font-black italic tracking-tighter uppercase">{profile.username}</h1>
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">{profile.bio}</p>
        
        {matchScore !== null && (
          <div className="inline-block mt-4 px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
            <span className="text-gray-400 text-[10px] uppercase tracking-widest mr-2">Vibe Match</span>
            <span className={`text-xl font-black ${
              matchScore > 80 ? "text-green-400" : 
              matchScore > 50 ? "text-blue-400" : 
              "text-gray-400"
            }`}>
              {matchScore}%
            </span>
          </div>
        )}
      </div>

      {/* THEIR CRATE (Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
        {[0, 1, 2, 3].map((slot) => {
          const vibe = theirVibes.find(v => v.slot_number === slot);
          return (
            <div key={slot} className="aspect-square bg-[#111] rounded-2xl border border-white/5 overflow-hidden relative">
              {vibe ? (
                <img src={vibe.album_cover} alt={vibe.album_title} className="w-full h-full object-cover" />
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
  );
}