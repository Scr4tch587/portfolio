import React, { useState, useEffect, useRef } from 'react';
import { Play, MoreHorizontal, Heart, Pause, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import SecondaryCapsuleButton from '../components/SecondaryCapsuleButton';
import LikeButton from '../components/LikeButton';
import { usePlayer } from '../context/PlayerContext';
import ImageGalleryModal from '../components/ImageGalleryModal';
import SocialsMenu from '../components/SocialsMenu';
import StreamToast from '../components/StreamToast';
import StreamCounter from '../components/StreamCounter';
import FirstStreamBadge from '../components/FirstStreamBadge';
import LikedProjectsCard from '../components/LikedProjectsCard';
import ArtistPickCard from '../components/ArtistPickCard';
import { useStreamTracker } from '../hooks/useStreamTracker';
import { useMonthlyListeners } from '../hooks/useMonthlyListeners';
import { touchVisitor } from '../lib/visitorMetrics';
import aboutImage from '../assets/profilephoto1.jpg';
import profilePhoto2 from '../assets/profilephoto2.jpg';
import profilePhoto4 from '../assets/profilephoto4.jpg';
import profilePhoto5 from '../assets/profilephoto5.jpg';
import herobackground from '../assets/herobackground.jpg';
import waterlooCrest from '../assets/waterloo_logo.webp';
import sewebring from '../assets/sewebring.svg';
import SewringMenu from '../components/SewringMenu';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, increment } from 'firebase/firestore';

function normalizeDocId(rawId) {
  const parsed = Number.parseInt(rawId, 10);
  return Number.isNaN(parsed) ? rawId : parsed;
}

function withResolvedImage(project) {
  return {
    ...project,
    image: project.imageUrl || null,
  };
}

