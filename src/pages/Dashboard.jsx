import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import AlbumGrid from "../components/AlbumGrid";

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ username: "COLLECTOR", bio: "" });
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

  // --- 1. AUTH, PROFILE & DATA LOADING ---
  useEffect(() => {
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchVibes(session.user.id);
      }
      setLoading(false);
    };

    initDashboard();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchVibes(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, bio')
      .eq('id', userId)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const fetchVibes = async (userId) => {
    const { data, error } = await supabase
      .from('vibes')
      .select('*')
      .eq('user_id', userId);

    if (data && data.length > 0) {
      const newSelection = [...selectedAlbums];
      data.forEach(vibe => {
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

  // --- 2. SAVE LOGIC ---
  const saveVibeToCloud = async (slotIndex, albumData) => {
    if (!session) return;
    
    // Delete existing for this slot to avoid duplicates
    await supabase
      .from('vibes')
      .delete()
      .match({ user_id: session.user.id, slot_number: slotIndex });

    // Insert new selection
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

  // --- 3. SEARCH ENGINE ---
  useEffect(() => {
    if (searchTerm.length === 0) {
      setSearchResults([]);
      return;
    }
    const delaySearch = setTimeout(async () => {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=25&country=US`;
        const response = await fetch(url);
        const data = await response.json();
        setSearchResults(data.results);
      } catch (error) { console.error(error); }
    }, 200);
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  const selectAlbum = (album) => {
    const newSelection = [...selectedAlbums];
    const highResCover = album.artworkUrl100.replace("100x100", "600x600");

    const albumData = {
      id: album.collectionId,
      cover: highResCover, 
      title: album.collectionName,
      artist: album.artistName
    };

    let targetIndex = activeSlot;
    if (targetIndex === null) {
      const emptyIndex = newSelection.findIndex(a => a.artist === "...");
      targetIndex = (emptyIndex !== -1) ? emptyIndex : 0;
    }

    newSelection[targetIndex] = albumData;
    setSelectedAlbums(newSelection);
    saveVibeToCloud(targetIndex, albumData);

    // Reset UI
    setActiveSlot(null);
    setSearchResults([]); 
    setSearchTerm("");
    setIsFocused(false);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      
      {/* Logout button */}
      <button 
        onClick={() => supabase.auth.signOut()}
        className="absolute top-6 right-6 z-50 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors"
      >
        Sign Out
      </button>

      {/* Decorative Blur Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className={`z-10 w-full max-w-xl flex flex-col items-center gap-10 transition-all duration-500 ${isFocused ? "-translate-y-20" : "translate-y-0"}`}>
        
        {/* Dynamic Header */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-none">
            {profile.username}'S CRATE
          </h1>
          <p className="text-blue-500 font-mono text-xs tracking-[0.2em] uppercase">
            {profile.bio || "CURATE YOUR VIBE. CONNECT THROUGH SOUND."}
          </p>
        </div>

        <AlbumGrid 
          albums={selectedAlbums} 
          onSlotClick={(index) => {
            setActiveSlot(index);
            setIsFocused(true);
            searchInputRef.current.focus();
          }} 
          activeSlot={activeSlot}
        />

        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder={activeSlot !== null ? `Selecting for Slot ${activeSlot + 1}...` : "Search for an album..."}
            className={`w-full border backdrop-blur-md rounded-2xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none transition-all text-center text-lg ${activeSlot !== null ? "bg-blue-500/20 border-blue-500 ring-2 ring-blue-500" : "bg-white/5 border-white/10 focus:border-blue-500"}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)} 
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          />

          {/* Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-4 bg-[#161616] rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-50 max-h-80 overflow-y-auto animate-in slide-in-from-bottom-2">
              {searchResults.map((album) => (
                <div 
                  key={album.collectionId} 
                  onClick={() => selectAlbum(album)}
                  className="flex items-center gap-4 p-4 hover:bg-blue-600/20 cursor-pointer transition group border-b border-white/5 last:border-0"
                >
                  <img src={album.artworkUrl60} alt="" className="w-12 h-12 rounded shadow-lg group-hover:scale-105 transition-transform" />
                  <div className="text-left">
                    <p className="font-bold text-sm text-white truncate w-64">{album.collectionName}</p>
                    <p className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors uppercase tracking-wider">{album.artistName}</p>
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