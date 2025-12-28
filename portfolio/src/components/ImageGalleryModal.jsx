import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageGalleryModal = ({ isOpen, images, currentImageIndex, onClose, onPrev, onNext }) => {
  if (!isOpen || !images || images.length === 0) {
    return null;
  }

  const imageUrl = images[currentImageIndex];

  return (
    <div 
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 z-110 text-gray-400 hover:text-white transition-colors p-2"
        aria-label="Close image gallery"
      >
        <X size={32} />
      </button>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); onPrev(); }} 
            className="absolute left-4 md:left-8 z-110 text-gray-400 hover:text-white transition-colors p-2 bg-black/20 rounded-full hover:bg-black/40"
            aria-label="Previous image"
          >
            <ChevronLeft size={48} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onNext(); }} 
            className="absolute right-4 md:right-8 z-110 text-gray-400 hover:text-white transition-colors p-2 bg-black/20 rounded-full hover:bg-black/40"
            aria-label="Next image"
          >
            <ChevronRight size={48} />
          </button>
        </>
      )}

      {/* Image Container */}
      <div 
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={`Gallery image ${currentImageIndex + 1}`}
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          style={{ objectFit: 'contain', objectPosition: 'center 45%' }}
        />
        
        {/* Image Counter */}
        <div className="mt-6 text-gray-400 font-medium">
          {currentImageIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

export default ImageGalleryModal;
