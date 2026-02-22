import { useState } from "react";
// Import icons if you use them, otherwise use the SVGs below
import { Eye, EyeOff } from "lucide-react"; 

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 2. Proceed with Supabase Auth
    // const { data, error } = await supabase.auth.signUp({ email, password })
    // ... rest of your signup logic
  };

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      {/* EMAIL FIELD */}
      <input 
        type="email" 
        placeholder="Email" 
        className="bg-zinc-900 p-4 rounded-2xl border border-white/5"
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* PASSWORD FIELD */}
      <div className="relative">
        <input 
          type={showPassword ? "text" : "password"} 
          placeholder="Password" 
          className="bg-zinc-900 p-4 rounded-2xl border border-white/5 w-full"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button 
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* CONFIRM PASSWORD FIELD */}
      <div className="relative">
        <input 
          type={showPassword ? "text" : "password"} 
          placeholder="Confirm Password" 
          className="bg-zinc-900 p-4 rounded-2xl border border-white/5 w-full"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-red-500 text-xs font-bold uppercase italic">{error}</p>}

      <button onClick={handleSignup} className="bg-white text-black p-4 rounded-2xl font-black uppercase italic tracking-widest">
        Join the Flipside
      </button>
    </div>
  );
}