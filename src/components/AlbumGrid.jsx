import React from 'react';

// Using reliable Unsplash images as placeholders until we connect Spotify
const albums = [
  { id: 1, cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop", title: "Random Access Memories", artist: "Daft Punk" },
  { id: 2, cover: "https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=300&auto=format&fit=crop", title: "Currents", artist: "Tame Impala" },
  { id: 3, cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300&auto=format&fit=crop", title: "Meteora", artist: "Linkin Park" },
  { id: 4, cover: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=300&auto=format&fit=crop", title: "From Zero", artist: "Linkin Park" }
];

const AlbumGrid = () => {
  return (
    <div className="relative group w-[320px]">
      
      {/* The Glass Container */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 rounded-3xl shadow-2xl overflow-visible">
        
        {/* The 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <div key={album.id} className="relative aspect-square rounded-xl overflow-hidden group/album cursor-pointer">
              <img 
                src={album.cover} 
                alt={album.title} 
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/album:scale-110"
              />
              
              {/* Subtle Dark Gradient Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/album:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                 <p className="text-white font-bold text-xs truncate">{album.title}</p>
                 <p className="text-gray-400 text-[10px] truncate">{album.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Picture (Floating Bottom Left) */}
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full p-1 bg-[#121212]">
        <img 
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" 
          alt="User" 
          className="w-full h-full object-cover rounded-full border-2 border-white/20"
        />
      </div>

      {/* Sync Button (Floating Bottom Right) */}
      <button className="absolute -bottom-3 -right-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-2 text-sm border border-white/10 z-20 cursor-pointer">
        <span>⚡ Sync Vibe</span>
      </button>

    </div>
  );
};

export default AlbumGrid;