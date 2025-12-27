import React, { useState, useEffect } from 'react';

/**
 * StreamCounter - Animated counter with scale pop and green glow
 * 
 * @param {number} count - The stream count to display
 * @param {boolean} animate - Whether to trigger animation
 */
const StreamCounter = ({ count, animate }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (animate && count !== displayCount) {
      setIsAnimating(true);
      
      // Animate count change
      const startCount = displayCount;
      const endCount = count;
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

      // Remove animation classes after animation completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);

      return () => clearInterval(interval);
    }
  }, [count, animate, displayCount]);

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
