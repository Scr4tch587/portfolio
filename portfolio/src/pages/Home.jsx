import React, { useState, useEffect, useRef } from 'react';
import { Play, MoreHorizontal, Heart, Pause, Linkedin, Github, FileText } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import ImageGalleryModal from '../components/ImageGalleryModal';
import SocialsMenu from '../components/SocialsMenu';
import StreamToast from '../components/StreamToast';
import StreamCounter from '../components/StreamCounter';
import FirstStreamBadge from '../components/FirstStreamBadge';
import { useStreamTracker } from '../hooks/useStreamTracker';
import aboutImage from '../assets/profilephoto1.jpg';
import profilePhoto2 from '../assets/profilephoto2.jpg';
import herobackground from '../assets/herobackground.jpg';
import waterlooCrest from '../assets/waterloo_logo.webp';
import orbitalLogo from '../assets/orbitallogo.png';
import wispLogo from '../assets/wisplogo.png';
import waypostLogo from '../assets/waypostlogo.png';
import squareLogo from '../assets/square_logo.png';
import rootifyLogo from '../assets/rootify_logo.png';
import projectPeriodicLogo from '../assets/project_periodic.png';
import kaisMusicBlogLogo from '../assets/kais_music_blog.png';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, increment } from "firebase/firestore";

const initialProjects = [];

const initialAlbums = [
  { id: 1, title: 'UW Orbital', year: 2024, type: 'Album', image: orbitalLogo, duration: '3:45', description: 'Firmware for a CubeSat satellite. Handled communication protocols and sensor data acquisition.', tags: ['C', 'C++', 'FreeRTOS', 'STM32'], orderingPriority: 1, plays: '1,203,400' },
  { id: 103, title: 'Wisp', year: 2024, type: 'Album', image: wispLogo, duration: '2:17', description: 'A lightweight, ephemeral messaging application designed for privacy and speed. Messages disappear after reading.', tags: ['React', 'Firebase', 'Tailwind CSS'], orderingPriority: 3 },
  { id: 104, title: 'Rootify', year: 2025, type: 'Album', image: rootifyLogo, duration: '3:30', description: 'Smart plant care companion app. Tracks watering schedules, sunlight exposure, and growth progress.', tags: ['React Native', 'Expo', 'Node.js'], orderingPriority: 2 },
];

const initialSingles = [
  { id: 204, title: 'Waypost', year: 2023, type: 'Single', image: waypostLogo, duration: '4:02', description: 'An offline-first navigation tool for hikers and outdoor enthusiasts. Features topographic maps and trail recording.', tags: ['Flutter', 'Dart', 'Mapbox'], orderingPriority: 2 },
  { id: 305, title: 'kaizhang.ca', year: 2025, type: 'EP', image: squareLogo, duration: '2:45', description: 'My personal portfolio website (this one!). A showcase of my projects, music, and skills, built with a Spotify-inspired UI.', tags: ['React', 'Vite', 'Tailwind CSS', 'Firebase'], orderingPriority: 1 },
  { id: 306, title: 'Project Periodic', year: 2024, type: 'Single', image: projectPeriodicLogo, duration: '3:15', description: 'Interactive periodic table for chemistry students. Visualizes element properties and trends.', tags: ['Svelte', 'D3.js', 'TypeScript'], orderingPriority: 3 },
  { id: 307, title: "Kai's Music Blog", year: 2025, type: 'Single', image: kaisMusicBlogLogo, duration: '2:00', description: 'A blog platform where I share music reviews, theory analysis, and playlists. Features a custom CMS.', tags: ['Next.js', 'Sanity.io', 'Vercel'], orderingPriority: 4 },
];

