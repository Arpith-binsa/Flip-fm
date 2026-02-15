import React from 'react';

const AlbumGrid = ({ albums, onSlotClick, activeSlot }) => {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {albums.map((album, index) => (
        <div 
          key={index} // Use index as key to ensure stability
          onClick={() => onSlotClick(index)} 
          className={`aspect-square rounded-2xl overflow-hidden relative group hover:scale-[1.02] transition-all duration-300 cursor-pointer
            ${activeSlot === index 
              ? "ring-4 ring-blue-500 scale-[1.05] shadow-[0_0_20px_rgba(59,130,246,0.5)] border-transparent" 
              : "bg-white/5 border border-white/10 hover:border-blue-500/50"
            }`}
        >
          {album.cover ? (
            <img 
              src={album.cover} 
              alt={album.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center transition-colors
              ${activeSlot === index ? "text-blue-500" : "text-gray-700 group-hover:text-blue-500"}`}>
              <span className="text-4xl font-light mb-2">+</span>
              <span className="text-xs font-medium uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                {activeSlot === index ? "Targeting..." : "Add Vibe"}
              </span>
            </div>
          )}
          
          {/* Overlay info for filled albums */}
          {album.cover && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center backdrop-blur-sm">
              <p className="font-bold text-sm">{album.title}</p>
              <p className="text-xs text-gray-400">{album.artist}</p>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-blue-400 font-bold">Replace</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AlbumGrid;