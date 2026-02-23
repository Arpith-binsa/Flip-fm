import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const navigate = useNavigate();

  const handleFinish = async () => {
    console.log("Finish button clicked. Attempting to save...");
    
    // 1. Get the current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth Error:", userError);
      alert("Session expired. Please log in again.");
      return;
    }

    // 2. Update the profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ 
        username: username, 
        bio: bio, 
        updated_at: new Date() 
      })
      .eq('id', user.id);

    if (!error) {
       console.log("Profile updated successfully!");
       // Send them to pick their 4 albums!
       navigate("/tutorial");
    } else {
       console.error("Supabase Database Error:", error);
       alert("Error saving profile: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative z-50">
      <div className="w-full max-w-md space-y-12">
        
        {/* Progress Dots */}
        <div className="flex justify-center gap-3">
          <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step === 1 ? "bg-blue-500" : "bg-white/20"}`}></div>
          <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step === 2 ? "bg-blue-500" : "bg-white/20"}`}></div>
        </div>

        {step === 1 ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2 text-center">
              <h2 className="text-5xl font-black tracking-tighter">CLAIM YOUR HANDLE.</h2>
              <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Step 01 — Identity</p>
            </div>
            <input 
              type="text"
              placeholder="username"
              className="w-full bg-white/5 border-b-2 border-white/10 p-4 text-2xl text-center focus:border-blue-500 outline-none transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
            <button 
              onClick={() => {
                console.log("Moving to Step 2");
                setStep(2);
              }}
              disabled={username.length < 3}
              className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all disabled:opacity-20 uppercase tracking-tighter text-lg pointer-events-auto"
            >
              Next Step
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="space-y-2 text-center">
              <h2 className="text-5xl font-black tracking-tighter">SET THE VIBE.</h2>
              <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Step 02 — Bio</p>
            </div>
            <textarea 
              placeholder="Tell the world about yourself and what you listen to."
              className="w-center bg-white/5 border-2 border-white/10 p-6 rounded-3xl h-40 focus:border-blue-500 outline-none transition-colors text-lg"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <button 
              onClick={handleFinish}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-tighter text-lg pointer-events-auto"
            >
              Create My Crate
            </button>
            <button 
              onClick={() => setStep(1)}
              className="w-full text-gray-500 font-bold uppercase text-xs tracking-widest hover:text-white transition-colors"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}