import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { UserPlus, UserCheck } from "lucide-react";
import { canFollow } from "../lib/followRules";

export default function FollowButton({ profileId, onFollowChange }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      const { data: existingFollow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", session.user.id)
        .eq("following_id", profileId)
        .maybeSingle();

      setFollowing(!!existingFollow);
    };

    if (profileId) init();
  }, [profileId]);

  const handleToggleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading || !canFollow(currentUserId, profileId)) return;

    setLoading(true);

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);

      if (!error) {
        setFollowing(false);
        onFollowChange?.(-1);
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profileId });

      if (!error) {
        setFollowing(true);
        onFollowChange?.(1);
      }
    }

    setLoading(false);
  };

  if (!canFollow(currentUserId, profileId)) return null;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all font-bold text-xs uppercase tracking-widest
        ${following
          ? "bg-white/10 border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
          : "bg-blue-600 border-blue-600 text-white hover:bg-blue-500"
        }
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
