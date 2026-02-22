import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

export default function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. Get the user by username
      const { data: userData, error } = await supabase
        .from("profiles")
        .select(`id, username, avatar_url, vibes (*)`)
        .eq("username", username)
        .single();

      if (error || !userData) {
        console.error("Profile not found");
        return navigate("/dashboard");
      }

      setProfile(userData);
      setLoading(false);
    };

    fetchProfile();
  }, [username, navigate]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase italic tracking-widest">Loading Crate...</div>;

  const handleListen = (vibe) => {
    const query = encodeURIComponent(`${vibe.album_title} ${vibe.album_artist}`);
    window.open(`https://music.youtube.com/search?q=${query}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* TOP NAV */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-12 text-xs font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors"
      >
        ← Back to Feed
      </button>

      <div className="max-w-4xl mx-auto">
        {/* PROFILE HEADER */}
        <div className="flex flex-col items-center mb-20 text-center">
          <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-white/5 overflow-hidden mb-6 shadow-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-black">
                {profile.username?.[0]}
              </div>
            )}
          </div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-2">@{profile.username}</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-xs">Current Rotation</p>
        </div>

        {/* THE 2X2 CRATE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[0, 1, 2, 3].map((slot) => {
            const vibe = profile.vibes?.find((v) => v.slot_number === slot);
            return (
              <div 
                key={slot} 
                className="aspect-square bg-zinc-900/50 rounded-[40px] border border-white/5 overflow-hidden relative group cursor-pointer"
                onClick={() => vibe && handleListen(vibe)}
              >
                {vibe ? (
                  <>
                    <img src={vibe.album_cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    
                    {/* HOVER OVERLAY */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-8 backdrop-blur-sm">
                       <h3 className="text-2xl font-black uppercase italic leading-tight translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                         {vibe.album_title}
                       </h3>
                       <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm mt-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                         {vibe.album_artist}
                       </p>
                       <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                         Listen on YouTube Music →
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-800 font-black italic uppercase tracking-widest">
                    Empty Slot
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