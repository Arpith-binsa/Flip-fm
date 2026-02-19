import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PublicProfile() {
  const { username } = useParams(); // Grabs the name from the URL
  const [profile, setProfile] = useState(null);
  const [vibes, setVibes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      // 1. Find the user by their username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .eq('username', username)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        // 2. Fetch their saved albums (vibes)
        const { data: vibeData } = await supabase
          .from('vibes')
          .select('*')
          .eq('user_id', profileData.id)
          .order('slot_number', { ascending: true });
        
        setVibes(vibeData || []);
      }
      setLoading(false);
    };

    fetchUserData();
  }, [username]);

  if (loading) return <div className="min-h-screen bg-black" />;
  if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center">USER NOT FOUND</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-12">
        <header className="space-y-2">
          <h1 className="text-7xl font-black tracking-tighter uppercase italic">{profile.username}'S CRATE</h1>
          <p className="text-blue-500 font-mono text-sm tracking-widest uppercase">{profile.bio}</p>
        </header>

        {/* The 4-slot Grid (Display Only) */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {[0, 1, 2, 3].map((slotIndex) => {
            const vibe = vibes.find(v => v.slot_number === slotIndex);
            return (
              <div key={slotIndex} className="aspect-square bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02]">
                {vibe ? (
                  <img src={vibe.album_cover} alt={vibe.album_title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 font-black text-4xl italic">EMPTY</div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="pt-12">
            <a href="/" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition">Create Your Own Crate on Flip-FM</a>
        </footer>
      </div>
    </div>
  );
}