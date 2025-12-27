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
  const { currentProject, isPlaying, continuousPlayTime, confirmStream, setIsPlaying } = usePlayer();
  const [showToast, setShowToast] = useState(false);
  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState(0);
  const [isFirstStreamInSession, setIsFirstStreamInSession] = useState(true);
  const streamCountInSession = useRef(0); // Track how many times streamed this session (in-memory)
  const countdownIntervalRef = useRef(null);
  const autoConfirmTimeoutRef = useRef(null);

  // Reset when project changes
  useEffect(() => {
    if (currentProject?.id !== projectId) {
      setShowToast(false);
      setAutoConfirmCountdown(0);
      streamCountInSession.current = 0;
      setIsFirstStreamInSession(true);
      clearInterval(countdownIntervalRef.current);
      clearTimeout(autoConfirmTimeoutRef.current);
    }
  }, [currentProject?.id, projectId]);

  // Track continuous viewing time
  useEffect(() => {
    if (!currentProject || currentProject.id !== projectId || !isPlaying) {
      return;
    }
    // Check if we've hit 5 seconds
    if (continuousPlayTime >= 5000 && !showToast) {
      const isFirstStream = isFirstStreamInSession;

      // FIRST STREAM: pause and show a confirmable toast with countdown
      if (isFirstStream) {
        const countdownDuration = 3000;
        setShowToast(true);
        setAutoConfirmCountdown(countdownDuration);

        // Pause playback for first stream
        if (setIsPlaying) setIsPlaying(false);

        // Start countdown display
        const startTime = Date.now();
        countdownIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, countdownDuration - elapsed);
          setAutoConfirmCountdown(remaining);
          if (remaining === 0) clearInterval(countdownIntervalRef.current);
        }, 50);

        // Auto-confirm after timeout duration
        autoConfirmTimeoutRef.current = setTimeout(() => {
          handleConfirmStream(true);
        }, countdownDuration);

      } else {
        // SUBSEQUENT STREAMS: confirm immediately and show a short non-blocking toast
        // Trigger confirm immediately so UI and counters update with no delay
        confirmStream();
        streamCountInSession.current += 1;
        setIsFirstStreamInSession(false);

        // Show a brief toast for feedback (1.5s)
        const shortDuration = 1500;
        setShowToast(true);
        setAutoConfirmCountdown(shortDuration);
        // Auto-hide after shortDuration
        countdownIntervalRef.current = setInterval(() => {}, 99999); // placeholder to keep ref non-null
        autoConfirmTimeoutRef.current = setTimeout(() => {
          setShowToast(false);
          setAutoConfirmCountdown(0);
          clearInterval(countdownIntervalRef.current);
        }, shortDuration);
      }
    }
  }, [continuousPlayTime, currentProject, projectId, isPlaying, showToast, isFirstStreamInSession, setIsPlaying]);

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

  const handleConfirmStream = (wasFirstStream) => {
    clearTimeout(autoConfirmTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
    setShowToast(false);
    setAutoConfirmCountdown(0);
    streamCountInSession.current += 1;
    setIsFirstStreamInSession(false);
    
    // Dispatch custom event for FirstStreamBadge to listen (only on first stream)
    if (wasFirstStream) {
      window.dispatchEvent(new CustomEvent('streamConfirmed', { detail: { projectId } }));
    }

    // Resume playback if it was paused for first stream
    if (wasFirstStream && setIsPlaying) {
      setIsPlaying(true);
    }

    // Trigger the stream confirmation in PlayerContext
    confirmStream();
  };

  const handleCancelStream = () => {
    clearTimeout(autoConfirmTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
    setShowToast(false);
    setAutoConfirmCountdown(0);
    // If the toast was for the first stream and playback was paused, resume playback
    if (isFirstStreamInSession && setIsPlaying) {
      setIsPlaying(true);
    }
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
    confirmStream: () => handleConfirmStream(isFirstStreamInSession),
    cancelStream: handleCancelStream,
    isFirstStream: isFirstStreamInSession,
    autoConfirmCountdown,
  };
};
