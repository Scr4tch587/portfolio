import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

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

// The playback clock lives in its own context so the 50ms tick only
// re-renders the few components that show time (player bar, lyrics) instead
// of every PlayerContext consumer. It is purely cosmetic: it loops at the
// track length and nothing happens when it wraps.
const PlaybackClockContext = createContext({ currentTime: 0, durationSeconds: 0, seekTo: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const usePlaybackClock = () => useContext(PlaybackClockContext);

const TICK_MS = 50;

const PlaybackClockProvider = ({ isPlaying, durationSeconds, playbackEpoch, children }) => {
  const [currentTime, setCurrentTime] = useState(0);

  // Every playProject() bumps the epoch: restart from 0:00 before paint.
  useLayoutEffect(() => {
    setCurrentTime(0);
  }, [playbackEpoch]);

  useEffect(() => {
    if (!isPlaying || !(durationSeconds > 0)) return undefined;
    let lastTick = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = (now - lastTick) / 1000;
      lastTick = now;
      setCurrentTime((prevTime) => {
        const nextTime = prevTime + elapsedSeconds;
        return nextTime >= durationSeconds ? 0 : nextTime;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  const value = useMemo(() => ({
    currentTime,
    durationSeconds,
    seekTo: (seconds) => {
      const next = Number.isFinite(seconds) ? seconds : 0;
      setCurrentTime(Math.max(0, Math.min(durationSeconds, next)));
    },
  }), [currentTime, durationSeconds]);

  return (
    <PlaybackClockContext.Provider value={value}>
      {children}
    </PlaybackClockContext.Provider>
  );
};

// Firestore doc ids are strings; app project ids are numbers when numeric
// (same normalization the admin panel uses).
const normalizeProjectId = (rawId) => {
  const asNumber = Number.parseInt(rawId, 10);
  return Number.isNaN(asNumber) ? rawId : asNumber;
};

const LIKES_STORAGE_KEY = 'likedProjectIds';

const readStoredLikes = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored.map(normalizeProjectId) : []);
  } catch {
    return new Set();
  }
};

export const PlayerProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  // 'home' | 'lyrics'
  const [mainView, setMainView] = useState('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  // Incremented on every playProject() so the clock restarts at 0:00.
  const [playbackEpoch, setPlaybackEpoch] = useState(0);
  // A stream is counted the moment a project is played (no real-time
  // threshold). StreamRegistrar reacts to each event: toast + server call.
  const [streamEvent, setStreamEvent] = useState(null); // { seq, project }
  const streamSeqRef = useRef(0);
  // The project preloaded into the bar on page load (countStream: false) is
  // only streamed once the visitor actually presses play on it.
  const pendingStreamProjectRef = useRef(null);

  const emitStream = (project) => {
    streamSeqRef.current += 1;
    setStreamEvent({ seq: streamSeqRef.current, project });
  };
  const [allProjectsList, setAllProjectsList] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  // The catalog subscription lives at the provider level (not in Home) so
  // the Letterboxd skin and the loading screen have data even when Home
  // never mounts.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const projects = snapshot.docs
          .map((projectDoc) => {
            const data = projectDoc.data();
            return {
              docId: projectDoc.id,
              id: normalizeProjectId(projectDoc.id),
              ...data,
              github: data.github ?? '',
              website: data.website ?? '',
              tags: Array.isArray(data.tags) ? data.tags : [],
              views: Number.isFinite(data.views) ? data.views : 0,
              image: data.imageUrl || null,
            };
          })
          .filter((project) => project.title)
          .sort((a, b) => (a.orderingPriority ?? 999) - (b.orderingPriority ?? 999));
        setAllProjectsList(projects);
        setProjectsLoaded(true);
      },
      () => {},
    );
    return () => unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [likedSongsOpen, setLikedSongsOpen] = useState(false);
  const [discographyOpenAllTrigger, setDiscographyOpenAllTrigger] = useState(0);
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

  const toggleRightSidebar = () => setRightSidebarOpen((prev) => !prev);
  const toggleShuffle = () => setIsShuffleOn((prev) => !prev);
  const openLikedSongs = () => setLikedSongsOpen(true);
  const closeLikedSongs = () => setLikedSongsOpen(false);
  const openDiscographyAll = () => setDiscographyOpenAllTrigger((prev) => prev + 1);
  const goHome = () => {
    setMainView('home');
    setHomeNavigationTrigger((prev) => prev + 1);
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
    const {
      openSidebar = true,
      switchView = true,
      countStream = true,
    } = options;
    setCurrentProject(project);
    if (switchView) {
      setMainView(isLyricsProjectReady(project) ? 'lyrics' : 'home');
    }
    if (openSidebar) {
      setRightSidebarOpen(true);
    }
    setIsPlaying(true);
    setPlaybackEpoch((prev) => prev + 1);
    setDurationSeconds(getPlaybackDuration(project));
    if (countStream) {
      pendingStreamProjectRef.current = null;
      emitStream(project);
    } else {
      pendingStreamProjectRef.current = project;
    }
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
    const willPlay = !isPlaying;
    setIsPlaying(willPlay);
    if (willPlay && currentProject) {
      setRightSidebarOpen(true);
      const pending = pendingStreamProjectRef.current;
      if (pending && pending.id === currentProject.id) {
        pendingStreamProjectRef.current = null;
        emitStream(currentProject);
      }
    }
  };

  // Liked IDs live in this browser only (localStorage); there are no accounts.
  const [likedIds, setLikedIds] = useState(readStoredLikes);

  useEffect(() => {
    try {
      window.localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...likedIds]));
    } catch {
      // Private windows / blocked storage: likes just last for the session.
    }
  }, [likedIds]);

  const toggleLike = (projectId) => {
    if (!projectId && !currentProject) return;
    const id = projectId || currentProject.id;
    const willLike = !likedIds.has(id);
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
      durationSeconds,
      streamEvent,
      allProjectsList,
      setAllProjectsList,
      projectsLoaded,
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
      homeNavigationTrigger,
      goHome,
    }}>
      <PlaybackClockProvider
        isPlaying={isPlaying}
        durationSeconds={durationSeconds}
        playbackEpoch={playbackEpoch}
      >
        {children}
      </PlaybackClockProvider>
    </PlayerContext.Provider>
  );
};
