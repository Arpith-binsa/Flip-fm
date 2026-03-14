import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { Heart } from "lucide-react";

export default function LikeButton({ likedUserId, likedUsername }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);

        // Check if current user already liked this profile
        const { data: existingLike } = await supabase
          .from("likes")
          .select("id")
          .eq("liker_id", session.user.id)
          .eq("liked_id", likedUserId)
          .maybeSingle();

        setLiked(!!existingLike);
      }

      // Get like count (public)
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("liked_id", likedUserId);

      setLikeCount(count || 0);
    };

    if (likedUserId) init();
  }, [likedUserId]);

  const handleLike = async (e) => {
    e.preventDefault(); // prevent navigating if inside a Link
    e.stopPropagation();
    if (!currentUserId || loading || currentUserId === likedUserId) return;

    setLoading(true);

    if (liked) {
      // Unlike
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("liker_id", currentUserId)
        .eq("liked_id", likedUserId);

      if (!error) {
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      // Like
      const { error } = await supabase
        .from("likes")
        .insert({ liker_id: currentUserId, liked_id: likedUserId });

      if (!error) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);

        // Fire email notification via Edge Function
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.functions.invoke("send-like-notification", {
            body: { 
              liked_user_id: likedUserId,
              liker_id: currentUserId,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
         });
        } catch (err) {
          console.error("Like notification failed:", err);
        }
      }
    }

    setLoading(false);
  };

  const isOwnProfile = currentUserId === likedUserId;

  return (
    <button
      onClick={handleLike}
      disabled={loading || !currentUserId || isOwnProfile}
      title={isOwnProfile ? "Can't like your own crate" : liked ? "Unlike" : "Like this crate"}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-bold text-xs uppercase tracking-widest
        ${liked
          ? "bg-pink-500/20 border-pink-500/40 text-pink-400 hover:bg-pink-500/30"
          : "bg-white/5 border-white/10 text-gray-400 hover:border-pink-500/30 hover:text-pink-400"
        }
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Heart
        size={13}
        fill={liked ? "currentColor" : "none"}
        className={loading ? "animate-pulse" : ""}
      />
      <span>{likeCount > 0 ? likeCount : ""}</span>
      <span>{liked ? "Liked" : "Like"}</span>
    </button>
  );
}