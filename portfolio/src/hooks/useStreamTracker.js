import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export const useStreamTracker = (projectId) => {
  const { currentProject, isPlaying, continuousPlayTime, confirmStream, setIsPlaying } = usePlayer();
  const [showToast, setShowToast] = useState(false);
  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState(0);
  const [isFirstStreamInSession, setIsFirstStreamInSession] = useState(true);
  const streamCountInSession = useRef(0);
  const countdownIntervalRef = useRef(null);
  const autoConfirmTimeoutRef = useRef(null);
  // Synchronous guard — prevents re-entry before React commits the state update for showToast
  const streamActiveRef = useRef(false);

  // Reset when project changes
  useEffect(() => {
    if (currentProject?.id !== projectId) {
      streamActiveRef.current = false;
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

    if (continuousPlayTime >= 5000 && !streamActiveRef.current) {
      streamActiveRef.current = true; // Set synchronously before any async state updates

      const isFirstStream = isFirstStreamInSession;

      if (isFirstStream) {
        const countdownDuration = 3000;
        setShowToast(true);
        setAutoConfirmCountdown(countdownDuration);

        if (setIsPlaying) setIsPlaying(false);

        const startTime = Date.now();
        countdownIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, countdownDuration - elapsed);
          setAutoConfirmCountdown(remaining);
          if (remaining === 0) clearInterval(countdownIntervalRef.current);
        }, 50);

        autoConfirmTimeoutRef.current = setTimeout(() => {
          handleConfirmStream(true);
        }, countdownDuration);

      } else {
        // Clear any previous timers before setting new ones
        clearTimeout(autoConfirmTimeoutRef.current);
        clearInterval(countdownIntervalRef.current);

        confirmStream();
        streamCountInSession.current += 1;

        const shortDuration = 1500;
        setShowToast(true);
        setAutoConfirmCountdown(shortDuration);

        autoConfirmTimeoutRef.current = setTimeout(() => {
          setShowToast(false);
          setAutoConfirmCountdown(0);
          streamActiveRef.current = false; // Clear guard after cooldown
        }, shortDuration);
      }
    }
  }, [continuousPlayTime, currentProject, projectId, isPlaying, isFirstStreamInSession, setIsPlaying]);

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
    streamActiveRef.current = false; // Clear guard on confirm
    setShowToast(false);
    setAutoConfirmCountdown(0);
    streamCountInSession.current += 1;
    setIsFirstStreamInSession(false);

    if (wasFirstStream) {
      window.dispatchEvent(new CustomEvent('streamConfirmed', { detail: { projectId } }));
    }

    if (wasFirstStream && setIsPlaying) {
      setIsPlaying(true);
    }

    confirmStream();
  };

  const handleCancelStream = () => {
    clearTimeout(autoConfirmTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
    streamActiveRef.current = false;
    setShowToast(false);
    setAutoConfirmCountdown(0);
    if (isFirstStreamInSession && setIsPlaying) {
      setIsPlaying(true);
    }
  };

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
