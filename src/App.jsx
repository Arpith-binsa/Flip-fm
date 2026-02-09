import { useState, useEffect } from "react";
import AlbumGrid from "./components/AlbumGrid";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false); // <--- NEW STATE FOR ANIMATION

  // Initial State: 4 Empty Slots
  const [selectedAlbums, setSelectedAlbums] = useState([
    { id: 1, cover: "", title: "Select Album", artist: "..." },
    { id: 2, cover: "", title: "Select Album", artist: "..." },
    { id: 3, cover: "", title: "Select Album", artist: "..." },
    { id: 4, cover: "", title: "Select Album", artist: "..." }
  ]);

  // --- THE LIVE SEARCH ENGINE ---
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchTerm.length > 2) {
         try {
           const response = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&entity=album&limit=5`);
           const data = await response.json();
           setSearchResults(data.results);
         } catch (error) {
           console.error("Error fetching data:", error);
         }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // --- SELECT ALBUM LOGIC ---
  const selectAlbum = (album) => {
    const newSelection = [...selectedAlbums];
    const emptyIndex = newSelection.findIndex(a => a.artist === "...");
    const highResCover = album.artworkUrl100.replace("100x100", "600x600");

    const albumData = {
      id: album.collectionId,
      cover: highResCover, 
      title: album.collectionName,
      artist: album.artistName
    };

    if (emptyIndex !== -1) {
      newSelection[emptyIndex] = albumData;
    } else {
      newSelection[3] = albumData;
    }
    
    setSelectedAlbums(newSelection);
    setSearchResults([]); 
    setSearchTerm("");
    setIsFocused(false); // <--- Reset position after selection
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* THE MAIN CONTAINER 
         - Logic: If focused, move up (-translate-y-24). If not, stay centered.
         - transition-all makes it slide smoothly.
      */}
      <div className={`z-10 w-full max-w-md flex flex-col items-center gap-6 transition-transform duration-500 ease-in-out ${isFocused ? "-translate-y-24" : "translate-y-0"}`}>
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">flip-fm</h1>
          <p className="text-gray-500 text-sm">Curate your sonic identity.</p>
        </div>

        {/* THE GRID */}
        <AlbumGrid albums={selectedAlbums} />

        {/* SEARCH BAR (Floating) */}
        <div className="relative w-full">
          <input 
            type="text" 
            placeholder="Search for an album..." 
            className="w-full bg-white/10 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // --- NEW HANDLERS ---
            onFocus={() => setIsFocused(true)} // Slide UP when clicked
            onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Slide DOWN (with delay) when leaving
          />

          {/* DROPDOWN RESULTS */}
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

export default App;