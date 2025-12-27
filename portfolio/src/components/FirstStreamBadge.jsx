import React, { useState, useEffect } from 'react';

/**
 * FirstStreamBadge - Shows "🟢 First listen" badge for first-time streams
 * 
 * @param {string} projectId - The project ID to check
 * @param {string} className - Additional CSS classes
 */
const FirstStreamBadge = ({ projectId, className = '' }) => {
  const [isFirstListen, setIsFirstListen] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const checkFirstListen = () => {
      const streamedProjects = JSON.parse(localStorage.getItem('streamedProjects') || '[]');
      const firstListenShown = JSON.parse(localStorage.getItem('firstListenShown') || '[]');
      
      // Show badge if project has been streamed but badge hasn't been acknowledged yet
      const hasBeenStreamed = streamedProjects.includes(projectId);
      const badgeAlreadyShown = firstListenShown.includes(projectId);
      
      if (hasBeenStreamed && !badgeAlreadyShown) {
        setIsFirstListen(true);
        // Mark as shown
        const updated = [...firstListenShown, projectId];
        localStorage.setItem('firstListenShown', JSON.stringify(updated));
      } else {
        setIsFirstListen(false);
      }
    };

    checkFirstListen();

    // Listen for storage changes (in case streamed from another tab/component)
    const handleStorageChange = () => checkFirstListen();
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab updates
    window.addEventListener('streamConfirmed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('streamConfirmed', handleStorageChange);
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
