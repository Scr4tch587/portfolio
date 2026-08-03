import React, { useState, useEffect } from 'react';

/**
 * FirstStreamBadge - Shows a "🟢 First listen" badge next to projects the
 * visitor streamed for the very first time during this browser session.
 * PlayerContext records first-ever streams in sessionStorage
 * ('firstStreamsThisSession') and dispatches 'streamConfirmed'.
 *
 * @param {string} projectId - The project ID to check
 * @param {string} className - Additional CSS classes
 */
const FirstStreamBadge = ({ projectId, className = '' }) => {
  const [isFirstListen, setIsFirstListen] = useState(false);

  useEffect(() => {
    if (!projectId) return undefined;

    const checkFirstListen = () => {
      try {
        const session = JSON.parse(sessionStorage.getItem('firstStreamsThisSession') || '[]');
        setIsFirstListen(session.includes(projectId));
      } catch {
        setIsFirstListen(false);
      }
    };

    checkFirstListen();

    // storage: other tabs; streamConfirmed: same-tab confirm from PlayerContext
    window.addEventListener('storage', checkFirstListen);
    window.addEventListener('streamConfirmed', checkFirstListen);

    return () => {
      window.removeEventListener('storage', checkFirstListen);
      window.removeEventListener('streamConfirmed', checkFirstListen);
    };
  }, [projectId]);

  if (!isFirstListen) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full text-xs font-medium ${className}`}
      style={{
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      🟢 First listen
    </span>
  );
};

export default FirstStreamBadge;
