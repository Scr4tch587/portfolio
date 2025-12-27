import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * Hook to track continuous viewing time and trigger stream confirmation
 * 
 * @returns {Object} Stream tracking state
 * - showToast: boolean - whether to show the confirmation toast
 * - confirmStream: function - manually confirm the stream
 * - cancelStream: function - cancel the stream countdown
 * - isStreamed: boolean - whether this project has been streamed already
 * - autoConfirmCountdown: number - milliseconds until auto-confirm (0 if not in countdown)
 */
export const useStreamTracker = (projectId) => {
  const { currentProject, isPlaying, continuousPlayTime, confirmStream } = usePlayer();
  const [showToast, setShowToast] = useState(false);
  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState(0);
  const [isStreamed, setIsStreamed] = useState(false);
  const streamedRef = useRef(false); // Track if already streamed in this session
  const countdownIntervalRef = useRef(null);
  const autoConfirmTimeoutRef = useRef(null);

  // Check if this project has been streamed before (localStorage)
  useEffect(() => {
    if (!projectId) return;
    const streamedProjects = JSON.parse(localStorage.getItem('streamedProjects') || '[]');
    setIsStreamed(streamedProjects.includes(projectId));
  }, [projectId]);

  // Reset when project changes
  useEffect(() => {
    if (currentProject?.id !== projectId) {
      setShowToast(false);
      setAutoConfirmCountdown(0);
      streamedRef.current = false;
      clearInterval(countdownIntervalRef.current);
      clearTimeout(autoConfirmTimeoutRef.current);
    }
  }, [currentProject?.id, projectId]);

  // Track continuous viewing time
  useEffect(() => {
    if (!currentProject || currentProject.id !== projectId || !isPlaying) {
      return;
    }

    // If already streamed in this session, don't trigger again
    if (streamedRef.current) {
      return;
    }

    // Check if we've hit 5 seconds
    if (continuousPlayTime >= 5000 && !showToast) {
      setShowToast(true);
      setAutoConfirmCountdown(1000);

      // Start countdown display
      const startTime = Date.now();
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1000 - elapsed);
        setAutoConfirmCountdown(remaining);

        if (remaining === 0) {
          clearInterval(countdownIntervalRef.current);
        }
      }, 50);

      // Auto-confirm after 1 second
      autoConfirmTimeoutRef.current = setTimeout(() => {
        handleConfirmStream();
      }, 1000);
    }
  }, [continuousPlayTime, currentProject, projectId, isPlaying, showToast]);

  // Handle visibility change - cancel stream if tab hidden during countdown
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && showToast && autoConfirmCountdown > 0) {
        handleCancelStream();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showToast, autoConfirmCountdown]);

  const handleConfirmStream = () => {
    clearTimeout(autoConfirmTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
    setShowToast(false);
    setAutoConfirmCountdown(0);
    streamedRef.current = true;
    
    // Mark as streamed in localStorage
    const streamedProjects = JSON.parse(localStorage.getItem('streamedProjects') || '[]');
    if (!streamedProjects.includes(projectId)) {
      streamedProjects.push(projectId);
      localStorage.setItem('streamedProjects', JSON.stringify(streamedProjects));
      setIsStreamed(true);
     
       // Dispatch custom event for FirstStreamBadge to listen
       window.dispatchEvent(new CustomEvent('streamConfirmed', { detail: { projectId } }));
    }

    // Trigger the stream confirmation in PlayerContext
    confirmStream();
  };

  const handleCancelStream = () => {
    clearTimeout(autoConfirmTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
    setShowToast(false);
    setAutoConfirmCountdown(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(autoConfirmTimeoutRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return {
    showToast,
    confirmStream: handleConfirmStream,
    cancelStream: handleCancelStream,
    isStreamed,
    isFirstStream: !isStreamed && streamedRef.current,
    autoConfirmCountdown,
  };
};
