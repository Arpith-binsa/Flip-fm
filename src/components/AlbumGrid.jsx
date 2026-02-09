const albums = [
  { id: 1, cover: "https://upload.wikimedia.org/wikipedia/en/a/a7/Random_Access_Memories.jpg", title: "Random Access Memories", artist: "Daft Punk" },
  { id: 2, cover: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png", title: "Currents", artist: "Tame Impala" },
  { id: 3, cover: "https://upload.wikimedia.org/wikipedia/en/6/64/MeteoraLP.jpg", title: "Meteora", artist: "Linkin Park" },
  { id: 4, cover: "https://upload.wikimedia.org/wikipedia/en/6/60/Linkin_Park_-_From_Zero.png", title: "From Zero", artist: "Linkin Park" }
];

const AlbumGrid = () => {
  return (
    <div className="relative group">
      {/* The 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2 p-2 bg-gray-900 rounded-xl shadow-2xl max-w-[350px]">
        {albums.map((album) => (
          <div key={album.id} className="relative group/album overflow-hidden rounded-lg aspect-square">
            <img 
              src={album.cover} 
              alt={album.title} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover/album:scale-110"
            />
          </div>
        ))}
      </div>

      {/* Profile Picture Overlay (Bottom Left) */}
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full border-4 border-black overflow-hidden shadow-lg z-10">
        <img 
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" 
          alt="User Profile" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Action Button (Bottom Right) */}
      <button className="absolute -bottom-4 -right-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2">
        <span>⚡ Sync</span>
      </button>
    </div>
  );
};

export default AlbumGrid;