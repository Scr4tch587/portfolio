import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

/**
 * StreamToast - Non-blocking toast that appears above the PlayerBar
 * Shows at 5 seconds with different behavior for first vs subsequent streams
 * 
 * @param {boolean} show - Whether to display the toast
 * @param {Function} onConfirm - Called when user clicks "Stream" or auto-confirms
 * @param {number} countdown - Milliseconds until auto-confirm (for progress bar)
 * @param {boolean} isFirstStream - Whether this is the user's first stream
 */
const StreamToast = ({ show, onConfirm, countdown, isFirstStream = false }) => {
  const [visible, setVisible] = useState(show);
  const [animState, setAnimState] = useState('enter'); // 'enter' | 'exit'
  const ENTER_MS = 260;
  const EXIT_MS = 220;

  useEffect(() => {
    if (show) {
      setVisible(true);
      // small timeout to allow mounting then add enter class
      setTimeout(() => setAnimState('enter'), 10);
    } else if (visible) {
      // trigger exit animation then remove
      setAnimState('exit');
      const t = setTimeout(() => setVisible(false), EXIT_MS + 20);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!visible) return null;

  const maxDuration = isFirstStream ? 3000 : 1500;
  const progressPercentage = countdown > 0 ? ((maxDuration - countdown) / maxDuration) * 100 : 100;

  const containerClass = animState === 'enter' ? 'toast-enter toast-enter-active' : 'toast-exit toast-exit-active';

  return (
    <div className="fixed inset-x-0 bottom-28 flex justify-center z-[60] pointer-events-none">
      <div className={`flex flex-col items-center pointer-events-auto ${containerClass}`}>
        <div className="bg-[#282828] text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-4 w-[320px]">
          <Play size={16} className="text-green-500 shrink-0" fill="currentColor" />
          <span className="text-sm font-medium flex-1">
            {isFirstStream ? 'Stream this project?' : 'Project streamed!'}
          </span>
          {isFirstStream && (
            <button
              onClick={onConfirm}
              className="px-3 py-1 bg-white text-black rounded-full text-xs font-bold hover:scale-105 transition-transform active:scale-95"
            >
              Stream
            </button>
          )}
        </div>

        {/* Progress bar for auto-confirm: only show for first-stream toast, placed directly under the toast */}
        {isFirstStream && (
          <div className="w-[320px] h-0.5 bg-[#1a1a1a] mt-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamToast;
