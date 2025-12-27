import React from 'react';
import { Home, Search, Library, Plus, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="w-64 bg-black h-screen p-2 flex flex-col gap-2 text-gray-400 fixed left-0 top-0">
      <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
        <Link to="/" className="flex items-center gap-4 hover:text-white transition-colors">
          <Home size={24} />
          <span className="font-bold">Home</span>
        </Link>
        <div className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer">
          <Search size={24} />
          <span className="font-bold">Search</span>
        </div>
      </div>

      <div className="bg-[#121212] rounded-lg p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex justify-between items-center text-gray-400">
          <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
            <Library size={24} />
            <span className="font-bold">Your Library</span>
          </div>
          <div className="flex gap-2">
            <Plus size={20} className="hover:text-white cursor-pointer" />
          </div>
        </div>

        {/* Categories / "Playlists" */}
        <div className="flex gap-2 mt-2">
           <span className="bg-[#232323] px-3 py-1 rounded-full text-sm text-white hover:bg-[#2a2a2a] cursor-pointer transition-colors">Playlists</span>
           <span className="bg-[#232323] px-3 py-1 rounded-full text-sm text-white hover:bg-[#2a2a2a] cursor-pointer transition-colors">Artists</span>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
           {/* Mock List Items */}
           <div className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
              <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-500 rounded flex items-center justify-center text-white">
                <Heart size={20} fill="white" />
              </div>
              <div className="flex flex-col">
                  <span className="text-white font-medium group-hover:text-green-500 transition-colors">Liked Songs</span>
                  <span className="text-sm text-gray-400">Playlist • 123 songs</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer">
              <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center text-white">
                 <span className="font-bold text-lg">P</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-white font-medium">Projects 2024</span>
                  <span className="text-sm text-gray-400">Playlist • You</span>
              </div>
           </div>

           <div className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer">
              <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center text-white">
                 <span className="font-bold text-lg">R</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-white font-medium">Resume / CV</span>
                  <span className="text-sm text-gray-400">Artist • You</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
