import AlbumGrid from './components/AlbumGrid';

function App() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        My Sonic Identity
      </h1>
      
      <AlbumGrid />
      
      <p className="mt-8 text-gray-500 text-sm">
        flip-fm.com
      </p>
    </div>
  )
}

export default App