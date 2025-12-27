import React from 'react';

const SecondaryCapsuleButton = ({ href, ariaLabel, tooltip, children, newTab = true, download = false }) => {
  const target = newTab ? '_blank' : undefined;
  const rel = newTab ? 'noopener noreferrer' : undefined;

  return (
    <div className="relative group">
      <a
        href={href}
        target={target}
        rel={rel}
        download={download}
        aria-label={ariaLabel}
        className="capsule inline-flex items-center justify-center min-w-[44px] min-h-[56px] px-3 py-3 rounded-md border border-[#2a2a2a] bg-[#181818] text-gray-200 hover:bg-[#222] active:scale-95 focus:outline-none transition-all duration-150"
      >
        <span className="capsule-icon w-6 h-6 flex items-center justify-center transform transition-transform duration-150 group-hover:-translate-y-1">
          {children}
        </span>
      </a>

      {/* Tooltip */}
      <div className="capsule-tooltip absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max opacity-0 pointer-events-none group-hover:opacity-100 text-xs text-white bg-black/80 px-2 py-1 rounded-lg transform translate-y-1 group-hover:translate-y-0 transition-all duration-180">
        {tooltip}
      </div>
    </div>
  );
};

export default SecondaryCapsuleButton;
