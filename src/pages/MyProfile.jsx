import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient"; 
import { musicService } from "../services/musicService"; 
import { useNavigate } from "react-router-dom";
import GoogleColorIcon from "../components/GoogleColorIcon";
import { FaSpotify } from "react-icons/fa";

export default function MyProfile() {
  const [user, setUser] = useState(null); // Changed state name to be more explicit
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate("/login");
      
      setUser(authUser); // Set the raw user object

      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", authUser.id);
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
    // FIXED: Use optional chaining and explicit user.id check to stop the crash
    if (activeSlot === null || !user?.id) {
      console.error("User session not loaded yet or no slot selected.");
      return;
    }

    try {
      const genres = await musicService.getAlbumDetails(album.album_artist, album.album_title);

      // FIXED: onConflict ensures you can overwrite existing slots
      const { error } = await supabase.from("vibes").upsert(
        {
          user_id: user.id, // Correct path based on our state
          slot_number: activeSlot,
          album_id: album.album_id,
          album_title: album.album_title,
          album_artist: album.album_artist,
          album_cover: album.album_cover,
          album_genres: genres, 
        },
        { onConflict: 'user_id, slot_number' }
      );

      if (!error) {
        const newVibe = { 
          ...album, 
          slot_number: activeSlot, 
          user_id: user.id,
          album_genres: genres 
        };
        
        setMyVibes(prev => [
          ...prev.filter(v => v.slot_number !== activeSlot), 
          newVibe
        ]);
        
        setActiveSlot(null);
        setSearchTerm("");
        setResults([]);
      }
    } catch (err) {
      console.error("Selection failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-12">
           <div>
             <h1 className="text-4xl font-black italic uppercase tracking-tighter">Your Crate</h1>
             <p className="text-gray-500 font-medium">Click any album to change it.</p>
           </div>
           {/* Navigation back to feed */}
           <button 
             onClick={() => navigate('/dashboard')}
             className="text-xs font-bold uppercase tracking-widest px-6 py-3 border border-white/10 rounded-full hover:bg-white/5 transition-all"
           >
             Back to Dashboard
           </button>
        </div>
        
        {/* 2x2 SQUARE GRID */}
        <div className="w-full max-w-[600px] mx-auto aspect-square">
          <div className="grid grid-cols-2 gap-4 w-full h-full">
            {[0, 1, 2, 3].map((slot) => {
              const vibe = myVibes.find(v => v.slot_number === slot);
              return (
                <button 
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  className={`aspect-square rounded-2xl border-2 transition-all overflow-hidden flex items-center justify-center relative group ${
                    activeSlot === slot ? "border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "border-white/5 hover:border-white/20"
                  }`}
                >
                  {vibe ? (
                    <>
                      <img src={vibe.album_cover} className="w-full h-full object-cover" alt={vibe.album_title} />
                      
                      {/* Hover overlay with album info */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                        {/* Top-right icons */}
                        <div className="absolute top-2 right-2 flex gap-2">
                          {/* Spotify Button */}
                          <a
                            href={`https://open.spotify.com/search/${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-[#1DB954] hover:bg-[#1ed760] rounded-full flex items-center justify-center transition-all shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaSpotify size={18} className="text-white" />
                          </a>
                          
                          {/* Google Search Button */}
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist + ' album')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-all shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaGoogle size={14} className="text-[#4285F4]" />
                          </a>
                        </div>
                        
                        {/* Album info */}
                        <p className="text-sm font-bold text-center line-clamp-2 mb-1">{vibe.album_title}</p>
                        <p className="text-xs text-gray-400 text-center line-clamp-1">{vibe.album_artist}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-3">Click to Change</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-6xl font-black text-white/10 group-hover:text-white/30 transition-colors">+</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-2">Add Album</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
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