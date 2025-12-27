import React, { useRef, useEffect } from 'react';
import { Instagram, Mail, Music, Headphones, Code } from 'lucide-react';

const SocialsMenu = ({ isOpen, onClose, anchorRef }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) && 
        anchorRef.current && 
        !anchorRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  // Calculate position (basic positioning below anchor)
  const style = {
    top: anchorRef.current ? anchorRef.current.offsetTop + anchorRef.current.offsetHeight + 8 : 0,
    left: anchorRef.current ? anchorRef.current.offsetLeft : 0,
  };

  return (
    <div 
      ref={menuRef}
      className="absolute z-50 bg-[#282828] rounded-md shadow-xl py-1 w-48 border border-[#3e3e3e]"
      style={style}
    >
      <a 
        href="https://www.instagram.com/scr4tchman/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-[#3e3e3e] transition-colors"
      >
        <Instagram size={18} />
        <span>Instagram</span>
      </a>
      <a 
        href="https://kaizhang.substack.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-[#3e3e3e] transition-colors"
      >
        <Headphones size={18} />
        <span>Music Blog</span>
      </a>
      <a 
        href="https://devpost.com/Scr4tch587?ref_content=user-portfolio&ref_feature=portfolio&ref_medium=global-nav" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-[#3e3e3e] transition-colors"
      >
        <Code size={18} />
        <span>Devpost</span>
      </a>
      <a 
        href="mailto:k466zhan@uwaterloo.ca" 
        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-[#3e3e3e] transition-colors"
      >
        <Mail size={18} />
        <span>Email</span>
      </a>
    </div>
  );
};

export default SocialsMenu;
