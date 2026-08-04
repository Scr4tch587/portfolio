import React, { useState, useEffect } from 'react';
import { SpAddCircle, SpCheckCircle } from './icons/SpotifyIcons';

const LikeButton = ({ isLiked, onToggle, ariaLabel = 'Like', size = 20 }) => {
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    let t;
    if (anim) t = setTimeout(() => setAnim(false), 300);
    return () => clearTimeout(t);
  }, [anim]);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const willLike = !isLiked;
    onToggle && onToggle();
    if (willLike) setAnim(true);
  };

  const svgStyle = { width: size, height: size };

  return (
    <button
      onClick={handleClick}
      aria-label={ariaLabel}
      className="like-button focus:outline-none flex items-center justify-center"
      type="button"
    >
      <span className={`inline-flex items-center justify-center ${anim ? 'like-pop' : ''}`}>
        {/* Spotify's current add-to-liked control: circled + when off, green circled check when on */}
        {isLiked ? (
          <SpCheckCircle size={size} className="text-green-500" style={svgStyle} />
        ) : (
          <SpAddCircle size={size} className="text-[#b3b3b3] hover:text-white" style={svgStyle} />
        )}
      </span>
    </button>
  );
};

export default LikeButton;
