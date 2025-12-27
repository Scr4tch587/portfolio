import React from 'react';
import { Play } from 'lucide-react';

/**
 * StreamToast - Non-blocking toast that appears above the PlayerBar
 * Shows at 5 seconds with auto-confirm after 1 second
 * 
 * @param {boolean} show - Whether to display the toast
 * @param {Function} onConfirm - Called when user clicks "Stream" or auto-confirms
 * @param {number} countdown - Milliseconds until auto-confirm (for progress bar)
 */
const StreamToast = ({ show, onConfirm, countdown }) => {
  if (!show) return null;

  const progressPercentage = countdown > 0 ? ((1000 - countdown) / 1000) * 100 : 100;

  return (
    <div 
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] animate-slide-up"
      style={{
        animation: show ? 'slideUp 0.3s ease-out' : 'none'
      }}
    >
      <div className="bg-[#282828] text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-4 min-w-[280px]">
        <Play size={16} className="text-green-500 flex-shrink-0" fill="currentColor" />
        <span className="text-sm font-medium flex-1">Stream this project?</span>
        <button
          onClick={onConfirm}
          className="px-3 py-1 bg-white text-black rounded-full text-xs font-bold hover:scale-105 transition-transform active:scale-95"
        >
          Stream
        </button>
      </div>
      {/* Progress bar for auto-confirm */}
      <div className="w-full h-0.5 bg-[#1a1a1a] mt-1 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-100 ease-linear"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default StreamToast;
