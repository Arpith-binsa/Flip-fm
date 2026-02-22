import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient"; 
import { musicService } from "../services/musicService"; 
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const navigate = useNavigate();

  // 1. Check Auth & Load User's current Vibes
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");
      
      // We set the user object to 'session'
      setSession(user);

      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", user.id);
      setMyVibes(data || []);
    };
    checkAuth();
  }, [navigate]);

  // 2. Search Logic with Debounce
  useEffect(() => {
    if (searchTerm.length < 2) return setResults([]);
    
    const delay = setTimeout(async () => {
      const albums = await musicService.searchAlbums(searchTerm);
      setResults(albums);
    }, 400); 
    
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // 3. Selection Logic (CLEANED & FIXED)
  const handleSelectAlbum = async (album) => {
    if (activeSlot === null || !session?.id) {
      console.error("Missing slot or user session");
      return;
    }

    try {
      // Fetch rich genre data
      const genres = await musicService.getAlbumDetails(album.album_artist, album.album_title);

      const { error } = await supabase.from("vibes").upsert({
        user_id: session.id, // Fixed path
        slot_number: activeSlot,
        album_id: album.album_id,
        album_title: album.album_title,
        album_artist: album.album_artist,
        album_cover: album.album_cover,
        album_genres: genres, 
      });

      if (!error) {
        // Update local state instantly
        const newVibe = { 
          ...album, 
          slot_number: activeSlot, 
          user_id: session.id,
          album_genres: genres // Keep genres in local state too
        };
        
        const updatedVibes = [
          ...myVibes.filter(v => v.slot_number !== activeSlot), 
          newVibe
        ];
        
        setMyVibes(updatedVibes);
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
      <h1 className="text-3xl font-black italic uppercase mb-8 tracking-tighter">Your Crate</h1>
      
      {/* THE 4 SLOTS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {[0, 1, 2, 3].map((slot) => {
          const vibe = myVibes.find(v => v.slot_number === slot);
          return (
            <button 
              key={slot}
              onClick={() => setActiveSlot(slot)}
              className={`aspect-square rounded-3xl border-2 transition-all overflow-hidden flex items-center justify-center ${
                activeSlot === slot ? "border-blue-500 scale-105" : "border-white/5 hover:border-white/20"
              }`}
            >
              {vibe ? (
                <img src={vibe.album_cover} className="w-full h-full object-cover" alt={vibe.album_title} />
              ) : (
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600">Slot {slot + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* SEARCH OVERLAY */}
      {activeSlot !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 p-6 flex flex-col items-center">
          <button 
            onClick={() => {
                setActiveSlot(null);
                setSearchTerm("");
                setResults([]);
            }} 
            className="absolute top-10 right-10 text-gray-500 hover:text-white uppercase font-black"
          >
            Close
          </button>
          
          <input 
            autoFocus
            className="bg-transparent border-b-2 border-white/10 text-4xl font-black w-full max-w-2xl py-4 focus:outline-none focus:border-blue-500 placeholder:text-white/5 mt-20"
            placeholder="Search Album..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full max-w-2xl overflow-y-auto pb-20">
            {results.map(album => (
              <div 
                key={album.album_id} 
                onClick={() => handleSelectAlbum(album)}
                className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl hover:bg-white/10 cursor-pointer group"
              >
                <img src={album.album_cover} className="w-16 h-16 rounded-lg object-cover" alt="" />
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