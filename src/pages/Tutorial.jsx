import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

export default function Tutorial() {
  const [step, setStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedAlbums, setSelectedAlbums] = useState([]); // Array to hold up to 4
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // iTunes Search
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

  const selectAlbum = (album) => {
    if (selectedAlbums.length < 4) {
      setSelectedAlbums([...selectedAlbums, album]);
      setSearchTerm(""); // Clear search bar for the next one
      setResults([]);
    }
  };

  const removeAlbum = (indexToRemove) => {
    setSelectedAlbums(selectedAlbums.filter((_, index) => index !== indexToRemove));
  };

  const completeTutorial = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (selectedAlbums.length === 4 && session) {
      
      // Map all 4 albums into an array of objects for Supabase
      const vibeInserts = selectedAlbums.map((album, index) => {
        const rawGenres = album.genres || [album.primaryGenreName];
        const cleanGenres = rawGenres.filter(genre => genre !== "Music" && genre !== "Music Videos");

        return {
          user_id: session.user.id,
          slot_number: index, // Saves as 0, 1, 2, 3
          album_id: album.collectionId.toString(),
          album_title: album.collectionName,
          album_artist: album.artistName,
          album_cover: album.artworkUrl100.replace("100x100", "600x600"),
          album_genres: cleanGenres 
        };
      });

      // Insert all 4 into the database at once
      const { error } = await supabase.from('vibes').insert(vibeInserts);
      
      if (error) {
        alert("Error saving crate: " + error.message);
        setLoading(false);
        return;
      }
    }
    
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      
      {/* STEP 0: THE MISSION */}
      {step === 0 && (
        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-700">
          <h1 className="text-5xl font-black italic tracking-tighter">THE FIRST FLIP.</h1>
          <p className="text-gray-400 max-w-sm mx-auto uppercase tracking-widest text-xs leading-loose">
            Your identity starts with 4 albums. <br /> Let's build your first crate.
          </p>
          <button 
            onClick={() => setStep(1)}
            className="bg-blue-600 px-10 py-4 rounded-2xl font-black uppercase tracking-tighter hover:bg-blue-500 transition-all"
          >
            Start Curating
          </button>
        </div>
      )}

      {/* STEP 1: THE GRID & SEARCH */}
      {step === 1 && (
        <div className="w-full max-w-2xl space-y-12 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Header */}
          <div className="text-center">
            <span className="text-blue-500 font-mono text-xs uppercase tracking-[0.3em]">
              Slot {selectedAlbums.length} of 4 filled
            </span>
            <h2 className="text-3xl font-black tracking-tighter italic uppercase mt-2">
              {selectedAlbums.length === 0 ? "Search your 1st album" : 
               selectedAlbums.length < 4 ? `Keep going... ${4 - selectedAlbums.length} left` : 
               "Your Crate is Ready."}
            </h2>
          </div>

          {/* 4 Album Slots Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((slotIndex) => {
              const album = selectedAlbums[slotIndex];
              return (
                <div 
                  key={slotIndex}
                  onClick={() => album && removeAlbum(slotIndex)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 relative group
                    ${album ? "border-blue-500 cursor-pointer hover:border-red-500" : "border-white/10 border-dashed bg-white/5"}
                    ${selectedAlbums.length === 4 && album ? "shadow-[0_0_30px_rgba(37,99,235,0.4)] scale-105" : ""}
                  `}
                >
                  {album ? (
                    <>
                      <img 
                        src={album.artworkUrl100.replace("100x100", "600x600")} 
                        alt={album.collectionName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-red-500">Remove</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-4xl">
                      {slotIndex + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Search Bar (Only show if under 4 albums) */}
          {selectedAlbums.length < 4 ? (
            <div className="relative max-w-md mx-auto">
              <input 
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl focus:outline-none focus:border-blue-500 transition-all text-center"
                placeholder="Type an album name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-[#111] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {results.map(album => (
                    <div 
                      key={album.collectionId}
                      onClick={() => selectAlbum(album)}
                      className="flex items-center gap-4 p-4 hover:bg-blue-600/20 cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <img src={album.artworkUrl60} className="w-12 h-12 rounded shadow-md" alt="" />
                      <div className="text-left">
                        <p className="font-bold text-sm truncate w-48">{album.collectionName}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{album.artistName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
             /* The Reveal Button */
             <div className="animate-in zoom-in duration-500 max-w-md mx-auto">
               <button 
                onClick={completeTutorial}
                disabled={loading}
                className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all uppercase tracking-tighter text-xl"
              >
                {loading ? "SAVING..." : "ENTER MY CRATE"}
              </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}