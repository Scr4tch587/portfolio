import React, { useState, useEffect, useRef } from 'react';

/**
 * StreamCounter - Animated counter with scale pop and green glow.
 * Always tracks the `count` prop; animates whenever it changes (whether the
 * change came from this session's stream or another visitor via onSnapshot).
 *
 * @param {number} count - The stream count to display
 */
const StreamCounter = ({ count }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayCount, setDisplayCount] = useState(count);
  const displayCountRef = useRef(count);

  useEffect(() => {
    if (count === displayCountRef.current) return undefined;

    const startCount = displayCountRef.current;
    const endCount = count;
    displayCountRef.current = endCount;
    setIsAnimating(true);

    const duration = 400;
    const steps = 10;
    const stepDuration = duration / steps;
    const increment = (endCount - startCount) / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayCount(endCount);
        clearInterval(interval);
      } else {
        setDisplayCount(Math.floor(startCount + increment * currentStep));
      }
    }, stepDuration);

    const glowTimeout = setTimeout(() => setIsAnimating(false), 800);

    return () => {
      clearInterval(interval);
      clearTimeout(glowTimeout);
      setDisplayCount(endCount);
    };
  }, [count]);

  // Format number with commas
  const formattedCount = displayCount.toLocaleString();

  return (
    <span
      className={`inline-block transition-all duration-300 ${
        isAnimating
          ? 'stream-counter-animate text-[#1ED760]'
          : ''
      }`}
      style={{
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {formattedCount}
    </span>
  );
};

export default StreamCounter;
