import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import AlbumGrid from "../components/AlbumGrid";
import Login from "../components/Login";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const searchInputRef = useRef(null);

  // Initial State: 4 Empty Slots
  const [selectedAlbums, setSelectedAlbums] = useState([
    { id: 1, cover: "", title: "Select Album", artist: "..." },
    { id: 2, cover: "", title: "Select Album", artist: "..." },
    { id: 3, cover: "", title: "Select Album", artist: "..." },
    { id: 4, cover: "", title: "Select Album", artist: "..." }
  ]);

  // --- 1. AUTH & DATA LOADING ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchVibes(session.user.id); // <--- Load data on login
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchVibes(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. FETCH VIBES FROM DB ---
  const fetchVibes = async (userId) => {
    // Get all vibes for this user
    const { data, error } = await supabase
      .from('vibes')
      .select('*')
      .eq('user_id', userId);

    if (error) console.error("Error loading vibes:", error);

    if (data && data.length > 0) {
      // Merge saved vibes into our empty grid
      const newSelection = [...selectedAlbums];
      data.forEach(vibe => {
        // Only fill if slot is valid (0-3)
        if (vibe.slot_number >= 0 && vibe.slot_number < 4) {
           newSelection[vibe.slot_number] = {
             id: vibe.album_id,
             cover: vibe.album_cover,
             title: vibe.album_title,
             artist: vibe.album_artist
           };
        }
      });
      setSelectedAlbums(newSelection);
    }
  };

  // --- 3. SAVE VIBE TO DB ---
  const saveVibeToCloud = async (slotIndex, albumData) => {
    if (!session) return;
    
    // Strategy: Delete old vibe for this slot, then insert new one
    // (This avoids duplicates without needing complex SQL constraints)
    
    // 1. Delete existing for this slot
    await supabase
      .from('vibes')
      .delete()
      .match({ user_id: session.user.id, slot_number: slotIndex });

    // 2. Insert new
    const { error } = await supabase
      .from('vibes')
      .insert({
        user_id: session.user.id,
        slot_number: slotIndex,
        album_id: albumData.id.toString(),
        album_title: albumData.title,
        album_artist: albumData.artist,
        album_cover: albumData.cover
      });

    if (error) console.error("Error saving vibe:", error);
  };

  // --- SEARCH ENGINE ---
  useEffect(() => {
    if (searchTerm.length === 0) {
      setSearchResults([]);
      return;
    }
    const delaySearch = setTimeout(async () => {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=25&country=US&explicit=Yes`;
        const response = await fetch(url);
        const data = await response.json();
        setSearchResults(data.results);
      } catch (error) { console.error(error); }
    }, 200);
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  const handleSlotClick = (index) => {
    setActiveSlot(index);
    setIsFocused(true);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // --- SELECT ALBUM (UPDATED WITH SAVE) ---
  const selectAlbum = (album) => {
    const newSelection = [...selectedAlbums];
    const highResCover = album.artworkUrl100.replace("100x100", "600x600");

    const albumData = {
      id: album.collectionId,
      cover: highResCover, 
      title: album.collectionName,
      artist: album.artistName
    };

    // Determine target slot
    let targetIndex = activeSlot;
    
    // If no specific slot clicked, find first empty
    if (targetIndex === null) {
      const emptyIndex = newSelection.findIndex(a => a.artist === "...");
      targetIndex = (emptyIndex !== -1) ? emptyIndex : 3;
    }

    // UPDATE STATE (Instant UI update)
    newSelection[targetIndex] = albumData;
    setSelectedAlbums(newSelection);
    
    // SAVE TO CLOUD (Background process)
    saveVibeToCloud(targetIndex, albumData);

    // Reset UI
    setActiveSlot(null);
    setSearchResults([]); 
    setSearchTerm("");
    setIsFocused(false);
  };

  if (loading) return null;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      
      <button 
        onClick={() => supabase.auth.signOut()}
        className="absolute top-6 right-6 z-50 text-sm text-gray-500 hover:text-white transition cursor-pointer"
      >
        Sign Out
      </button>

      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`z-10 w-full max-w-md flex flex-col items-center gap-6 transition-transform duration-500 ease-in-out ${isFocused ? "-translate-y-24" : "translate-y-0"}`}>
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">Flip-FM</h1>
          <p className="text-gray-500 text-sm">CURATE YOUR VIBE. CONNECT THROUGH SOUND.</p>
        </div>

        <AlbumGrid 
          albums={selectedAlbums} 
          onSlotClick={handleSlotClick} 
          activeSlot={activeSlot}
        />

        <div className="relative w-full">
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={activeSlot !== null ? `Selecting for Slot ${activeSlot + 1}...` : "Search for an album..."}
            className={`w-full border backdrop-blur-md rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all text-center ${activeSlot !== null ? "bg-blue-500/20 border-blue-500 ring-2 ring-blue-500" : "bg-white/10 border-white/10 focus:ring-blue-500"}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)} 
            onBlur={() => { setTimeout(() => { setIsFocused(false); }, 200) }}
          />

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50 max-h-60 overflow-y-auto">
              {searchResults.map((album) => (
                <div 
                  key={album.collectionId} 
                  onClick={() => selectAlbum(album)}
                  className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition border-b border-white/5 last:border-0"
                >
                  <img src={album.artworkUrl60} alt="" className="w-10 h-10 rounded-md" />
                  <div className="text-left overflow-hidden">
                    <p className="font-bold text-sm text-white truncate">{album.collectionName}</p>
                    <p className="text-xs text-gray-400 truncate">{album.artistName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}