const Home = () => {
  const {
    playProject,
    currentProject,
    isPlaying,
    togglePlay,
    streamCompleteTrigger,
    toggleLike,
    isLiked,
    setAllProjectsList,
    setIsPlaying,
    discographyOpenAllTrigger,
    rightSidebarOpen,
    homeNavigationTrigger,
  } = usePlayer();
  const [discographyFilter, setDiscographyFilter] = useState('albums');
  const [showAllDiscography, setShowAllDiscography] = useState(false);
  const [showAllFilter, setShowAllFilter] = useState('all');
  const [showAllDropdownOpen, setShowAllDropdownOpen] = useState(false);
  const showAllDropdownRef = useRef(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSocialsMenuOpen, setIsSocialsMenuOpen] = useState(false);
  const [isSewringOpen, setIsSewringOpen] = useState(false);
  const [popularLimit, setPopularLimit] = useState(5);
  const [animatedProjectId, setAnimatedProjectId] = useState(null); // New state for animation
  const [visibleDiscographyCount, setVisibleDiscographyCount] = useState(null);
  const followButtonRef = useRef(null);
  const sewebringButtonRef = useRef(null);
  const discographyRowRef = useRef(null);
  const lastProcessedStreamTrigger = useRef(0);
  const currentProjectRef = useRef(currentProject);

  // Stream tracking for currently playing project
  const streamTracker = useStreamTracker(currentProject?.id);

  const galleryImages = [aboutImage, profilePhoto2, profilePhoto4, profilePhoto5];

  // Combine all project types for view tracking
  const [allProjects, setAllProjects] = useState([]); // Initialize as empty array
  const [firestoreInitialized, setFirestoreInitialized] = useState(false);
  const hasAutoSelected = useRef(false);
  const monthlyVisitorCount = useMonthlyListeners();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (projectsSnapshot) => {
        const firestoreProjects = projectsSnapshot.docs.map((projectDoc) => ({
          docId: projectDoc.id,
          id: normalizeDocId(projectDoc.id),
          ...projectDoc.data(),
        }));

        const mergedProjects = firestoreProjects
          .map((firestoreProject) =>
            withResolvedImage({
              ...firestoreProject,
              github: firestoreProject.github ?? '',
              website: firestoreProject.website ?? '',
              tags: Array.isArray(firestoreProject.tags) ? firestoreProject.tags : [],
              views: Number.isFinite(firestoreProject.views) ? firestoreProject.views : 0,
            }),
          )
          .filter((project) => project.title)
          .sort((a, b) => (a.orderingPriority || 999) - (b.orderingPriority || 999));

        setAllProjects(mergedProjects);
        setAllProjectsList(mergedProjects);
        setFirestoreInitialized(true);
      },
      (error) => {
        console.error('Error fetching projects:', error);
      },
    );

    return () => unsubscribe();
  }, [setAllProjectsList]);

  useEffect(() => {
    if (!firestoreInitialized || allProjects.length === 0 || currentProject || hasAutoSelected.current) {
      return;
    }

    hasAutoSelected.current = true;
    const randomIndex = Math.floor(Math.random() * allProjects.length);
    playProject(allProjects[randomIndex], { openSidebar: false });
    setIsPlaying(false);
  }, [allProjects, currentProject, firestoreInitialized, playProject, setIsPlaying]);

  // Keep a ref to currentProject so the stream effect doesn't need it as a dependency.
  // This prevents the Firestore snapshot → currentProject update → effect re-run loop.
  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    if (streamCompleteTrigger > 0 && streamCompleteTrigger !== lastProcessedStreamTrigger.current && firestoreInitialized) {
      const project = currentProjectRef.current;
      if (!project) return;
      lastProcessedStreamTrigger.current = streamCompleteTrigger;

      // Trigger animation immediately (Firestore snapshot will update the count)
      setAnimatedProjectId(project.id);
      setTimeout(() => setAnimatedProjectId(null), 500);

      // Write to Firestore — onSnapshot will update the local count automatically
      const projectRef = doc(db, "projects", String(project.id));
      setDoc(projectRef, { views: increment(1) }, { merge: true })
        .catch(err => console.error("Error updating Firestore:", err));
    }
  }, [streamCompleteTrigger, firestoreInitialized]);

  useEffect(() => {
    const trackMonthlyVisitor = async () => {
      try {
        await touchVisitor();
        window.dispatchEvent(new Event('monthlyListeners:refresh'));
      } catch (error) {
        console.error('Error tracking visitor:', error);
      }
    };

    trackMonthlyVisitor();
  }, []);

  useEffect(() => {
    if (discographyOpenAllTrigger === 0) return;
    setShowAllFilter('all');
    setShowAllDropdownOpen(false);
    setShowAllDiscography(true);
  }, [discographyOpenAllTrigger]);

  useEffect(() => {
    if (homeNavigationTrigger === 0) return;
    setShowAllDiscography(false);
    setShowAllDropdownOpen(false);
    setShowAllFilter('all');
  }, [homeNavigationTrigger]);

  useEffect(() => {
    if (!showAllDiscography) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowAllDiscography(false);
        setShowAllDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAllDiscography]);

  useEffect(() => {
    const row = discographyRowRef.current;
    if (!row) return undefined;

    const updateVisibleCount = () => {
      const rowWidth = row.clientWidth || 0;
      if (rowWidth <= 0) return;
      const firstCard = row.firstElementChild;
      const styles = window.getComputedStyle(row);
      const gapValue = parseFloat(styles.columnGap || styles.gap || '16');
      const cardWidth = firstCard
        ? firstCard.getBoundingClientRect().width
        : 192; // fallback to w-48

      const slotWidth = cardWidth + gapValue;
      if (slotWidth <= 0) return;

      // Subtract a tiny epsilon to avoid rendering a partially visible final card.
      const fullCards = Math.floor(((rowWidth + gapValue) - 1) / slotWidth);
      setVisibleDiscographyCount(Math.max(1, fullCards));
    };

    updateVisibleCount();
    const resizeObserver = new ResizeObserver(updateVisibleCount);
    resizeObserver.observe(row);
    window.addEventListener('resize', updateVisibleCount);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleCount);
    };
  }, [rightSidebarOpen, showAllDiscography, discographyFilter, allProjects.length]);

  const handlePlay = (projectToPlay) => {
    if (currentProject?.id === projectToPlay.id) {
        togglePlay();
    } else {
        playProject(projectToPlay);
    }
  };

  const isCurrent = (project) => currentProject?.id === project.id;

  const popularProjects = [...allProjects]
    .filter(project => project.views > 0) // Filter out projects with 0 views
    .sort((a, b) => b.views - a.views)
    .slice(0, popularLimit);

  const allDiscographyItems = [...allProjects]
    .filter((project) => project.title)
    .sort((a, b) => (a.orderingPriority || 999) - (b.orderingPriority || 999));

  const albumItems = allDiscographyItems.filter((project) => project.type === 'Album');
  const singleItems = allDiscographyItems.filter((project) => project.type === 'Single');
  const epItems = allDiscographyItems.filter((project) => project.type === 'EP');

  const filteredDiscography = (
    discographyFilter === 'albums' ? albumItems : discographyFilter === 'singles' ? singleItems : epItems
  ).sort((a, b) => (a.orderingPriority || 999) - (b.orderingPriority || 999));
  const visibleDiscography = visibleDiscographyCount
    ? filteredDiscography.slice(0, visibleDiscographyCount)
    : filteredDiscography;

  const showAllFilteredItems = showAllFilter === 'all'
    ? allDiscographyItems
    : showAllFilter === 'albums'
      ? albumItems
      : showAllFilter === 'singles'
        ? singleItems
        : epItems;

  const showAllFilterLabel = showAllFilter === 'all'
    ? 'All'
    : showAllFilter === 'albums'
      ? 'Albums'
      : showAllFilter === 'singles'
        ? 'Singles'
        : 'EPs';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showAllDropdownRef.current && !showAllDropdownRef.current.contains(e.target)) {
        setShowAllDropdownOpen(false);
      }
    };
    if (showAllDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAllDropdownOpen]);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handlePlayRandom = () => {
    if (!firestoreInitialized) return; // Don't play if Firestore not ready
    const randomIndex = Math.floor(Math.random() * allProjects.length);
    playProject(allProjects[randomIndex]);
  };

  return (
    <div className="min-h-full pb-6 bg-[#121212]">
      {/* Header / Banner */}
      {!showAllDiscography && <div
        className="flex flex-col justify-end p-8 h-[370px] bg-cover relative"
        style={{ backgroundImage: `url(${herobackground})`, backgroundPosition: 'center 35%' }}
      >
        {/* Overlay to darken image and keep text readable */}
        <div className="absolute inset-0 bg-black opacity-30"></div>

        {/* Fade to page bg at the bottom of the image */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#121212] to-transparent"></div>

        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <img src={waterlooCrest} alt="University of Waterloo Logo" className="w-5 h-5 object-contain" />
                <span className="text-sm font-medium">University of Waterloo</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Kai Zhang</h1>
            <p className="text-base font-medium mb-2">Software Engineering '30</p>
        </div>
      </div>}

      {/* Main Content Area - now has a static black background by default */}
      <div className="relative pt-3 bg-[#121212] min-h-[calc(100vh - 400px - 64px)]"> {/* 400px banner height, 64px player bar if it exists. */}
          {/* Gradient overlay for the top section */}
          <div className="absolute inset-x-0 top-0 h-90 bg-linear-to-b from-[#252b36] to-[#121212]"></div>

          <div className="relative z-10">
              {!showAllDiscography && <>
              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-6 px-7 py-4 relative">
                <button 
                    onClick={handlePlayRandom}
                    className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform focus:outline-none"
                >
                  <Play size={22} fill="black" className="ml-1 text-black" />
                </button>
                {/* Capsule group: LinkedIn / GitHub / Resume */}
                <div className="flex items-center gap-3 ml-6 mr-4">
                  {/* Larger gap between Play and capsules achieved by parent gap + this ml-6; increased mr for spacing to Follow */}
                  <div className="flex items-center gap-3">
                    <SecondaryCapsuleButton
                      href="https://www.linkedin.com/in/kai-zhang-waterloo/"
                      ariaLabel="LinkedIn"
                      tooltip="View LinkedIn"
                    >
                      {/* Minimal inline LinkedIn mark (single-color) */}
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.1 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v13H0zM7 8h4.8v1.8h.1c.7-1.3 2.4-2.7 4.9-2.7C22.5 7.1 24 9.8 24 14.2V21H19v-6.1c0-1.5-.1-3.5-2.1-3.5-2.1 0-2.4 1.6-2.4 3.4V21H7V8z" />
                      </svg>
                    </SecondaryCapsuleButton>

                    <SecondaryCapsuleButton
                      href="https://github.com/Scr4tch587"
                      ariaLabel="GitHub"
                      tooltip="View GitHub"
                    >
                      {/* Minimal inline GitHub mark (single-color) */}
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M12 .5C5.73.5.81 5.42.81 11.69c0 4.86 3.14 8.98 7.5 10.44.55.1.75-.24.75-.53v-1.86c-3.04.66-3.68-1.46-3.68-1.46-.5-1.28-1.22-1.62-1.22-1.62-.99-.67.08-.66.08-.66 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.16.9.1-.7.38-1.18.69-1.45-2.43-.28-4.99-1.22-4.99-5.42 0-1.2.42-2.18 1.12-2.95-.11-.28-.49-1.42.11-2.96 0 0 .9-.29 2.95 1.12A10.2 10.2 0 0 1 12 6.8c.9 0 1.8.12 2.63.35 2.05-1.41 2.95-1.12 2.95-1.12.6 1.54.22 2.68.11 2.96.7.77 1.12 1.75 1.12 2.95 0 4.2-2.57 5.13-5.01 5.4.39.33.73.97.73 1.96v2.9c0 .29.2.64.76.53 4.36-1.46 7.5-5.58 7.5-10.44C23.19 5.42 18.27.5 12 .5z" />
                      </svg>
                    </SecondaryCapsuleButton>

                    {/* SE Webring capsule (matches SecondaryCapsuleButton sizing/spacing) */}
                    <div className="relative group">
                      <button
                        ref={sewebringButtonRef}
                        onClick={() => setIsSewringOpen(prev => !prev)}
                        aria-label="SE Webring"
                        className="capsule inline-flex items-center justify-center min-w-[44px] min-h-[56px] px-3 py-3 rounded-md border border-[#2a2a2a] bg-[#181818] text-gray-200 hover:bg-[#222] active:scale-95 focus:outline-none transition-all duration-150"
                      >
                        <span className="capsule-icon w-6 h-6 flex items-center justify-center transform transition-transform duration-150 group-hover:-translate-y-1">
                          <img src={sewebring} alt="SE Webring" className="w-4 h-4" />
                        </span>
                      </button>

                      {/* Tooltip for SE Webring (matches SecondaryCapsuleButton tooltip) */}
                      <div className="capsule-tooltip absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max opacity-0 pointer-events-none group-hover:opacity-100 text-xs text-white bg-black/80 px-2 py-1 rounded-lg transform translate-y-1 group-hover:translate-y-0 transition-all duration-180">
                        SE Webring
                      </div>

                      <SewringMenu
                        isOpen={isSewringOpen}
                        onClose={() => setIsSewringOpen(false)}
                        anchorRef={sewebringButtonRef}
                      />
                    </div>
                  </div>
                </div>
                <button 
                    ref={followButtonRef}
                    onClick={() => setIsSocialsMenuOpen(!isSocialsMenuOpen)}
                    className="px-4 py-1 border border-gray-400 rounded-full text-sm font-bold hover:border-white hover:scale-105 transition-transform"
                >
                    Follow
                </button>
                <SocialsMenu 
                    isOpen={isSocialsMenuOpen} 
                    onClose={() => setIsSocialsMenuOpen(false)} 
                    anchorRef={followButtonRef}
                />
                {/* Added: Liked Projects and Artist Pick cards to the right of Follow */}
                <div className={currentProject ? 'w-full flex flex-col gap-4 mt-4' : 'ml-auto mr-8'}>
                  <div className={`flex ${currentProject ? 'flex-row items-start gap-20' : 'items-start gap-32'}`}>
                    <LikedProjectsCard />
                    {/* pass the Super.com project */}
                    <div className="mr-16">
                      <ArtistPickCard project={allProjects.find((project) => project.id === 98)} descriptor="summer 26 coop" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Popular Section (Top Projects) */}
              <div className="px-7 mt-4">
                <h2 className="text-2xl font-extrabold mb-3 text-left">Popular</h2>
                <div className="flex flex-col">
                    {popularProjects.map((project, index) => (
                        <div 
                            key={project.id}
                            onClick={() => handlePlay(project)}
                            className={`grid grid-cols-[16px_4fr_2fr_minmax(60px,1fr)] gap-4 px-4 py-[7px] hover:bg-white/10 rounded group items-center text-sm cursor-pointer ${isCurrent(project) ? 'text-green-500' : 'text-gray-400'}`}
                        >
                            <span className={`group-hover:hidden ${isCurrent(project) && isPlaying ? 'hidden' : 'block'}`}>{index + 1}</span>
                            
                            {/* Animated Equalizer or Play/Pause Icon on Hover/Active */}
                            <div className={`hidden group-hover:block ${isCurrent(project) && isPlaying ? 'block' : ''}`}>
                               {isCurrent(project) && isPlaying ? (
                                   <Pause size={12} fill="currentColor" className="text-green-500" />
                               ) : (
                                   <Play size={12} fill="white" className="text-white" />
                               )}
                            </div>
                            {/* Fallback for when playing but not hovering - handled by conditional above logic roughly, but simplicity key here */}
                            <div className={`block group-hover:hidden ${isCurrent(project) && isPlaying ? 'block' : 'hidden'}`}>
                                <img src="https://open.spotifycdn.com/cdn/images/equaliser-animated-green.f93a2ef4.gif" alt="playing" className="w-3 h-3" />
                            </div>

                            
                            <div className={`flex items-center gap-3 ${isCurrent(project) ? 'text-green-500' : 'text-white'}`}>
                                <div className="w-10 h-10 bg-[#1c1c1c] flex items-center justify-center font-bold rounded text-white relative overflow-hidden">
                                     {project.image ? (
                                        <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
                                    ) : (
                                        project.title[0]
                                    )}
                                    {/* Overlay when playing */}
                                    {isCurrent(project) && isPlaying && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"></div>}
                                </div>
                                 <div className="flex items-center gap-2 min-w-0 flex-1">
                                   <span className="font-medium text-base truncate">{project.title}</span>
                                   <FirstStreamBadge projectId={project.id} />
                                 </div>
                            </div>
                            
                               <div className="hidden md:block">
                                 <StreamCounter 
                                   count={project.views} 
                                   animate={animatedProjectId === project.id}
                                 />
                               </div>
                            <span className="flex items-center justify-end gap-4">
                                <span className={`group-hover:opacity-100 opacity-0 transition-opacity ${isLiked(project.id) ? 'opacity-100' : ''}`}>
                                            <LikeButton
                                              isLiked={isLiked(project.id)}
                                              onToggle={() => toggleLike(project.id)}
                                              ariaLabel={isLiked(project.id) ? 'Unlike' : 'Like'}
                                              size={20}
                                            />
                                </span>
                                <span className="text-sm">{project.duration}</span>
                            </span>
                        </div>
                    ))}
                </div>
                <div 
                    onClick={() => setPopularLimit(prev => prev === 5 ? 10 : 5)}
                    className="mt-3 px-4 text-sm font-bold text-[#b3b3b3] hover:text-white cursor-pointer transition-colors"
                >
                    {popularLimit === 5 ? 'See more' : 'See less'}
                </div>
              </div>
              </>}

              {/* Discography Section */}
              {showAllDiscography ? (
                /* Full-screen "Show All" Discography View */
                <div className="px-7 mt-4 mb-16">
                  {/* Header with back arrow and filter dropdown */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setShowAllDiscography(false); setShowAllDropdownOpen(false); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        <ArrowLeft size={20} className="text-white" />
                      </button>
                      <h2 className="text-2xl font-extrabold text-left">Discography</h2>
                    </div>
                    {/* Filter Dropdown */}
                    <div className="relative" ref={showAllDropdownRef}>
                      <button
                        onClick={() => setShowAllDropdownOpen(!showAllDropdownOpen)}
                        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {showAllFilterLabel}
                        {showAllDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {showAllDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 bg-[#282828] rounded-md shadow-xl py-1 z-50 min-w-[160px]">
                          {['all', 'albums', 'singles', 'eps'].map((filter) => {
                            const label = filter === 'all' ? 'All' : filter === 'albums' ? 'Albums' : filter === 'singles' ? 'Singles' : 'EPs';
                            const isActive = showAllFilter === filter;
                            return (
                              <button
                                key={filter}
                                onClick={() => { setShowAllFilter(filter); setShowAllDropdownOpen(false); }}
                                className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/10 transition-colors"
                              >
                                <span className={isActive ? 'text-green-500' : 'text-white'}>{label}</span>
                                {isActive && <span className="text-green-500">&#10003;</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Grid of projects */}
                  <div className="flex flex-wrap gap-5">
                    {showAllFilteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handlePlay(item)}
                        className={`w-[170px] shrink-0 cursor-pointer group p-3 rounded-md hover:bg-[#1a1a1a] transition-colors ${isCurrent(item) ? 'text-green-500' : 'text-white'}`}
                      >
                        <div className="w-full aspect-square bg-[#1c1c1c] rounded-[4px] shadow-lg relative flex items-center justify-center text-3xl font-bold text-gray-500 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            item.title[0]
                          )}
                          <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            <Play size={18} fill="black" className="ml-0.5 text-black" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 min-w-0">
                          <h3 className="font-bold text-[15px] truncate">{item.title}</h3>
                          <FirstStreamBadge projectId={item.id} />
                        </div>
                        <p className="text-sm text-[#b3b3b3]">{item.year} &bull; {item.type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Normal Discography Section */
                <div className="px-7 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-extrabold text-left">Discography</h2>
                    <button
                      onClick={() => { setShowAllFilter(discographyFilter); setShowAllDiscography(true); }}
                      className="text-sm font-bold text-[#b3b3b3] hover:text-white transition-colors"
                    >
                      Show all
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-2 mb-4">
                      <button
                          onClick={() => setDiscographyFilter('albums')}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${discographyFilter === 'albums' ? 'bg-white text-black' : 'bg-white/7 text-white hover:bg-white/12'}`}
                      >
                          Albums
                      </button>
                      <button
                          onClick={() => setDiscographyFilter('singles')}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${discographyFilter === 'singles' ? 'bg-white text-black' : 'bg-white/7 text-white hover:bg-white/12'}`}
                      >
                          Singles
                      </button>
                      <button
                          onClick={() => setDiscographyFilter('eps')}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${discographyFilter === 'eps' ? 'bg-white text-black' : 'bg-white/7 text-white hover:bg-white/12'}`}
                      >
                          EPs
                      </button>
                  </div>

                  <div ref={discographyRowRef} className="flex gap-5 overflow-hidden pb-3">
                       {visibleDiscography.map((item) => (
                          <div
                              key={item.id}
                              onClick={() => handlePlay(item)}
                              className={`w-[170px] shrink-0 cursor-pointer group p-3 rounded-md hover:bg-[#1a1a1a] transition-colors ${isCurrent(item) ? 'text-green-500' : 'text-white'}`}
                          >
                              <div className="w-full aspect-square bg-[#1c1c1c] rounded-[4px] shadow-lg relative flex items-center justify-center text-3xl font-bold text-gray-500 overflow-hidden">
                                   {item.image ? (
                                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                  ) : (
                                      item.title[0]
                                  )}                                 <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                      <Play size={20} fill="black" className="ml-0.5 text-black" />
                                   </div>
                              </div>
                              <div className="flex items-center gap-1.5 mb-0.5 mt-2 min-w-0">
                                <h3 className="font-bold text-[15px] truncate">{item.title}</h3>
                                <FirstStreamBadge projectId={item.id} />
                              </div>
                              <p className="text-sm text-[#b3b3b3] line-clamp-2">{item.year} • {item.type}</p>
                          </div>
                       ))}
                  </div>
                </div>
              )}

              {!showAllDiscography &&
              /* About Section */
              <div className="px-7 mt-6 mb-16">
                <h2 className="text-2xl font-extrabold mb-4 text-left">About</h2>
                <div 
                    onClick={() => setIsGalleryOpen(true)}
                    className="relative w-full h-[600px] rounded-lg bg-cover bg-center overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform duration-300 group"
                    style={{ backgroundImage: `url(${aboutImage})`, backgroundPosition: 'center 45%' }}
                >
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>
                    <div className="absolute bottom-8 left-8 z-10">
                        <p className="text-white text-base font-bold">
                          {monthlyVisitorCount.toLocaleString()} monthly visitors
                        </p>
                        <p className="text-white text-base line-clamp-3 max-w-2xl">
                            vancouver -&gt; waterloo. thanks for stopping by!
                        </p>
                    </div>
                </div>
              </div>}
          </div>
      </div>

      <ImageGalleryModal 
        isOpen={isGalleryOpen}
        images={galleryImages}
        currentImageIndex={currentImageIndex}
        onClose={() => setIsGalleryOpen(false)}
        onPrev={handlePrevImage}
        onNext={handleNextImage}
      />
     
       <StreamToast 
         show={streamTracker.showToast}
         onConfirm={streamTracker.confirmStream}
         countdown={streamTracker.autoConfirmCountdown}
         isFirstStream={streamTracker.isFirstStream}
       />
    </div>
  );
};

export default Home;
