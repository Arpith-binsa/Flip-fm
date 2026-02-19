import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      
      {/* Navigation */}
      <nav className="flex justify-between items-center p-8 z-10">
        <div className="text-2xl font-bold tracking-tighter">Flip-FM</div>
        <div className="space-x-4">
          <Link to="/login" className="text-gray-400 hover:text-white transition">Sign In</Link>
          <Link to="/signup" className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 z-10">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6">
          YOUR VIBE.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
            VISUALIZED.
          </span>
        </h1>
        <p className="text-xl text-gray-500 max-w-lg mb-10">
          Flip-FM is the digital record crate for your life. 
          Curate your top 4 albums, connect with friends, and discover music through taste, not algorithms.
        </p>
        
        <Link to="/signup" className="px-8 py-4 bg-blue-600 rounded-full font-bold text-lg hover:bg-blue-500 hover:scale-105 transition transform">
          Create Your Profile
        </Link>
      </div>

      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}