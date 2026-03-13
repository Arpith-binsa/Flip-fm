import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient"; 
import { musicService } from "../services/musicService"; 
import { useNavigate, Link } from "react-router-dom";
import { FaSpotify } from "react-icons/fa";
import GoogleColorIcon from "../components/GoogleColorIcon";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";

// Helper function to create image element
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // User profile data
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [editMode, setEditMode] = useState(false); // Toggle edit mode
  const [editedBio, setEditedBio] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null); // Image selected for cropping
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate("/login");
      
      setUser(authUser);

      // Get profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      
      setProfile(profileData);
      setEditedBio(profileData?.bio || "");
      setEditedUsername(profileData?.username || "");

      // Get vibes
      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", authUser.id);
      setMyVibes(data || []);
    };
    checkAuth();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        bio: editedBio,
        username: editedUsername,
        updated_at: new Date()
      })
      .eq("id", user.id);

    if (!error) {
      setProfile(prev => ({ ...prev, bio: editedBio, username: editedUsername }));
      setEditMode(false);
      alert("Profile updated successfully!");
    } else {
      alert("Error updating profile: " + error.message);
    }
  };

  const handleImageSelect = (event) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = () => {
      setImageToCrop(reader.result);
      setShowCropper(true);
    };
    
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const image = await createImage(imageToCrop);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });
    } catch (e) {
      console.error('Error creating cropped image:', e);
      return null;
    }
  };

  const handleUploadCroppedImage = async () => {
    try {
      setUploading(true);
      
      const croppedBlob = await createCroppedImage();
      if (!croppedBlob) {
        throw new Error('Failed to crop image');
      }

      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setShowCropper(false);
      setImageToCrop(null);
      alert("Profile picture updated!");
    } catch (error) {
      alert("Error uploading image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.length < 2) return setResults([]);
    const delay = setTimeout(async () => {
      const albums = await musicService.searchAlbums(searchTerm);
      setResults(albums);
    }, 400); 
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleSelectAlbum = async (album) => {
    // FIXED: Use optional chaining and explicit user.id check to stop the crash
    if (activeSlot === null || !user?.id) {
      console.error("User session not loaded yet or no slot selected.");
      return;
    }

    try {
      const genres = await musicService.getAlbumDetails(album.album_artist, album.album_title);

      // FIXED: onConflict ensures you can overwrite existing slots
      const { error } = await supabase.from("vibes").upsert(
        {
          user_id: user.id, // Correct path based on our state
          slot_number: activeSlot,
          album_id: album.album_id,
          album_title: album.album_title,
          album_artist: album.album_artist,
          album_cover: album.album_cover,
          album_genres: genres, 
        },
        { onConflict: 'user_id, slot_number' }
      );

      if (!error) {
        const newVibe = { 
          ...album, 
          slot_number: activeSlot, 
          user_id: user.id,
          album_genres: genres 
        };
        
        setMyVibes(prev => [
          ...prev.filter(v => v.slot_number !== activeSlot), 
          newVibe
        ]);
        
        setActiveSlot(null);
        setSearchTerm("");
        setResults([]);
      }
    } catch (err) {
      console.error("Selection failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link 
              to="/dashboard" 
              className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors"
            >
              FLIP-FM
            </Link>
            
            {/* Page Title */}
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">My Profile</h1>
              <p className="text-gray-500 font-medium">Manage your identity and crate.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-xs font-bold uppercase tracking-widest px-6 py-3 border border-white/10 rounded-full hover:bg-white/5 transition-all"
          >
            Back to Dashboard
          </button>
        </div>

        {/* PROFILE DETAILS SECTION */}
        <section className="mb-16 bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Profile Details</h2>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs font-bold uppercase tracking-widest px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-all"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedBio(profile?.bio || "");
                    setEditedUsername(profile?.username || "");
                  }}
                  className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="text-xs font-bold uppercase tracking-widest px-4 py-2 bg-green-600 hover:bg-green-500 rounded-full transition-all"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-black uppercase overflow-hidden mb-4 relative group">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  profile?.username?.[0] || "?"
                )}
                
                {/* Upload overlay */}
                {editMode && (
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-white">
                      {uploading ? "Uploading..." : "Change Photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Profile Picture</p>
            </div>

            {/* Username & Bio */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Username */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                  Username
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value.toLowerCase())}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="username"
                  />
                ) : (
                  <p className="text-2xl font-black tracking-tighter">@{profile?.username}</p>
                )}
                {editMode && (
                  <p className="text-xs text-yellow-500 mt-1">⚠️ Changing username will affect your profile URL</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                  Bio
                </label>
                {editMode ? (
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-blue-500 transition-all resize-none"
                    placeholder="Tell the world about yourself and what you listen to..."
                    maxLength={200}
                  />
                ) : (
                  <p className="text-gray-400">{profile?.bio || "No bio yet."}</p>
                )}
                {editMode && (
                  <p className="text-xs text-gray-500 mt-1">{editedBio.length}/200 characters</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* YOUR CRATE SECTION */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Your Crate</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Click any album to change it</p>
          </div>
        
          {/* 2x2 SQUARE GRID */}
          <div className="w-full max-w-[600px] mx-auto aspect-square relative">
            <div className="grid grid-cols-2 gap-4 w-full h-full">
            {[0, 1, 2, 3].map((slot) => {
              const vibe = myVibes.find(v => v.slot_number === slot);
              return (
                <button 
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  className={`aspect-square rounded-2xl border-2 transition-all overflow-hidden flex items-center justify-center relative group ${
                    activeSlot === slot ? "border-blue-500 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "border-white/5 hover:border-white/20"
                  } ${slot === 2 ? 'peer' : ''}`}
                >
                  {vibe ? (
                    <>
                      <img src={vibe.album_cover} className="w-full h-full object-cover" alt={vibe.album_title} />
                      
                      {/* Hover overlay with album info */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                        {/* Top-right icons */}
                        <div className="absolute top-2 right-2 flex gap-2">
                          {/* Spotify Button */}
                          <a
                            href={`https://open.spotify.com/search/${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-[#1DB954] hover:bg-[#1ed760] rounded-full flex items-center justify-center transition-all shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaSpotify size={18} className="text-white" />
                          </a>
                          
                          {/* Google Search Button */}
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(vibe.album_title + ' ' + vibe.album_artist + ' album')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-all shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GoogleColorIcon size={16} />
                          </a>
                        </div>
                        
                        {/* Album info */}
                        <p className="text-sm font-bold text-center line-clamp-2 mb-1">{vibe.album_title}</p>
                        <p className="text-xs text-gray-400 text-center line-clamp-1">{vibe.album_artist}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-3">Click to Change</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-6xl font-black text-white/10 group-hover:text-white/30 transition-colors">+</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-2">Add Album</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Profile Picture Overlay - Bottom Left */}
          <div className="absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden shadow-2xl transform translate-y-1/4 translate-x-[-0.5rem] transition-opacity duration-300 peer-hover:opacity-0 pointer-events-none">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
                {profile?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>
        </section>
      </div>

      {/* SEARCH OVERLAY */}
      {activeSlot !== null && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 p-6 flex flex-col items-center">
          <button 
            onClick={() => { setActiveSlot(null); setSearchTerm(""); }} 
            className="absolute top-10 right-10 text-gray-500 hover:text-white text-xs font-black uppercase tracking-widest"
          >
            Cancel
          </button>
          
          <input 
            autoFocus
            className="bg-transparent border-b-2 border-white/10 text-4xl md:text-6xl font-black w-full max-w-3xl py-8 focus:outline-none focus:border-blue-500 placeholder:text-white/5 mt-20 text-center"
            placeholder="TYPE ALBUM NAME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 w-full max-w-3xl overflow-y-auto pb-20">
            {results.map(album => (
              <div 
                key={album.album_id} 
                onClick={() => handleSelectAlbum(album)}
                className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/50 border border-transparent transition-all cursor-pointer group"
              >
                <img src={album.album_cover} className="w-16 h-16 rounded-lg object-cover shadow-xl" alt="" />
                <div>
                  <h3 className="font-bold leading-tight group-hover:text-blue-400">{album.album_title}</h3>
                  <p className="text-sm text-gray-500">{album.album_artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IMAGE CROPPER MODAL */}
      {showCropper && imageToCrop && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col">
          {/* Header */}
          <div className="p-6 flex justify-between items-center border-b border-white/10">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Crop Your Photo</h2>
            <button
              onClick={() => {
                setShowCropper(false);
                setImageToCrop(null);
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cropper Area */}
          <div className="flex-1 relative">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="p-6 border-t border-white/10 space-y-4">
            {/* Zoom Slider */}
            <div className="max-w-md mx-auto">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 max-w-md mx-auto">
              <button
                onClick={() => {
                  setShowCropper(false);
                  setImageToCrop(null);
                }}
                className="flex-1 text-xs font-bold uppercase tracking-widest px-6 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadCroppedImage}
                disabled={uploading}
                className="flex-1 text-xs font-bold uppercase tracking-widest px-6 py-4 bg-blue-600 hover:bg-blue-500 rounded-full transition-all disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}