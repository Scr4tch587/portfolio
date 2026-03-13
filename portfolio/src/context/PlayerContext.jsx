import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const PlayerContext = createContext();

const SYNONYM_GROUPS = [
  ['ai', 'ml', 'machine', 'learning', 'llm', 'agent', 'agents', 'rag', 'langchain', 'langgraph', 'nlp', 'spacy'],
  ['frontend', 'ui', 'ux', 'react', 'tailwind', 'web', 'website', 'design'],
  ['backend', 'api', 'server', 'fastapi', 'node', 'python'],
  ['database', 'db', 'sql', 'postgres', 'postgresql', 'firebase', 'supabase', 'mongodb'],
  ['mobile', 'ios', 'android', 'reactnative', 'native', 'app'],
  ['cloud', 'aws', 'deploy', 'deployment', 'infra', 'infrastructure'],
  ['game', 'gamemaker', 'gameplay', 'gaming'],
  ['scraping', 'crawler', 'crawl', 'webscraping'],
  ['satellite', 'space', 'aerospace', 'orbital'],
  ['music', 'artist', 'spotify', 'audio'],
];

const TOKEN_TO_GROUP = SYNONYM_GROUPS.reduce((acc, group) => {
  group.forEach((token) => {
    acc[token] = group;
  });
  return acc;
}, {});

const normalizeText = (value) => (value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (value) => normalizeText(value).split(' ').filter(Boolean);

const getBigrams = (value) => {
  const normalized = normalizeText(value);
  if (normalized.length < 2) return [normalized];
  const grams = [];
  for (let i = 0; i < normalized.length - 1; i += 1) {
    grams.push(normalized.slice(i, i + 2));
  }
  return grams;
};

const diceSimilarity = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  const counts = new Map();
  bigramsA.forEach((gram) => counts.set(gram, (counts.get(gram) || 0) + 1));
  let overlap = 0;
  bigramsB.forEach((gram) => {
    const count = counts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  });
  return (2 * overlap) / (bigramsA.length + bigramsB.length);
};

const expandToken = (token) => TOKEN_TO_GROUP[token] || [token];

// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [streamConfirmedTrigger, setStreamConfirmedTrigger] = useState(0);
  const [continuousPlayTime, setContinuousPlayTime] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [allProjectsList, setAllProjectsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [likedSongsOpen, setLikedSongsOpen] = useState(false);
  const [discographyOpenAllTrigger, setDiscographyOpenAllTrigger] = useState(0);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [homeNavigationTrigger, setHomeNavigationTrigger] = useState(0);

  const parseDuration = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const addToRecentlyPlayed = (project) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((p) => p.id !== project.id);
      return [project, ...filtered].slice(0, 10);
    });
  };

  const toggleRightSidebar = () => setRightSidebarOpen((prev) => !prev);
  const toggleShuffle = () => setIsShuffleOn((prev) => !prev);
  const openLikedSongs = () => setLikedSongsOpen(true);
  const closeLikedSongs = () => setLikedSongsOpen(false);
  const openDiscographyAll = () => setDiscographyOpenAllTrigger((prev) => prev + 1);
  const openWhatsNew = () => setWhatsNewOpen(true);
  const closeWhatsNew = () => setWhatsNewOpen(false);
  const goHome = () => setHomeNavigationTrigger((prev) => prev + 1);

  const searchProjects = (query, projects) => {
    if (!query.trim()) return [];

    const normalizedQuery = normalizeText(query);
    const queryTokens = tokenize(query);
    const expandedTokens = Array.from(new Set(queryTokens.flatMap(expandToken)));

    const scored = projects.map((project) => {
      const title = project.title || '';
      const tags = (project.tags || []).join(' ');
      const description = project.description || '';
      const meta = `${project.type || ''} ${project.year || ''}`;

      const titleNorm = normalizeText(title);
      const tagsNorm = normalizeText(tags);
      const descriptionNorm = normalizeText(description);
      const metaNorm = normalizeText(meta);

      const titleTokens = new Set(tokenize(title));
      const tagTokens = new Set(tokenize(tags));
      const descriptionTokens = tokenize(description);
      const metaTokens = new Set(tokenize(meta));
      const searchableDescriptionTokens = descriptionTokens.slice(0, 120);

      let score = 0;

      if (titleNorm.includes(normalizedQuery)) score += 45;
      if (tagsNorm.includes(normalizedQuery)) score += 28;
      if (descriptionNorm.includes(normalizedQuery)) score += 18;
      if (metaNorm.includes(normalizedQuery)) score += 8;

      expandedTokens.forEach((token) => {
        if (!token) return;

        if (titleTokens.has(token)) score += 16;
        if (tagTokens.has(token)) score += 11;
        if (metaTokens.has(token)) score += 5;
        if (searchableDescriptionTokens.includes(token)) score += 7;

        if (titleNorm.includes(token)) score += 6;
        if (tagsNorm.includes(token)) score += 4;
        if (descriptionNorm.includes(token)) score += 3;

        let bestFuzzy = 0;
        searchableDescriptionTokens.forEach((descToken) => {
          const sim = diceSimilarity(token, descToken);
          if (sim > bestFuzzy) bestFuzzy = sim;
        });
        titleTokens.forEach((titleToken) => {
          const sim = diceSimilarity(token, titleToken);
          if (sim > bestFuzzy) bestFuzzy = sim;
        });
        tagTokens.forEach((tagToken) => {
          const sim = diceSimilarity(token, tagToken);
          if (sim > bestFuzzy) bestFuzzy = sim;
        });

        if (bestFuzzy >= 0.86) score += 6 * bestFuzzy;
        else if (bestFuzzy >= 0.78) score += 3 * bestFuzzy;
      });

      return { project, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.project);
  };

  const playProject = (project, options = {}) => {
    if (!project) return;
    const { openSidebar = true } = options;
    setCurrentProject(project);
    if (openSidebar) {
      setRightSidebarOpen(true);
    }
    setIsPlaying(true);
    setCurrentTime(0);
    setContinuousPlayTime(0);
    setDurationSeconds(parseDuration(project.duration));
    addToRecentlyPlayed(project);
  };

  const getPlayableProjects = () => {
    if (allProjectsList.length > 0) return allProjectsList;
    return currentProject ? [currentProject] : [];
  };

  const playRandomProject = () => {
    const projects = getPlayableProjects();
    if (projects.length === 0) return;

    if (projects.length === 1) {
      playProject(projects[0]);
      return;
    }

    const currentId = currentProject?.id;
    let nextIndex = Math.floor(Math.random() * projects.length);
    if (currentId) {
      const guard = 10;
      let attempts = 0;
      while (projects[nextIndex]?.id === currentId && attempts < guard) {
        nextIndex = Math.floor(Math.random() * projects.length);
        attempts += 1;
      }
    }
    playProject(projects[nextIndex]);
  };

  const playAdjacentProject = (direction) => {
    const projects = getPlayableProjects();
    if (projects.length === 0) return;
    if (projects.length === 1) {
      playProject(projects[0]);
      return;
    }

    const currentIndex = projects.findIndex((project) => project.id === currentProject?.id);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (safeIndex + direction + projects.length) % projects.length;
    playProject(projects[nextIndex]);
  };

  const playNextProject = () => {
    if (isShuffleOn) {
      playRandomProject();
      return;
    }
    playAdjacentProject(1);
  };

  const playPreviousProject = () => {
    if (isShuffleOn) {
      playRandomProject();
      return;
    }
    playAdjacentProject(-1);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
        if (currentProject) {
          setRightSidebarOpen(true);
        }
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
  const likedProjects = allProjectsList.filter((project) => likedIds.has(project.id));

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

  // Keep the open/selected project in sync with Firestore-backed list updates.
  useEffect(() => {
    if (!currentProject || allProjectsList.length === 0) return;
    const fresh = allProjectsList.find((project) => project.id === currentProject.id);
    if (!fresh) return;

    const fieldsChanged = (
      fresh.title !== currentProject.title
      || fresh.description !== currentProject.description
      || fresh.type !== currentProject.type
      || fresh.year !== currentProject.year
      || fresh.image !== currentProject.image
      || fresh.imageUrl !== currentProject.imageUrl
      || fresh.views !== currentProject.views
      || (fresh.tags || []).join('|') !== (currentProject.tags || []).join('|')
    );

    if (fieldsChanged) {
      setCurrentProject((prev) => (prev && prev.id === fresh.id ? { ...fresh, liked: prev.liked } : prev));
    }
  }, [allProjectsList, currentProject]);

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
      continuousPlayTime,
      recentlyPlayed,
      allProjectsList,
      setAllProjectsList,
      searchQuery,
      setSearchQuery,
      searchProjects,
      rightSidebarOpen,
      toggleRightSidebar,
      isShuffleOn,
      toggleShuffle,
      playNextProject,
      playPreviousProject,
      likedSongsOpen,
      openLikedSongs,
      closeLikedSongs,
      likedProjects,
      discographyOpenAllTrigger,
      openDiscographyAll,
      whatsNewOpen,
      openWhatsNew,
      closeWhatsNew,
      homeNavigationTrigger,
      goHome,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
