import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link, useNavigate } from "react-router-dom";
import { Settings, Sparkles, X, Heart } from "lucide-react";
import { FaSpotify } from "react-icons/fa";
import GoogleColorIcon from "../components/GoogleColorIcon";
import LikeButton from "../components/LikeButton";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [syncMatches, setSyncMatches] = useState([]);
  const [flipsideMatches, setFlipsideMatches] = useState([]);
  const [whoLikedMe, setWhoLikedMe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLuckyModal, setShowLuckyModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);

      const { data: myVibeData } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", user.id);

      setMyVibes(myVibeData || []);

      // Fetch who liked me (private — only I see this)
      const { data: likeData } = await supabase
        .from("likes")
        .select("liker_id, created_at, profiles!likes_liker_id_fkey(id, username, avatar_url)")
        .eq("liked_id", user.id)
        .order("created_at", { ascending: false });

      setWhoLikedMe(likeData || []);

      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url");

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        setLoading(false);
        return;
      }

      if (!allProfiles || allProfiles.length === 0) {
        setSyncMatches([]);
        setFlipsideMatches([]);
        setLoading(false);
        return;
      }

      const { data: allVibes, error: vibesError } = await supabase
        .from("vibes")
        .select("*");

      if (vibesError) {
        console.error("Error loading vibes:", vibesError);
        setLoading(false);
        return;
      }

      const profilesWithVibes = allProfiles.map((profile) => ({
        ...profile,
        vibes: (allVibes || []).filter((v) => v.user_id === profile.id),
      }));

      const matches = profilesWithVibes
        .filter((p) => p.id !== user.id && p.vibes?.length > 0)
        .map((otherUser) => {
          const score = calculateVibeMatch(myVibeData || [], otherUser.vibes || []);
          return { ...otherUser, matchScore: score };
        });

      const sorted = matches.sort((a, b) => b.matchScore - a.matchScore);
      const sync = sorted.filter((m) => m.matchScore >= 15);
      const flipside = sorted.filter((m) => m.matchScore <= 14).reverse();

      setSyncMatches(sync);
      setFlipsideMatches(flipside.slice(0, 15));

      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const handleFeelingLucky = async () => {
    try {
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("username")
        .neq("id", currentUser.id);

      if (allUsers && allUsers.length > 0) {
        const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
        navigate(`/u/${randomUser.username}`);
        setShowLuckyModal(false);
      }
    } catch (error) {
      console.error("Error finding random user:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl font-black italic uppercase tracking-tighter animate-pulse">
            FLIP-FM
          </div>
          <div className="text-sm text-gray-500 uppercase tracking-widest">
            Loading your crate...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">

      {/* HEADER */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors">
              FLIP-FM
            </Link>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                Your Crate
              </h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">
                Welcome back, @{currentUser?.username}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowLuckyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full transition-all text-xs uppercase tracking-widest font-bold shadow-lg"
            >
              <Sparkles size={14} />
              Feeling Lucky
            </button>
            <button
              onClick={() => navigate("/my-profile")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-xs uppercase tracking-widest font-bold"
            >
              <Settings size={14} />
              Edit Crate
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* WHO LIKED YOU — private, only visible to you */}
        {whoLikedMe.length > 0 && (
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Who Liked Your Crate</h2>
              <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full">
                <span className="text-pink-400 text-[10px] font-black uppercase tracking-widest">
                  {whoLikedMe.length} {whoLikedMe.length === 1 ? "like" : "likes"}
                </span>
              </div>
              <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Only visible to you</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {whoLikedMe.map((like) => {
                const liker = like.profiles;
                if (!liker) return null;
                return (
                  <Link
                    key={like.liker_id}
                    to={`/u/${liker.username}`}
                    className="flex items-center gap-3 bg-[#0a0a0a] border border-pink-500/20 hover:border-pink-500/50 rounded-2xl px-4 py-3 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 overflow-hidden flex items-center justify-center text-sm font-black flex-shrink-0">
                      {liker.avatar_url ? (
                        <img src={liker.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        liker.username?.[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-bold group-hover:text-pink-400 transition-colors">
                      @{liker.username}
                    </span>
                    <Heart size={12} className="text-pink-500" fill="currentColor" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* YOUR 4 ALBUMS PREVIEW */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Your Identity</h2>
            <Link
              to="/my-profile"
              className="text-xs text-blue-500 uppercase tracking-widest font-bold hover:text-blue-400"
            >
              Edit →
            </Link>
          </div>

          <div className="w-full max-w-[600px] mx-auto aspect-square relative">
            <div className="grid grid-cols-2 gap-4 w-full h-full">
              {[0, 1, 2, 3].map((slot) => {
                const vibe = myVibes.find((v) => v.slot_number === slot);
                return (
                  <div key={slot} className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 relative group">
                    {vibe ? (
                      <>
                        <img src={vibe.album_cover} className="w-full h-full object-cover" alt={vibe.album_title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute top-2 right-2 flex gap-2">
                            <a
                              href={`https://open.spotify.com/search/${encodeURIComponent(vibe.album_title + " " + vibe.album_artist)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 bg-[#1DB954] hover:bg-[#1ed760] rounded-full flex items-center justify-center transition-all shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FaSpotify size={18} className="text-white" />
                            </a>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(vibe.album_title + " " + vibe.album_artist + " album")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-all shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GoogleColorIcon size={16} />
                            </a>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-sm font-bold line-clamp-2">{vibe.album_title}</p>
                            <p className="text-xs text-gray-400 line-clamp-1 mt-1">{vibe.album_artist}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl text-white/10 font-black">+</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Profile Picture Overlay */}
            <div className="absolute bottom-0 left-0 w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden shadow-2xl transform translate-y-1/4 translate-x-[-0.5rem]">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt={currentUser.username} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white">
                  {currentUser?.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SYNC MATCHES */}
        <section className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Sync Matches</h2>
              <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                <span className="text-green-400 text-[10px] font-black uppercase tracking-widest"></span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">People with similar taste.</p>
          </div>

          {syncMatches.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                No high matches yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {syncMatches.map((user) => (
                <Link
                  to={`/u/${user.username}`}
                  key={user.id}
                  className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:bg-white/5 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-green-400 transition-colors">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                      <div className="text-4xl font-black text-green-400">
                        {user.matchScore}%
                      </div>
                    </div>
                    <LikeButton likedUserId={user.id} likedUsername={user.username} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* FLIPSIDE MATCHES */}
        <section>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Flipside Matches</h2>
              <div className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                <span className="text-orange-400 text-[10px] font-black uppercase tracking-widest"></span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">People with different taste. Break your echo chamber.</p>
          </div>

          {flipsideMatches.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-500 uppercase tracking-widest text-xs">
                No flipside matches yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {flipsideMatches.map((user) => (
                <Link
                  to={`/u/${user.username}`}
                  key={user.id}
                  className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:bg-white/5 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-orange-400 transition-colors">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                      <div className="text-4xl font-black text-orange-400">
                        {user.matchScore}%
                      </div>
                    </div>
                    <LikeButton likedUserId={user.id} likedUsername={user.username} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* FEELING LUCKY MODAL */}
      {showLuckyModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-3xl p-8 relative">
            <button
              onClick={() => setShowLuckyModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles size={40} className="text-white" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter">Feeling Lucky?</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Discover someone completely random on Flip-FM. Break out of your echo chamber and explore new musical worlds. You never know who you'll find!
              </p>
              <div className="flex justify-center gap-4 text-xs uppercase tracking-widest font-bold">
                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10">🎲 Random Discovery</div>
                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10">🌍 Anyone on Flip-FM</div>
              </div>
              <button
                onClick={handleFeelingLucky}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full text-lg font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-purple-500/50"
              >
                Take Me There! ✨
              </button>
              <button
                onClick={() => setShowLuckyModal(false)}
                className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}