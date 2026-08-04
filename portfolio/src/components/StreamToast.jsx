import React, { useEffect, useState } from 'react';
import { SpPlay } from './icons/SpotifyIcons';

/**
 * StreamToast - Non-blocking, purely informational toast above the PlayerBar.
 * Appears once per playthrough when the stream is confirmed (5s continuous).
 *
 * @param {boolean} show - Whether to display the toast
 */
const StreamToast = ({ show }) => {
  const [visible, setVisible] = useState(show);
  const [animState, setAnimState] = useState('enter'); // 'enter' | 'exit'
  const EXIT_MS = 220;

  useEffect(() => {
    if (show) {
      setVisible(true);
      // small timeout to allow mounting then add enter class
      const t = setTimeout(() => setAnimState('enter'), 10);
      return () => clearTimeout(t);
    }
    if (visible) {
      // trigger exit animation then remove
      setAnimState('exit');
      const t = setTimeout(() => setVisible(false), EXIT_MS + 20);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!visible) return null;

  const containerClass = animState === 'enter' ? 'toast-enter toast-enter-active' : 'toast-exit toast-exit-active';

  return (
    <div className="fixed inset-x-0 bottom-28 flex justify-center z-[60] pointer-events-none">
      <div className={`pointer-events-auto ${containerClass}`}>
        <div className="bg-[#282828] text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3">
          <SpPlay size={16} className="text-green-500 shrink-0" />
          <span className="text-sm font-medium">Project streamed!</span>
        </div>
      </div>
    </div>
  );
};

export default StreamToast;
