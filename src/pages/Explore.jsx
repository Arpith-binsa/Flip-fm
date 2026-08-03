import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link } from "react-router-dom";
import LikeButton from "../components/LikeButton";

export default function Explore() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVibes, setMyVibes] = useState([]);

  useEffect(() => {
    const loadExploreData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: myVibeData } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", user.id);
      setMyVibes(myVibeData || []);

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          avatar_url,
          vibes (*)
        `);

      const discoveredUsers = allProfiles
        .filter((p) => p.id !== user.id)
        .map((otherUser) => {
          const score = calculateVibeMatch(myVibeData || [], otherUser.vibes || []);
          return { ...otherUser, matchScore: score };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      setUsers(discoveredUsers);
      setLoading(false);
    };

    loadExploreData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase tracking-tighter">
      Scanning the airwaves...
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center gap-6 mb-4">
          <Link
            to="/dashboard"
            className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors"
          >
            FLIP-FM
          </Link>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">Explore</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Find your musical soulmates</p>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-4">
        {users.map((user) => (
          <div key={user.id} className="relative group">
            <Link
              to={`/u/${user.username}`}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 bg-[#0a0a0a] border border-white/5 p-4 sm:p-6 rounded-3xl hover:bg-white/5 transition-all hover:scale-[1.01] block"
            >
              <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-blue-600 rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black italic uppercase overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    user.username?.[0]
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black tracking-tighter uppercase group-hover:text-blue-500 transition-colors truncate">
                    @{user.username}
                  </h2>
                  <div className="grid grid-cols-2 gap-1 mt-2 w-12 h-12 sm:w-16 sm:h-16">
                    {user.vibes?.slice(0, 4).map((v, i) => (
                      <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/5">
                        <img src={v.album_cover} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pl-16 sm:pl-0">
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                  <div className={`text-2xl sm:text-4xl font-black italic leading-none ${user.matchScore > 70 ? "text-green-400" : "text-white"}`}>
                    {user.matchScore}%
                  </div>
                </div>
                <LikeButton likedUserId={user.id} likedUsername={user.username} />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}