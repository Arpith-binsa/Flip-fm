import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Password Strength Logic
  useEffect(() => {
    let score = 0;
    if (password.length > 6) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setStrength(score);
  }, [password]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else {
      alert("Check your email for the verification link!");
      navigate("/login");
    }
    setLoading(false);
  };

  const getMeterColor = () => {
    if (strength === 0) return "bg-gray-800";
    if (strength === 1) return "bg-red-500";
    if (strength === 2) return "bg-yellow-500";
    return "bg-gradient-to-r from-blue-500 to-purple-600";
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">Join the Crate</h2>
          <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest font-bold">Create your music identity</p>
        </div>

        {/* Social Placeholders (Visual Only for now) */}
        <div className="space-y-3">
          <button className="w-full py-3 px-4 border border-white/20 rounded-full flex items-center justify-center gap-3 font-bold hover:bg-white/5 transition">
            <span className="text-xl">G</span> Continue with Google
          </button>
          <button className="w-full py-3 px-4 border border-white/20 rounded-full flex items-center justify-center gap-3 font-bold hover:bg-white/5 transition">
            <span className="text-xl"></span> Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 text-gray-700">
          <div className="h-px bg-gray-800 flex-1"></div>
          <span className="text-xs font-bold uppercase tracking-widest">or</span>
          <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSignUp} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 transition-all"
              placeholder="name@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 transition-all"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* The Strength Meter Bar */}
            <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 ${getMeterColor()}`}
                 style={{ width: `${(strength / 3) * 100}%` }}
            ></div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-black py-4 rounded-full hover:bg-blue-600 hover:text-white transition-all uppercase tracking-tighter text-lg mt-4"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm">
          Already have an account? <Link to="/login" className="text-white font-bold hover:text-blue-500 underline underline-offset-4">Sign In</Link>
        </p>
      </div>
    </div>
  );
}