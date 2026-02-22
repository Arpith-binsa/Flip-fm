import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

export default function Explore() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch all profiles so we can list them
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio');
      
      if (data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-2">
          <h1 className="text-6xl font-black tracking-tighter italic uppercase">Explore Crates</h1>
          <p className="text-blue-500 font-mono text-xs tracking-[0.3em] uppercase">Discover what the community is spinning.</p>
        </header>

        <div className="grid gap-6">
          {users.map((user) => (
            <Link 
              key={user.username} 
              to={`/u/${user.username}`}
              className="group block bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-blue-600/10 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-tight group-hover:text-blue-400 transition-colors uppercase italic">
                    {user.username}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">{user.bio || "No bio yet."}</p>
                </div>
                <div className="text-blue-500 font-black text-xl opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
                  VIEW CRATE →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}