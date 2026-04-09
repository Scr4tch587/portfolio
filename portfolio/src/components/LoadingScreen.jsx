import { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import herobackground from '../assets/herobackground.jpg';
import aboutImage from '../assets/profilephoto1.jpg';
import profilePhoto2 from '../assets/profilephoto2.jpg';
import profilePhoto4 from '../assets/profilephoto4.jpg';
import profilePhoto5 from '../assets/profilephoto5.jpg';

const STATIC_IMAGES = [herobackground, aboutImage, profilePhoto2, profilePhoto4, profilePhoto5];
const TIMEOUT_MS = 8000;

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve; // don't block on broken images
    img.src = src;
  });
}

const LoadingScreen = ({ children }) => {
  const { allProjectsList } = usePlayer();
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (allProjectsList.length === 0) return;
    started.current = true;

    const projectImages = allProjectsList
      .map((p) => p.image || p.imageUrl)
      .filter(Boolean);

    const allUrls = [...STATIC_IMAGES, ...projectImages];

    const preloadAll = Promise.all(allUrls.map(preloadImage));
    const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));

    Promise.race([preloadAll, timeout]).then(() => {
      setFadeOut(true);
      setTimeout(() => setReady(true), 400);
    });
  }, [allProjectsList]);

  if (ready) return children;

  return (
    <>
      {/* Render children behind the overlay so Firestore listeners start immediately */}
      <div className={fadeOut ? 'opacity-100' : 'opacity-0'} style={{ transition: 'opacity 400ms ease' }}>
        {children}
      </div>
      <div
        className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-400 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="w-10 h-10 border-2 border-white/20 border-t-green-500 rounded-full animate-spin" />
      </div>
    </>
  );
};

export default LoadingScreen;
