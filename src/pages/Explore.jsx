import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { calculateVibeMatch } from "../vibeMath";
import { Link } from "react-router-dom";

export default function Explore() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVibes, setMyVibes] = useState([]);

  useEffect(() => {
    const loadExploreData = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // 2. Get YOUR vibes first to compare against others
      const { data: myVibeData } = await supabase
        .from('vibes')
        .select('*')
        .eq('user_id', user.id);
      setMyVibes(myVibeData || []);

      // 3. Get all other profiles and their vibes
      // In a real app with millions of users, we'd limit this, but for us, let's grab 'em all!
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          vibes (*)
        `);

      // 4. Calculate matches and filter out yourself
      const discoveredUsers = allProfiles
        .filter(p => p.id !== user.id)
        .map(otherUser => {
          const score = calculateVibeMatch(myVibeData || [], otherUser.vibes || []);
          return { ...otherUser, matchScore: score };
        })
        .sort((a, b) => b.matchScore - a.matchScore); // HIGHEST matches first

      setUsers(discoveredUsers);
      setLoading(false);
    };

    loadExploreData();
  }, []);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase tracking-tighter">Scanning the airwaves...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="max-w-4xl mx-auto mb-12">
        <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">Explore</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Find your musical soulmates</p>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-4">
        {users.map(user => (
          <Link 
            to={`/u/${user.username}`} 
            key={user.id}
            className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl hover:bg-white/5 transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black italic uppercase overflow-hidden">
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.username?.[0]}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase group-hover:text-blue-500 transition-colors">@{user.username}</h2>
                <div className="flex gap-1 mt-1">
                  {user.vibes?.slice(0, 4).map((v, i) => (
                    <div key={i} className="w-6 h-6 rounded-md bg-white/10 overflow-hidden border border-white/5">
                      <img src={v.album_cover} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
              <div className={`text-4xl font-black italic leading-none ${user.matchScore > 70 ? 'text-green-400' : 'text-white'}`}>
                {user.matchScore}%
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}