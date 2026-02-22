import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient"; 
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react"; // Make sure to npm install lucide-react

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // NEW
  const [showPassword, setShowPassword] = useState(false); // NEW
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  
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

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    // NEW: Match Check
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      setShowOtp(true);
      setLoading(false);
    }
  };

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

              {/* PASSWORD FIELD WITH SHOW BUTTON */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div 
                  className={`absolute bottom-0 left-0 h-[2px] transition-all duration-500 rounded-full ${getMeterColor()}`}
                  style={{ width: `${(strength / 3) * 100}%` }}
                ></div>
              </div>

              {/* CONFIRM PASSWORD FIELD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirm Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
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