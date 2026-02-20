import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      
      {/* Navigation */}
      <nav className="flex justify-between items-center p-8 z-10">
        <div className="text-2xl font-bold tracking-tighter italic">Flip-FM</div>
        <div className="flex items-center space-x-6">
          <Link to="/login" className="text-gray-400 hover:text-white transition uppercase text-xs font-bold tracking-widest">
            Sign In
          </Link>
          <Link to="/signup" className="bg-white text-black px-6 py-2 rounded-full font-black hover:bg-blue-500 hover:text-white transition uppercase text-xs tracking-tighter">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 z-10">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6">
          YOUR VIBE.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 italic">
            VISUALIZED.
          </span>
        </h1>
        <p className="text-xl text-gray-500 max-w-lg mb-10 font-medium">
          Flip-FM is the digital record crate for your life. 
          Curate your top 4 albums, connect with friends, and discover music through taste.
        </p>
        
        {/* Main CTA Stack */}
        <div className="flex flex-col items-center gap-4">
          <Link to="/signup" className="px-10 py-5 bg-blue-600 rounded-2xl font-black text-xl hover:bg-blue-500 hover:scale-105 transition transform uppercase tracking-tighter">
            Create Your Profile
          </Link>

          {/* The "Think Box" - Subtle secondary option */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold">Already have an account ?</span>
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors font-bold border-b border-gray-800 hover:border-blue-500 pb-0.5">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Background Ambience (Untouched) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}