const Home = () => {
  const { playProject, currentProject, isPlaying, togglePlay, streamCompleteTrigger } = usePlayer();
  const [discographyFilter, setDiscographyFilter] = useState('albums');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSocialsMenuOpen, setIsSocialsMenuOpen] = useState(false);
  const [popularLimit, setPopularLimit] = useState(5);
  const [animatedProjectId, setAnimatedProjectId] = useState(null); // New state for animation
  const followButtonRef = useRef(null);

  // Stream tracking for currently playing project
  const streamTracker = useStreamTracker(currentProject?.id);

  const galleryImages = [aboutImage, profilePhoto2];

  // Combine all project types for view tracking
  const [allProjects, setAllProjects] = useState([]); // Initialize as empty array
  const [firestoreInitialized, setFirestoreInitialized] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        console.log("Fetching projects from Firestore...");
        const projectsCollectionRef = collection(db, "projects");
        const projectsSnapshot = await getDocs(projectsCollectionRef);
        const firestoreProjects = projectsSnapshot.docs.map(doc => ({ id: parseInt(doc.id), ...doc.data() }));
        console.log("Fetched projects:", firestoreProjects);

        const combinedLocalProjects = [...initialAlbums, ...initialSingles, ...initialProjects];
        
        // Deduplicate local projects by ID
        const uniqueLocalProjects = Array.from(new Map(combinedLocalProjects.map(item => [item.id, item])).values());

        const mergedProjects = uniqueLocalProjects.map(localProject => {
          const firestoreProject = firestoreProjects.find(fp => fp.id === localProject.id);
          // Parse 'plays' string to number as default view count if firestore is empty
          const defaultViews = localProject.plays ? parseInt(localProject.plays.replace(/,/g, ''), 10) : 0;
          
          return {
            ...localProject,
            views: firestoreProject ? firestoreProject.views : defaultViews,
          };
        });

        // Ensure all Firestore projects are included, even if not in initial local lists
        firestoreProjects.forEach(firestoreProject => {
          if (!mergedProjects.some(mp => mp.id === firestoreProject.id)) {
            mergedProjects.push(firestoreProject);
          }
        });

        setAllProjects(mergedProjects);
        setFirestoreInitialized(true);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, []); // Run once on component mount

  useEffect(() => {
    if (streamCompleteTrigger > 0 && currentProject && firestoreInitialized) {
        console.log("Incrementing view for project:", currentProject.id);
        setAllProjects(prevProjects =>
            prevProjects.map(p =>
                p.id === currentProject.id ? { ...p, views: p.views + 1 } : p
            )
        );
        // Update Firestore
        const projectRef = doc(db, "projects", String(currentProject.id));
        // Use setDoc with merge: true to create if it doesn't exist
        setDoc(projectRef, { views: increment(1) }, { merge: true })
            .then(() => {
                console.log("Firestore updated successfully");
                setAnimatedProjectId(currentProject.id); // Trigger animation
                setTimeout(() => setAnimatedProjectId(null), 500); // Reset animation after 500ms
            })
            .catch(err => console.error("Error updating Firestore:", err));
    }
  }, [streamCompleteTrigger, currentProject, firestoreInitialized]);

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

  const filteredDiscography = (discographyFilter === 'albums' ? initialAlbums : initialSingles)
    .sort((a, b) => (a.orderingPriority || 999) - (b.orderingPriority || 999));

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
    <div className="min-h-full pb-8 bg-black">
      {/* Header / Banner */}
      <div 
        className="flex flex-col justify-end p-8 h-[370px] bg-cover relative"
        style={{ backgroundImage: `url(${herobackground})`, backgroundPosition: 'center 35%' }}
      >
        {/* Overlay to darken image and keep text readable */}
        <div className="absolute inset-0 bg-black opacity-30"></div>
        
        {/* Fade to black at the bottom of the image */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black to-transparent"></div>

        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <img src={waterlooCrest} alt="University of Waterloo Logo" className="w-5 h-5 object-contain" />
                <span className="text-sm font-medium">University of Waterloo</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Kai Zhang</h1>
            <p className="text-base font-medium mb-2">Software Engineering '30</p>
        </div>
      </div>

      {/* Main Content Area - now has a static black background by default */}
      <div className="relative pt-4 bg-black min-h-[calc(100vh - 400px - 64px)]"> {/* 400px banner height, 64px player bar if it exists. */} 
          {/* Gradient overlay for the top section */} 
          <div className="absolute inset-x-0 top-0 h-90 bg-linear-to-b from-[#252b36] to-black"></div>

          <div className="relative z-10">
              {/* Action Bar */}
              <div className="flex items-center gap-6 px-8 py-4 relative">
                <button 
                    onClick={handlePlayRandom}
                    className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <Play size={22} fill="black" className="ml-1 text-black" />
                </button>
                <a href="https://www.linkedin.com/in/kai-zhang-waterloo/" target="_blank" rel="noopener noreferrer">
                    <Linkedin className="text-gray-400 hover:text-white cursor-pointer" />
                </a>
                <a href="https://github.com/Scr4tch587" target="_blank" rel="noopener noreferrer">
                    <Github className="text-gray-400 hover:text-white cursor-pointer" />
                </a>
                <a href="/resume.pdf" download>
                    <FileText className="text-gray-400 hover:text-white cursor-pointer" />
                </a>
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
              </div>

              {/* Popular Section (Top Projects) */}
              <div className="px-8 mt-4">
                <h2 className="text-2xl font-bold mb-4 text-left">Popular</h2>
                <div className="flex flex-col">
                    {popularProjects.map((project, index) => (
                        <div 
                            key={project.id}
                            onClick={() => handlePlay(project)}
                            className={`grid grid-cols-[16px_4fr_2fr_minmax(60px,1fr)] gap-4 px-4 py-2 hover:bg-white/10 rounded-md group items-center text-sm cursor-pointer ${isCurrent(project) ? 'text-green-500' : 'text-gray-400'}`}
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
                                <div className="w-10 h-10 bg-gray-700 flex items-center justify-center font-bold rounded text-white relative overflow-hidden">
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
                                <span className="group-hover:opacity-100 opacity-0 transition-opacity">
                                    <Heart size={16} className="text-gray-400 hover:text-white" />
                                </span>
                                <span className="text-sm">{project.duration}</span>
                            </span>
                        </div>
                    ))}
                </div>
                <div 
                    onClick={() => setPopularLimit(prev => prev === 5 ? 10 : 5)}
                    className="mt-4 px-4 text-sm font-bold text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                    {popularLimit === 5 ? 'See more' : 'See less'}
                </div>
              </div>
              
              {/* Discography Section */}
              <div className="px-8 mt-8">
                <h2 className="text-2xl font-bold mb-4 text-left">Discography</h2>
                
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setDiscographyFilter('albums')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${discographyFilter === 'albums' ? 'bg-white text-black' : 'bg-[#2A2A2A] text-white hover:bg-[#3E3E3E]'}`}
                    >
                        Albums
                    </button>
                    <button 
                        onClick={() => setDiscographyFilter('singles')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${discographyFilter === 'singles' ? 'bg-white text-black' : 'bg-[#2A2A2A] text-white hover:bg-[#3E3E3E]'}`}
                    >
                        Singles and EPs
                    </button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4">
                     {filteredDiscography.map((item) => (
                        <div 
                            key={item.id}
                            onClick={() => handlePlay(item)}
                            className={`bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group w-48 shrink-0 ${isCurrent(item) ? 'text-green-500' : 'text-white'}`}
                        >
                            <div className="w-full aspect-square bg-gray-700 mb-4 rounded-md shadow-lg relative flex items-center justify-center text-4xl font-bold text-gray-500">
                                 {item.image ? (
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    item.title[0]
                                )}                                 <div className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                    <Play size={24} fill="black" className="ml-1 text-black" />
                                 </div>
                            </div>
                            <div className="flex items-center gap-2 mb-1 min-w-0">
                              <h3 className="font-bold truncate">{item.title}</h3>
                              <FirstStreamBadge projectId={item.id} />
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2">{item.year} • {item.type}</p>
                        </div>
                     ))}
                </div>
              </div>

              {/* About Section */}
              <div className="px-8 mt-8 mb-20">
                <h2 className="text-2xl font-bold mb-4 text-left">About</h2>
                <div 
                    onClick={() => setIsGalleryOpen(true)}
                    className="relative w-full h-[600px] rounded-lg bg-cover bg-center overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform duration-300 group"
                    style={{ backgroundImage: `url(${aboutImage})`, backgroundPosition: 'center 45%' }}
                >
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>
                    <div className="absolute bottom-8 left-8 z-10">
                        <p className="text-white text-base font-bold">
                            1,203,432 monthly listeners
                        </p>
                        <p className="text-white text-base line-clamp-3 max-w-2xl">
                            vancouver -&gt; waterloo. seeking summer 2026 internships. thanks for stopping by!
                        </p>
                    </div>
                </div>
              </div>
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
       />
    </div>
  );
};

export default Home;