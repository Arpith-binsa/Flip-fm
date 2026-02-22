import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [vibes, setVibes] = useState([null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState(null); // Which slot is being edited
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  // 1. Fetch Session and Load Crate
  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (!activeSession) {
        navigate("/login");
        return;
      }
      setSession(activeSession);

      // Fetch the user's saved albums
      const { data, error } = await supabase
        .from('vibes')
        .select('*')
        .eq('user_id', activeSession.user.id);

      if (!error && data) {
        const loadedVibes = [null, null, null, null];
        data.forEach(vibe => {
          if (vibe.slot_number >= 0 && vibe.slot_number <= 3) {
            loadedVibes[vibe.slot_number] = vibe;
          }
        });
        setVibes(loadedVibes);
      }
    };
    
    loadDashboard();
  }, [navigate]);

  // 2. iTunes Search Logic for the Modal
  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      const resp = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&entity=album&limit=5`);
      const data = await resp.json();
      setResults(data.results || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // 3. Save the Album (WITH THE NEW GENRE BRAIN)
  const handleSelectAlbum = async (album) => {
    if (activeSlot === null || !session) return;

    // --- THE BRAIN LOGIC ---
    const rawGenres = album.genres || [album.primaryGenreName];
    const cleanGenres = rawGenres.filter(genre => genre !== "Music" && genre !== "Music Videos");

    const newVibe = {
      user_id: session.user.id,
      slot_number: activeSlot,
      album_id: album.collectionId.toString(),
      album_title: album.collectionName,
      album_artist: album.artistName,
      album_cover: album.artworkUrl100.replace("100x100", "600x600"),
      album_genres: cleanGenres // <--- SAVING THE MULTI-GENRE ARRAY
    };

    // Update UI instantly
    const newVibes = [...vibes];
    newVibes[activeSlot] = newVibe;
    setVibes(newVibes);

    // Save to Database (Upsert handles overwriting an existing slot)
    const { error } = await supabase
      .from('vibes')
      .upsert(newVibe, { onConflict: 'user_id, slot_number' });

    if (error) {
      console.error("Error saving vibe:", error.message);
      alert("Failed to save album. Check your database setup.");
    }

    // Close the search modal
    setActiveSlot(null);
    setSearchTerm("");
    setResults([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans relative">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Your Crate</h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mt-1">Curate your top 4</p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-gray-400 hover:text-white uppercase tracking-widest text-xs font-bold border-b border-gray-800 hover:border-white pb-1 transition-all"
        >
          Sign Out
        </button>
      </header>

      {/* The 4-Album Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto relative z-10">
        {[0, 1, 2, 3].map((slot) => {
          const vibe = vibes[slot];
          return (
            <div 
              key={slot}
              onClick={() => setActiveSlot(slot)}
              className="aspect-square bg-[#111] rounded-2xl border border-white/5 hover:border-blue-500 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group relative"
            >
              {vibe ? (
                <>
                  <img src={vibe.album_cover} alt={vibe.album_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="font-black uppercase tracking-tighter text-sm">Swap Album</span>
                  </div>
                </>
              ) : (
                <div className="text-gray-600 group-hover:text-blue-500 transition-colors flex flex-col items-center">
                  <span className="text-4xl mb-2">+</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold">Empty Slot</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Search Modal */}
      {activeSlot !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">Search Album</h2>
              <button 
                onClick={() => { setActiveSlot(null); setSearchTerm(""); setResults([]); }}
                className="text-gray-500 hover:text-white uppercase text-xs tracking-widest font-bold"
              >
                Cancel
              </button>
            </div>

            <input 
              autoFocus
              className="w-full bg-[#111] border border-white/10 rounded-2xl px-6 py-5 text-xl focus:outline-none focus:border-blue-500 transition-all"
              placeholder="Search artist or album..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="mt-4 bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[60vh] overflow-y-auto">
              {results.map(album => (
                <div 
                  key={album.collectionId}
                  onClick={() => handleSelectAlbum(album)}
                  className="flex items-center gap-4 p-4 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                >
                  <img src={album.artworkUrl60} className="w-12 h-12 rounded shadow-md" alt="" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{album.collectionName}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider truncate">{album.artistName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}