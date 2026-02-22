import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient"; 
import { musicService } from "../services/musicService"; 
import { useNavigate } from "react-router-dom";

export default function MyProfile() {
  const [session, setSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");
      setSession(user);

      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", user.id);
      setMyVibes(data || []);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (searchTerm.length < 2) return setResults([]);
    const delay = setTimeout(async () => {
      const albums = await musicService.searchAlbums(searchTerm);
      setResults(albums);
    }, 400); 
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleSelectAlbum = async (album) => {
    if (activeSlot === null || !session?.id) return;

    try {
      const genres = await musicService.getAlbumDetails(album.album_artist, album.album_title);

      // --- THE CRITICAL DATABASE FIX ---
      const { error } = await supabase.from("vibes").upsert(
        {
          user_id: session.id,
          slot_number: activeSlot,
          album_id: album.album_id,
          album_title: album.album_title,
          album_artist: album.album_artist,
          album_cover: album.album_cover,
          album_genres: genres, 
        },
        { onConflict: 'user_id, slot_number' } // This prevents the Unique Constraint crash
      );

      if (!error) {
        // UI Update logic
        const newVibe = { 
          ...album, 
          slot_number: activeSlot, 
          user_id: session.id,
          album_genres: genres 
        };
        
        setMyVibes(prev => [
          ...prev.filter(v => v.slot_number !== activeSlot), 
          newVibe
        ]);
        
        setActiveSlot(null);
        setSearchTerm("");
        setResults([]);
      } else {
        console.error("Supabase Error:", error.message);
      }
    } catch (err) {
      console.error("Selection failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black italic uppercase mb-2 tracking-tighter">Your Crate</h1>
        <p className="text-gray-500 mb-12 font-medium">Define your era. Pick 4.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[0, 1, 2, 3].map((slot) => {
            const vibe = myVibes.find(v => v.slot_number === slot);
            return (
              <button 
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className={`aspect-square rounded-3xl border-2 transition-all overflow-hidden flex items-center justify-center relative group ${
                  activeSlot === slot ? "border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "border-white/5 hover:border-white/20"
                }`}
              >
                {vibe ? (
                  <>
                    <img src={vibe.album_cover} className="w-full h-full object-cover" alt={vibe.album_title} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-[10px] font-black uppercase tracking-widest">Change</span>
                    </div>
                  </>
                ) : (
                  <span className="text-xl font-black text-white/10 group-hover:text-white/30 transition-colors">+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH OVERLAY */}
      {activeSlot !== null && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 p-6 flex flex-col items-center">
          <button 
            onClick={() => { setActiveSlot(null); setSearchTerm(""); }} 
            className="absolute top-10 right-10 text-gray-500 hover:text-white text-xs font-black uppercase tracking-widest"
          >
            Cancel
          </button>
          
          <input 
            autoFocus
            className="bg-transparent border-b-2 border-white/10 text-4xl md:text-6xl font-black w-full max-w-3xl py-8 focus:outline-none focus:border-blue-500 placeholder:text-white/5 mt-20 text-center"
            placeholder="TYPE ALBUM NAME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 w-full max-w-3xl overflow-y-auto pb-20">
            {results.map(album => (
              <div 
                key={album.album_id} 
                onClick={() => handleSelectAlbum(album)}
                className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/50 border border-transparent transition-all cursor-pointer group"
              >
                <img src={album.album_cover} className="w-16 h-16 rounded-lg object-cover shadow-xl" alt="" />
                <div>
                  <h3 className="font-bold leading-tight group-hover:text-blue-400">{album.album_title}</h3>
                  <p className="text-sm text-gray-500">{album.album_artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}