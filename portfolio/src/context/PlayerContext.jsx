import React, { createContext, useContext, useState, useEffect } from 'react';

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
    setStreamConfirmedTrigger(prev => prev + 1);
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
      // Current time increment (looping playback logic)
      const incrementPerInterval = updateInterval / 1000; 

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
        isPlaying, 
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
