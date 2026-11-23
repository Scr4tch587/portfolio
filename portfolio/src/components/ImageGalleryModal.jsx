import React, { useEffect } from 'react';
import { SpChevronLeft, SpChevronRight, SpClose } from './icons/SpotifyIcons';

/**
 * The artist "About" dialog, laid out like Spotify's: the photo gallery on
 * top with an arrow either side, then the stats on the left and the bio on
 * the right. Sizes are measured from Spotify's own dialog.
 */
const ImageGalleryModal = ({ isOpen, images, currentImageIndex, onClose, onPrev, onNext, monthlyVisitors = 0, bio = '' }) => {
  const hasImages = Boolean(images && images.length > 0);
  const open = isOpen && hasImages;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') onPrev();
      else if (event.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;

  const arrowClass = 'absolute top-1/2 z-10 -translate-y-1/2 p-2 text-[#b3b3b3] transition-colors hover:text-white';

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="About Kai Zhang"
        data-testid="about-dialog"
        className="about-dialog relative max-h-[86vh] w-full max-w-[768px] overflow-y-auto rounded-lg bg-[#121212] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gallery */}
        <div className="relative flex h-[min(472px,52vh)] items-center justify-center bg-black">
          <img
            src={images[currentImageIndex]}
            alt={`Gallery image ${currentImageIndex + 1}`}
            className="h-full w-full max-w-[667px] object-cover"
            style={{ objectPosition: 'center 45%' }}
          />

          <button onClick={onClose} className="absolute right-3 top-3 z-10 p-2 text-[#b3b3b3] transition-colors hover:text-white" aria-label="Close image gallery">
            <SpClose size={16} />
          </button>

          {images.length > 1 && (
            <>
              <button onClick={onPrev} className={`${arrowClass} left-2`} aria-label="Previous image">
                <SpChevronLeft size={24} />
              </button>
              <button onClick={onNext} className={`${arrowClass} right-2`} aria-label="Next image">
                <SpChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Stats + bio */}
        <div className="flex flex-col gap-8 px-11 pb-12 pt-11 sm:flex-row sm:gap-0">
          <div className="shrink-0 sm:w-[179px]">
            <div className="text-[32px] font-bold leading-[40px] tracking-[-0.01em] text-white tabular-nums" data-testid="about-monthly-visitors">
              {Number(monthlyVisitors || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-sm leading-[20px] text-[#b3b3b3]">Monthly Visitors</div>
          </div>
          <p className="min-w-0 flex-1 whitespace-pre-line text-base leading-[24px] text-[#b3b3b3]" data-testid="about-dialog-bio">{bio}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryModal;
