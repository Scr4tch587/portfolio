import React, { useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const SewringMenu = ({ isOpen, onClose, anchorRef }) => {
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

  const style = {
    top: anchorRef.current ? anchorRef.current.offsetTop + anchorRef.current.offsetHeight + 8 : 0,
    left: anchorRef.current ? anchorRef.current.offsetLeft : 0,
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-[#282828] rounded-md shadow-xl py-2 px-4 w-56 border border-[#3e3e3e] flex items-center gap-3 whitespace-nowrap"
      style={style}
    >
      <a
        href="https://bhuvnesh.me/" /* placeholder: set real left-arrow URL */
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded hover:bg-[#3e3e3e]"
      >
        <ArrowLeft size={16} />
      </a>

      <a
        href="https://se-webring.xyz/" /* placeholder: set real SE Webring URL */
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 text-sm text-gray-200 hover:underline font-bold whitespace-nowrap"
      >
        SE Webring
      </a>

      <a
        href="https://simranthind.me/" /* placeholder: set real right-arrow URL */
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded hover:bg-[#3e3e3e]"
      >
        <ArrowRight size={16} />
      </a>
    </div>
  );
};

export default SewringMenu;
