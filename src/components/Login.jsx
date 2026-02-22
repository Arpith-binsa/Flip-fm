import { useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // This logs in directly without sending an email
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Error: " + error.message);
      setLoading(false);
    } else {
      // Success! The App component handles the rest.
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-white p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Flip-FM</h2>
        <p className="text-gray-400 mb-6 text-center">Enter your developer account.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-lg bg-black/50 border border-white/20 focus:border-blue-500 focus:outline-none transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-black/50 border border-white/20 focus:border-blue-500 focus:outline-none transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-red-400">{message}</p>
        )}
      </div>
    </div>
  );
}