import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient"; // double check your path!
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // NEW: OTP State
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  
  const navigate = useNavigate();

  useEffect(() => {
    let score = 0;
    if (password.length > 6) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setStrength(score);
  }, [password]);

  // PHASE 1: Create the account and trigger the email
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      // Don't navigate away! Just show the OTP input screen.
      setShowOtp(true);
      setLoading(false);
    }
  };

  // PHASE 2: Verify the 6-digit code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      // Success! They are verified and automatically logged in.
      navigate("/onboarding"); 
    }
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
        
        <div className="text-center">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">
            {showOtp ? "Enter Code" : "Join the Crate"}
          </h2>
          <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest font-bold">
            {showOtp ? `Sent to ${email}` : "Create your music identity"}
          </p>
        </div>

        {/* --- OTP VERIFICATION SCREEN --- */}
        {showOtp ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in zoom-in duration-300">
            <div className="space-y-2">
              <input 
                type="text" 
                required
                maxLength={6}
                className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-6 text-center text-3xl tracking-[1em] focus:outline-none focus:border-blue-500 transition-all font-mono"
                placeholder="------"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-full hover:bg-blue-500 transition-all uppercase tracking-tighter text-lg mt-4"
            >
              {loading ? "Verifying..." : "Verify & Enter"}
            </button>
          </form>
        ) : (
          /* --- ORIGINAL SIGN UP SCREEN --- */
          <>
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
                <div 
                  className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 rounded-full ${getMeterColor()}`}
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
          </>
        )}

      </div>
    </div>
  );
}