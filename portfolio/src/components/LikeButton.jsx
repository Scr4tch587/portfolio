import React, { useState, useEffect } from 'react';

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
        {isLiked ? (
          <svg viewBox="0 0 24 24" style={svgStyle} className="text-red-500" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-7.633-4.872-10.123-7.238C-0.29 10.9 2.624 6 6.5 6c2.042 0 3.356 1.03 5.5 3.09C13.144 7.03 14.458 6 16.5 6 20.376 6 23.29 10.9 22.123 13.762 19.633 16.128 12 21 12 21z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" style={svgStyle} className="text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M20.8 8.6c0 5.6-8.8 11-8.8 11s-8.8-5.4-8.8-11a5 5 0 0 1 8.8-3.2A5 5 0 0 1 20.8 8.6z" />
          </svg>
        )}
      </span>
    </button>
  );
};

export default LikeButton;
