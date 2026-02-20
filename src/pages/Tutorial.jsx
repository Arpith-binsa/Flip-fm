import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Tutorial() {
  const [step, setStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const navigate = useNavigate();

  // Simple iTunes Search Logic (same as Dashboard)
  useEffect(() => {
    if (searchTerm.length < 2) return;
    const delay = setTimeout(async () => {
      const resp = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&entity=album&limit=5`);
      const data = await resp.json();
      setResults(data.results || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const completeTutorial = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (selectedAlbum && session) {
      // Save their first "vibe" to Slot 0 automatically
      await supabase.from('vibes').insert({
        user_id: session.user.id,
        slot_number: 0,
        album_id: selectedAlbum.collectionId.toString(),
        album_title: selectedAlbum.collectionName,
        album_artist: selectedAlbum.artistName,
        album_cover: selectedAlbum.artworkUrl100.replace("100x100", "600x600")
      });
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
            Your identity starts with 4 albums. <br /> Let's find your first one to anchor the crate.
          </p>
          <button 
            onClick={() => setStep(1)}
            className="bg-blue-600 px-10 py-4 rounded-2xl font-black uppercase tracking-tighter hover:bg-blue-500 transition-all"
          >
            Start Curating
          </button>
        </div>
      )}

      {/* STEP 1: GUIDED SEARCH */}
      {step === 1 && (
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <span className="text-blue-500 font-mono text-xs uppercase tracking-[0.3em]">Step 01</span>
            <h2 className="text-3xl font-black tracking-tighter italic uppercase mt-2">Search an Album</h2>
          </div>

          <div className="relative">
            <input 
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl focus:outline-none focus:border-blue-500 transition-all text-center"
              placeholder="e.g. 'Random Access Memories'"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {results.length > 0 && !selectedAlbum && (
              <div className="absolute top-full left-0 right-0 mt-4 bg-[#111] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl">
                {results.map(album => (
                  <div 
                    key={album.collectionId}
                    onClick={() => {
                        setSelectedAlbum(album);
                        setStep(2);
                    }}
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
        </div>
      )}

      {/* STEP 2: THE REVEAL */}
      {step === 2 && selectedAlbum && (
        <div className="text-center space-y-8 animate-in zoom-in duration-500">
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">That's a Vibe.</h2>
            <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Slot 1 of 4 filled</p>
          </div>

          {/* Animated Preview of the Slot */}
          <div className="w-64 h-64 mx-auto rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.3)] border-2 border-blue-500 transition-transform hover:scale-105">
            <img 
              src={selectedAlbum.artworkUrl100.replace("100x100", "600x600")} 
              className="w-full h-full object-cover" 
              alt="" 
            />
          </div>

          <button 
            onClick={completeTutorial}
            className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all uppercase tracking-tighter text-xl"
          >
            Enter My Crate
          </button>
        </div>
      )}

    </div>
  );
}