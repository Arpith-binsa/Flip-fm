import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient"; 
import { musicService } from "../services/musicService"; 
import { useNavigate, Link } from "react-router-dom";
import { FaSpotify } from "react-icons/fa";
import GoogleColorIcon from "../components/GoogleColorIcon";
import Cropper from "react-easy-crop";
import { X } from "lucide-react";


import bartGif from "../assets/Bart Simpson Dancing GIF.gif";

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editedBio, setEditedBio] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [deleteSending, setDeleteSending] = useState(false);


  const [showBartAlert, setShowBartAlert] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate("/login");

      setUser(authUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setProfile(profileData);
      setEditedBio(profileData?.bio || "");
      setEditedUsername(profileData?.username || "");

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
        updated_at: new Date(),
      })
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => ({
        ...prev,
        bio: editedBio,
        username: editedUsername,
      }));
      setEditMode(false);
      alert("Profile updated successfully!");
    } else {
      alert("Error updating profile: " + error.message);
    }
  };

  const handleImageSelect = (event) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    const image = await createImage(imageToCrop);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

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
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
    });
  };

  const handleUploadCroppedImage = async () => {
    try {
      setUploading(true);
      const croppedBlob = await createCroppedImage();

      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      await supabase.storage
        .from("profile-pictures")
        .upload(filePath, croppedBlob);

      const { data: { publicUrl } } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(filePath);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      setShowCropper(false);
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
    if (activeSlot === null || !user?.id) return;

    try {
      const genres = await musicService.getAlbumDetails(
        album.album_artist,
        album.album_title
      );

      const { error } = await supabase.from("vibes").upsert(
        {
          user_id: user.id,
          slot_number: activeSlot,
          album_id: album.album_id,
          album_title: album.album_title,
          album_artist: album.album_artist,
          album_cover: album.album_cover,
          album_genres: genres,
        },
        { onConflict: "user_id, slot_number" }
      );

      if (!error) {
        setMyVibes((prev) => [
          ...prev.filter((v) => v.slot_number !== activeSlot),
          { ...album, slot_number: activeSlot, album_genres: genres },
        ]);

        // 🎯 TRIGGER (you can change condition)
        if (album.album_artist.toLowerCase().includes("eminem")) {
          setShowBartAlert(true);
          setTimeout(() => setShowBartAlert(false), 3000);
        }

        setActiveSlot(null);
        setSearchTerm("");
        setResults([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-black mb-10">My Profile</h1>

        {/* CRATE */}
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((slot) => {
            const vibe = myVibes.find(v => v.slot_number === slot);
            return (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className="aspect-square bg-white/5 rounded-xl overflow-hidden"
              >
                {vibe ? (
                  <img src={vibe.album_cover} className="w-full h-full object-cover" />
                ) : "+ Add"}
              </button>
            );
          })}
        </div>

        {/* SEARCH */}
        {activeSlot !== null && (
          <div className="fixed inset-0 bg-black z-50 p-10">
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-3xl bg-transparent border-b w-full"
              placeholder="Search album..."
            />

            {results.map((album) => (
              <div
                key={album.album_id}
                onClick={() => handleSelectAlbum(album)}
                className="p-4 cursor-pointer"
              >
                {album.album_title} — {album.album_artist}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GIF POPUP */}
      {showBartAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
          <div className="bg-[#111] p-8 rounded-3xl text-center animate-scaleIn">
            <img src={bartGif} className="w-40 mx-auto mb-4 rounded-xl" />
            <h2 className="text-xl font-black">LEGEND MOVE</h2>
            <p className="text-gray-400 text-sm">
              Eminem added. Bart approves.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}