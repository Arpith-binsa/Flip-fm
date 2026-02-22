import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient"; 
import { musicService } from "../services/musicService"; // Your new middleware
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
      setSession(user);

      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", user.id);
      setMyVibes(data || []);
    };
    checkAuth();
  }, []);

  // 2. Search Logic (Calling the Service)
  useEffect(() => {
    if (searchTerm.length < 2) return setResults([]);
    
    const delay = setTimeout(async () => {
      const albums = await musicService.searchAlbums(searchTerm);
      setResults(albums);
    }, 400); // 400ms debounce to save API credits
    
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // 3. Selection Logic (The "Upsert")
  const handleSelectAlbum = async (album) => {
    if (activeSlot === null || !session) return;

    // Fetch rich genre data right before saving
    const genres = await musicService.getAlbumDetails(album.album_artist, album.album_title);

    const { error } = await supabase.from("vibes").upsert({
      user_id: session.user.id,
      slot_number: activeSlot,
      album_id: album.album_id,
      album_title: album.album_title,
      album_artist: album.album_artist,
      album_cover: album.album_cover,
      album_genres: genres, // The "Brain" fuel
    });

    if (!error) {
      // Update local state so it shows up instantly
      const updatedVibes = [...myVibes.filter(v => v.slot_number !== activeSlot), { ...album, slot_number: activeSlot }];
      setMyVibes(updatedVibes);
      setActiveSlot(null);
      setSearchTerm("");
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
              className={`aspect-square rounded-3xl border-2 transition-all overflow-hidden ${
                activeSlot === slot ? "border-blue-500 scale-105" : "border-white/5 hover:border-white/20"
              }`}
            >
              {vibe ? (
                <img src={vibe.album_cover} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600">Slot {slot + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* SEARCH OVERLAY (Only shows if a slot is selected) */}
      {activeSlot !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 p-6 flex flex-col items-center">
          <button onClick={() => setActiveSlot(null)} className="absolute top-10 right-10 text-gray-500 hover:text-white uppercase font-black">Close</button>
          
          <input 
            autoFocus
            className="bg-transparent border-b-2 border-white/10 text-4xl font-black w-full max-w-2xl py-4 focus:outline-none focus:border-blue-500 placeholder:text-white/5"
            placeholder="Search Album..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full max-w-2xl overflow-y-auto">
            {results.map(album => (
              <div 
                key={album.album_id} 
                onClick={() => handleSelectAlbum(album)}
                className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl hover:bg-white/10 cursor-pointer group"
              >
                <img src={album.album_cover} className="w-16 h-16 rounded-lg object-cover" />
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