import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [currentProject, setCurrentProject] = useState(null);
  // 'home' | 'lyrics' | 'profile' | 'playlist' | 'messages'
  const [mainView, setMainView] = useState('home');
  // Parameters for the non-home views: { username?, playlistId?, convId?, toUsername? }
  const [viewParams, setViewParams] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [streamConfirmedTrigger, setStreamConfirmedTrigger] = useState(0);
  // Stream accounting lives in refs, not state: it advances every 50ms tick
  // and must not re-render every context consumer.
  const continuousPlayMsRef = useRef(0);
  const streamArmedRef = useRef(false); // one stream per playthrough
  const currentProjectIdRef = useRef(null);
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

  const isLyricsProjectReady = (project) => (
    (project?.processingStatus === 'ready' || project?.processingStatus === 'asset_error')
    && project?.lyricsEnabled !== false
    && Number(project?.generatedDurationSec) > 0
  );

  const getPlaybackDuration = (project) => {
    if (isLyricsProjectReady(project)) {
      return Number(project.generatedDurationSec);
    }
    return parseDuration(project?.duration);
  };

  // Same source of truth as playback, formatted for track listings, so the
  // displayed length always matches what actually plays.
  const getDisplayDuration = (project) => {
    const seconds = Math.round(getPlaybackDuration(project));
    if (!(seconds > 0)) return project?.duration || '0:00';
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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
  const goHome = () => {
    setMainView('home');
    setHomeNavigationTrigger((prev) => prev + 1);
  };
  const openProfile = (username) => {
    setViewParams({ username });
    setMainView('profile');
  };
  const openPlaylist = (playlistId) => {
    setViewParams({ playlistId });
    setMainView('playlist');
  };
  const openMessages = (params = {}) => {
    setViewParams(params);
    setMainView('messages');
  };

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
    const { openSidebar = true, switchView = true, keepQueue = false } = options;
    // Playing outside an active queue (e.g. a home row) returns next/prev to
    // the full catalog.
    if (!keepQueue) setPlayQueue(null);
    setCurrentProject(project);
    if (switchView) {
      setMainView(isLyricsProjectReady(project) ? 'lyrics' : 'home');
    }
    if (openSidebar) {
      setRightSidebarOpen(true);
    }
    setIsPlaying(true);
    setCurrentTime(0);
    continuousPlayMsRef.current = 0;
    streamArmedRef.current = true;
    currentProjectIdRef.current = project.id;
    setDurationSeconds(getPlaybackDuration(project));
    addToRecentlyPlayed(project);
  };

  const seekTo = (seconds) => {
    const next = Number.isFinite(seconds) ? seconds : 0;
    setCurrentTime(Math.max(0, Math.min(durationSeconds, next)));
  };

  // Optional queue override: while set (e.g. playing a playlist), next/prev/
  // shuffle draw from this list instead of the full catalog.
  const [playQueue, setPlayQueue] = useState(null);

  const getPlayableProjects = () => {
    if (playQueue && playQueue.length > 0) return playQueue;
    if (allProjectsList.length > 0) return allProjectsList;
    return currentProject ? [currentProject] : [];
  };

  const playFromQueue = (projects, startProject = null) => {
    if (!Array.isArray(projects) || projects.length === 0) return;
    setPlayQueue(projects);
    playProject(startProject || projects[0], { keepQueue: true });
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
    if (!isPlaying && currentProject) {
      setRightSidebarOpen(true);
    }
  };

  // Pausing breaks "continuous" — the 5s clock starts over on resume, but the
  // playthrough stays armed/disarmed as it was.
  useEffect(() => {
    if (!isPlaying) {
      continuousPlayMsRef.current = 0;
    }
  }, [isPlaying]);

  // Confirms the single stream for the current playthrough and notifies
  // listeners (toast, Firestore view registration).
  const registerStreamConfirmed = () => {
    setStreamConfirmedTrigger((prev) => prev + 1);
  };

  // Liked IDs: in-memory for signed-out visitors (session only), mirrored to
  // users/{uid}/likes for signed-in users so likes survive reload.
  const [likedIds, setLikedIds] = useState(() => new Set());
  const likedIdsRef = useRef(likedIds);
  likedIdsRef.current = likedIds;

  // Firestore doc ids are strings; project ids in app state are numbers when
  // numeric (same normalization the admin panel uses).
  const normalizeProjectId = (rawId) => {
    const asNumber = Number.parseInt(rawId, 10);
    return Number.isNaN(asNumber) ? rawId : asNumber;
  };

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return undefined;
    }
    // Merge likes gathered while signed out into the account, then mirror.
    const pending = [...likedIdsRef.current];
    if (pending.length > 0) {
      const batch = writeBatch(db);
      pending.forEach((id) => {
        batch.set(
          doc(db, 'users', user.uid, 'likes', String(id)),
          { createdAt: serverTimestamp() },
          { merge: true },
        );
      });
      batch.commit().catch(() => {});
    }
    const unsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'likes'),
      (snapshot) => {
        setLikedIds(new Set(snapshot.docs.map((likeDoc) => normalizeProjectId(likeDoc.id))));
      },
      () => {},
    );
    return () => unsubscribe();
  }, [user]);

  const toggleLike = (projectId) => {
    if (!projectId && !currentProject) return;
    const id = projectId || currentProject.id;
    const willLike = !likedIdsRef.current.has(id);

    if (user) {
      const likeRef = doc(db, 'users', user.uid, 'likes', String(id));
      (willLike
        ? setDoc(likeRef, { createdAt: serverTimestamp() })
        : deleteDoc(likeRef)
      ).catch(() => {});
    }

    // Optimistic local update; for signed-in users the snapshot confirms it.
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (willLike) next.add(id);
      else next.delete(id);
      return next;
    });
    setCurrentProject((prevProj) => (
      prevProj && prevProj.id === id ? { ...prevProj, liked: willLike } : prevProj
    ));
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
        continuousPlayMsRef.current = 0;
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
      || fresh.processingStatus !== currentProject.processingStatus
      || fresh.generatedDurationSec !== currentProject.generatedDurationSec
      || fresh.lyricsEnabled !== currentProject.lyricsEnabled
      || (fresh.tags || []).join('|') !== (currentProject.tags || []).join('|')
    );

    if (fieldsChanged) {
      setCurrentProject((prev) => {
        if (!prev || prev.id !== fresh.id) return prev;
        const nextProject = { ...fresh, liked: prev.liked };
        setDurationSeconds(getPlaybackDuration(nextProject));
        // Only react to readiness *transitions* (e.g. processing finished),
        // not unrelated field changes like another visitor's stream bumping
        // `views` — those must never yank the visitor out of the home view.
        const wasReady = isLyricsProjectReady(prev);
        const nowReady = isLyricsProjectReady(nextProject);
        if (nowReady && !wasReady && mainView !== 'lyrics') {
          setMainView('lyrics');
        } else if (!nowReady && mainView === 'lyrics') {
          setMainView('home');
        }
        return nextProject;
      });
    }
  }, [allProjectsList, currentProject, mainView]);

  useEffect(() => {
    let interval = null;
    let lastTick = performance.now();
    if (isPlaying && durationSeconds > 0) {
      const updateInterval = 50;

      interval = setInterval(() => {
        const now = performance.now();
        const elapsedMs = now - lastTick;
        lastTick = now;
        const elapsedSeconds = elapsedMs / 1000;

        setCurrentTime((prevTime) => {
          const nextTime = prevTime + elapsedSeconds;
          if (nextTime >= durationSeconds) {
            // Loop = a new playthrough: eligible for one new stream.
            streamArmedRef.current = true;
            continuousPlayMsRef.current = 0;
            return 0;
          }
          return nextTime;
        });

        // The clock only advances while the tab is visible, and each
        // playthrough confirms at most one stream after 5 continuous seconds.
        if (!document.hidden) {
          continuousPlayMsRef.current += elapsedMs;
          if (streamArmedRef.current && continuousPlayMsRef.current >= 5000) {
            streamArmedRef.current = false;
            registerStreamConfirmed();
          }
        }

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
      mainView,
      setMainView,
      isLyricsProjectReady,
      getDisplayDuration,
      toggleLike,
      isLiked,
      likedCount,
      isPlaying,
      setIsPlaying, 
      playProject, 
      togglePlay,
      currentTime,
      seekTo,
      durationSeconds,
      streamConfirmedTrigger,
      streamCompleteTrigger: streamConfirmedTrigger, // Alias for backward compatibility
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
      playRandomProject,
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
      viewParams,
      openProfile,
      openPlaylist,
      openMessages,
      playQueue,
      playFromQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
