import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const PlayerContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [streamConfirmedTrigger, setStreamConfirmedTrigger] = useState(0);
  const [continuousPlayTime, setContinuousPlayTime] = useState(0);

  const parseDuration = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const playProject = (project) => {
    setCurrentProject(project);
    setIsPlaying(true);
    setCurrentTime(0);
    setContinuousPlayTime(0);
    setDurationSeconds(parseDuration(project.duration));
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
        // Resuming: decided NOT to reset continuous time on resume, 
        // but the prompt says "continuous 5 seconds". 
        // If paused, it's not continuous. So resetting on pause/resume or just pause is correct.
        // Let's reset on PAUSE.
    } else {
        setContinuousPlayTime(0);
    }
  };

  // Ensure continuous timer resets when playback is paused/stopped
  useEffect(() => {
    if (!isPlaying) {
      setContinuousPlayTime(0);
    }
  }, [isPlaying]);

  const confirmStream = () => {
    // Reset continuous focus timer so the next stream requires another full 5s
    setContinuousPlayTime(0);
    setStreamConfirmedTrigger(prev => prev + 1);
  };

  // In-memory liked IDs (reset on reload) — no Firestore persistence by design
  const [likedIds, setLikedIds] = useState(() => new Set());

  const toggleLike = (projectId) => {
    if (!projectId && !currentProject) return;
    const id = projectId || currentProject.id;
    setLikedIds(prev => {
      const next = new Set(prev);
      const willLike = !next.has(id);
      if (willLike) next.add(id);
      else next.delete(id);

      // Keep currentProject.liked in sync with the in-memory Set
      setCurrentProject(prevProj => prevProj && prevProj.id === id ? { ...prevProj, liked: willLike } : prevProj);

      return next;
    });
  };

  const isLiked = (projectId) => {
    const id = projectId || currentProject?.id;
    if (!id) return false;
    // Check Set first; if not present, only return true when the currentProject matches the id and is liked
    if (likedIds.has(id)) return true;
    if (currentProject && currentProject.liked && currentProject.id === id) return true;
    return false;
  };

  // Count of liked projects (in-memory)
  const likedCount = likedIds.size;

  // Helper to clear current project after a delay (used to let exit animations finish)
  const closeProjectTimeoutRef = useRef(null);

  const clearCurrentProjectDelayed = (ms = 0) => {
    if (closeProjectTimeoutRef.current) {
      clearTimeout(closeProjectTimeoutRef.current);
      closeProjectTimeoutRef.current = null;
    }
    closeProjectTimeoutRef.current = setTimeout(() => {
      setCurrentProject(null);
      closeProjectTimeoutRef.current = null;
    }, ms);
  };

  // Handle visibility change to enforce "continuous" focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setContinuousPlayTime(0);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    let interval = null;
    if (isPlaying && durationSeconds > 0) {
      const updateInterval = 100; // Update every 100ms
      // Progress at 20% per second = 100% in 5 seconds
      // incrementPerInterval = (durationSeconds * 0.20) * (updateInterval / 1000)
      const incrementPerInterval = durationSeconds * 0.02; // 0.20 per second * 0.1 seconds

      interval = setInterval(() => {
        // Update Playback Time
        setCurrentTime((prevTime) => {
          if (prevTime + incrementPerInterval >= durationSeconds) {
            return 0; // Loop
          }
          return prevTime + incrementPerInterval;
        });

        // Update Continuous Focus Time
        setContinuousPlayTime(prev => prev + 100);

      }, updateInterval);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  return (
    <PlayerContext.Provider value={{ 
        currentProject, 
      setCurrentProject, 
      clearCurrentProjectDelayed,
      toggleLike,
      isLiked,
      likedCount,
        isPlaying,
        setIsPlaying, 
        playProject, 
        togglePlay,
        currentTime,
        durationSeconds,
        streamConfirmedTrigger,
         streamCompleteTrigger: streamConfirmedTrigger, // Alias for backward compatibility
        confirmStream,
        continuousPlayTime
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
