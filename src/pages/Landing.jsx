import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

// --- MOCK DATA ---
const DEMO_ALBUM = "https://upload.wikimedia.org/wikipedia/en/3/3b/Dark_Side_of_the_Moon.png"; 

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden relative">
      
      {/* --- TOP NAVIGATION --- */}
      <nav className="absolute top-0 right-0 p-8 z-50 flex gap-6 items-center">
        <Link to="/login" className="text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
          Sign In
        </Link>
        <Link to="/signup" className="px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:scale-105 transition-transform">
          Join
        </Link>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="h-screen flex flex-col items-center justify-center relative px-4 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeUp} 
          className="z-10 text-center relative w-full max-w-[90vw]"
        >
          {/* MASSIVE BRANDING */}
          <h1 className="text-[15vw] md:text-[16rem] font-black italic tracking-tighter leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 select-none break-words w-full text-center">
            FLIP-FM
          </h1>
          
          <h2 className="text-xl md:text-3xl font-bold uppercase tracking-[0.2em] text-blue-500 mt-8 mb-4">
            Break the Algorithm.
          </h2>
          
          <p className="text-gray-400 text-lg max-w-lg mx-auto font-medium mb-12">
            No endless feeds. Just 4 albums. <br />
            Show us who you really are.
          </p>

          {/* --- THE NEW HERO CTAs --- */}
          <div className="flex flex-col items-center gap-4">
            <Link to="/signup" className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Start Connecting
            </Link>
            
            {/* Understated Sign In Link */}
            <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
              Have an account? <Link to="/login" className="text-blue-500 hover:text-blue-400 transition-colors">Sign In</Link>
            </div>
          </div>
        </motion.div>
      </section>


      {/* --- THE "REALISTIC" APP DEMO --- */}
      <section className="py-32 px-6 bg-[#080808] border-y border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          
          {/* Left: Copy */}
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }} 
            variants={fadeUp}
          >
            <div className="w-12 h-1 bg-blue-600 mb-8" />
            <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
              Curate. <br /> Don't Consume.
            </h3>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              Streaming services want you to listen to everything. We want you to listen to what matters.
            </p>
            <p className="text-white font-bold text-xl">
              Pick 4 Albums. Define your Era.
            </p>
          </motion.div>
          
          {/* Right: The Interactive Animation */}
          <div className="relative bg-[#111] border border-white/10 rounded-3xl p-8 flex items-center justify-center shadow-2xl overflow-hidden min-h-[400px]">
            
            <div className="w-[320px] h-[320px] relative">
              
              {/* The 2x2 Crate Grid */}
              <div className="grid grid-cols-2 gap-4 w-full h-full">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-black/50 border-2 border-dashed border-white/10 rounded-xl overflow-hidden relative flex items-center justify-center aspect-square">
                    
                    {/* Empty State Text */}
                    <span className="text-white/10 font-black text-2xl">+</span>

                    {/* Slot 1: Fills at 3.0s (0.50 on the timeline) */}
                    {i === 0 && (
                      <motion.img 
                        src={DEMO_ALBUM} 
                        className="absolute inset-0 w-full h-full object-cover z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0, 1, 1, 0] }} 
                        transition={{ 
                          duration: 6, 
                          times: [0, 0.49, 0.50, 0.95, 1], // Instantly appears at 50%
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* THE POPUP SEARCH RESULT */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-[#222] border border-white/20 rounded-xl p-3 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
                transition={{ 
                  duration: 6, 
                  times: [0, 0.24, 0.25, 0.49, 0.50, 1], // Appears at 25% (1.5s), Vanishes at 50% (3.0s)
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <img src={DEMO_ALBUM} className="w-12 h-12 rounded bg-gray-800" />
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Dark Side of the Moon</div>
                  <div className="text-xs text-gray-400 mt-1">Pink Floyd</div>
                </div>
              </motion.div>

              {/* THE GHOST CURSOR (Shifted 0.5s earlier to lead the UI) */}
              <motion.div
                className="absolute top-0 left-0 z-50 pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                animate={{
                  x: [20, 40, 40, 40, 180, 180, 180, 20, 20],   
                  y: [300, 40, 40, 40, 180, 180, 180, 300, 300], 
                  scale: [1, 1, 0.8, 1, 1, 0.8, 1, 1, 1],   // The physical "click" down
                }}
                transition={{
                  duration: 6,
                  ease: "easeInOut",
                  times: [
                    0,     // 0.0s: Start away
                    0.17,  // 1.0s: Arrive at Slot 1
                    0.20,  // 1.2s: PRESS down on Slot 1
                    0.25,  // 1.5s: RELEASE Slot 1 (Popup appears exactly here)
                    0.40,  // 2.4s: Arrive at Popup
                    0.43,  // 2.6s: PRESS down on Popup
                    0.50,  // 3.0s: RELEASE Popup (Popup vanishes & Crate fills exactly here)
                    0.60,  // 3.6s: Move away
                    1      // 6.0s: Loop
                  ], 
                  repeat: Infinity,
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </motion.div>

            </div>
          </div>
        </div>
      </section>


      {/* --- THE TRADEMARK "FLIPSIDE" --- */}
      <section className="py-40 px-6 bg-white text-black relative">
        <div className="max-w-6xl mx-auto text-center">
            <span className="px-4 py-2 border-2 border-black rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block cursor-default">
              Trademark Feature
            </span>
            <h2 className="text-8xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.85] mb-4">
              The Flipside.
            </h2>
            <p className="text-xl font-medium max-w-2xl mx-auto text-gray-600">
              Algorithms are designed to keep you comfortable. <br />
              We are designed to challenge you.
            </p>
            
            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              <div className="bg-gray-100 p-12 rounded-3xl border border-gray-200">
                <div className="text-6xl font-black text-blue-600 mb-2">98%</div>
                <div className="text-xs font-black uppercase tracking-widest text-gray-400">Sync Match</div>
              </div>
              <div className="bg-black text-white p-12 rounded-3xl transform md:scale-105 shadow-2xl">
                <div className="text-6xl font-black text-orange-500 mb-2">12%</div>
                <div className="text-xs font-black uppercase tracking-widest text-gray-500">Flipside Match</div>
              </div>
            </div>
        </div>
      </section>


      {/* --- CTA FOOTER --- */}
      <section className="h-[60vh] flex flex-col items-center justify-center bg-black text-white border-t border-white/10">
        <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter mb-12 text-center">
          Flip the Record.
        </h2>
        <Link to="/signup" className="px-16 py-6 bg-white text-black font-black uppercase tracking-widest text-lg hover:scale-105 transition-transform rounded-full">
          Join Flip-FM
        </Link>
      </section>

    </div>
  );
}