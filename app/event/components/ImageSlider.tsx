'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [imageStates, setImageStates] = useState<Record<number, { loaded: boolean; error: boolean }>>({});
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const extendedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images, ...images, ...images];
  }, [images]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (extendedImages.length > 0) {
      const initialStates: Record<number, { loaded: boolean; error: false }> = {};
      extendedImages.forEach((_, idx) => {
        initialStates[idx] = { loaded: false, error: false };
      });
      setImageStates(initialStates);

      const preloadPriority = images.slice(0, 3);
      preloadPriority.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        link.fetchPriority = 'high';
        document.head.appendChild(link);
      });
    }
  }, [extendedImages, images]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || extendedImages.length === 0) return;

    const handleScroll = () => {
      const slideWidth = 280;
      const gap = 12;
      const itemWidth = slideWidth + gap;
      const scrollLeft = slider.scrollLeft;
      const sectionWidth = images.length * itemWidth;

      if (scrollLeft >= sectionWidth * 2 - itemWidth) {
        slider.scrollLeft = sectionWidth;
      } else if (scrollLeft <= itemWidth) {
        slider.scrollLeft = sectionWidth + itemWidth;
      }
    };

    slider.addEventListener('scroll', handleScroll, { passive: true });
    
    const timer = setTimeout(() => {
      const slideWidth = 280;
      const gap = 12;
      const itemWidth = slideWidth + gap;
      slider.scrollLeft = images.length * itemWidth;
    }, 50);

    return () => {
      slider.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [extendedImages, images.length]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src && !img.src) {
              img.src = src;
            }
          }
        });
      },
      {
        root: sliderRef.current,
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (fullscreenImage !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [fullscreenImage]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage !== null) {
        setFullscreenImage(null);
      }
    };

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (fullscreenImage !== null) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevImage();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextImage();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleArrowKeys);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleArrowKeys);
    };
  }, [fullscreenImage]);

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    setShowControls(false);
  };

  const handleImageError = (index: number) => {
    setImageStates(prev => ({ 
      ...prev, 
      [index]: { loaded: true, error: true } 
    }));
  };

  const handleImageLoad = (index: number) => {
    setImageStates(prev => ({ 
      ...prev, 
      [index]: { loaded: true, error: false } 
    }));
  };

  const handleImageClick = (index: number) => {
    if (isDesktop) {
      setFullscreenImage(index);
      setShowControls(true);
    } else {
      setActiveImageIndex(prev => prev === index ? null : index);
    }
  };

  const handleCloseFullscreen = () => {
    setFullscreenImage(null);
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
  };

  const handleNextImage = () => {
    if (fullscreenImage !== null) {
      const nextIndex = (fullscreenImage + 1) % extendedImages.length;
      setFullscreenImage(nextIndex);
    }
  };

  const handlePrevImage = () => {
    if (fullscreenImage !== null) {
      const prevIndex = (fullscreenImage - 1 + extendedImages.length) % extendedImages.length;
      setFullscreenImage(prevIndex);
    }
  };

  if (!images || images.length === 0) {
    return (
      <section className="mb-6" aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className="text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black font-mono">
          IMAGE GALLERY
        </h2>
        <div className="text-center py-6 text-gray-400" role="status">
          <p className="text-sm font-mono">No images to display</p>
        </div>
      </section>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "numberOfItems": images.length,
    "image": images.map((img, index) => ({
      "@type": "ImageObject",
      "contentUrl": img,
      "name": `Gallery image ${index + 1}`,
      "position": index + 1
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section 
        className="mb-6" 
        aria-labelledby="gallery-heading"
        itemScope 
        itemType="https://schema.org/ImageGallery"
      >
        <h2 id="gallery-heading" className="text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black font-mono">
          IMAGE GALLERY
        </h2>
        <div className="relative">
          <nav 
            ref={sliderRef}
            className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position'
            }}
            role="list"
            aria-label="Image gallery carousel"
          >
            {extendedImages.map((image, index) => {
              const state = imageStates[index] || { loaded: false, error: false };
              const isEager = index < images.length;
              const isPriority = index < 3;
              const isActive = activeImageIndex === index;
              
              if (state.error) {
                return null;
              }

              const imageNumber = (index % images.length) + 1;

              return (
                <figure
                  key={`image-${index}`}
                  className="flex-shrink-0 w-70 h-52 bg-gray-50 overflow-hidden relative border border-gray-200 group cursor-pointer"
                  onClick={() => handleImageClick(index)}
                  itemScope
                  itemType="https://schema.org/ImageObject"
                  role="listitem"
                >
                  {!state.loaded && (
                    <div className="absolute inset-0 bg-gray-200" role="status" aria-label="Loading image">
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                      <span className="sr-only">Loading image {imageNumber}</span>
                    </div>
                  )}
                  <img
                    src={isEager ? image : undefined}
                    data-src={!isEager ? image : undefined}
                    alt={`Gallery image ${imageNumber}`}
                    className={`w-full h-full object-cover select-none transition-all duration-300 ${
                      isActive ? '' : 'grayscale md:group-hover:grayscale-0'
                    } ${
                      state.loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                    draggable={false}
                    loading={isEager ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={isPriority ? 'high' : 'auto'}
                    itemProp="contentUrl"
                    ref={(el) => {
                      if (el && !isEager && observerRef.current) {
                        observerRef.current.observe(el);
                      }
                    }}
                  />
                  <meta itemProp="name" content={`Gallery image ${imageNumber}`} />
                </figure>
              );
            })}
          </nav>
        </div>
      </section>

      {fullscreenImage !== null && isDesktop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ 
            backdropFilter: 'blur(12px)', 
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onClick={handleCloseFullscreen}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image viewer"
        >
          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <img
              src={extendedImages[fullscreenImage]}
              alt={`Gallery image ${(fullscreenImage % images.length) + 1} - Fullscreen view`}
              className="select-none"
              style={{
                maxWidth: '95vw',
                maxHeight: '95vh',
                minWidth: '60vw',
                minHeight: '60vh',
                objectFit: 'contain',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
              draggable={false}
            />
            
            {/* Close button - top right inside image */}
            <button
              onClick={handleCloseFullscreen}
              className="absolute top-4 right-4 bg-white bg-opacity-95 text-black p-3 transition-all duration-300 hover:bg-opacity-100 hover:scale-110 active:scale-95"
              style={{
                opacity: showControls ? 1 : 0,
                transform: showControls ? 'translate(0, 0)' : 'translate(8px, -8px)',
                pointerEvents: showControls ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              aria-label="Close fullscreen view"
              title="Close (Esc)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Previous button - left edge inside image */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-95 text-black p-4 transition-all duration-300 hover:bg-opacity-100 hover:scale-110 active:scale-95"
              style={{
                opacity: showControls ? 1 : 0,
                transform: showControls ? 'translate(0, -50%)' : 'translate(-8px, -50%)',
                pointerEvents: showControls ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              aria-label="Previous image"
              title="Previous (←)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            {/* Next button - right edge inside image */}
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-95 text-black p-4 transition-all duration-300 hover:bg-opacity-100 hover:scale-110 active:scale-95"
              style={{
                opacity: showControls ? 1 : 0,
                transform: showControls ? 'translate(0, -50%)' : 'translate(8px, -50%)',
                pointerEvents: showControls ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              aria-label="Next image"
              title="Next (→)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            {/* Counter - bottom inside image */}
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white bg-opacity-95 text-black px-6 py-3 text-sm font-mono font-bold"
              style={{
                opacity: showControls ? 1 : 0,
                transform: showControls ? 'translate(-50%, 0)' : 'translate(-50%, 8px)',
                pointerEvents: showControls ? 'auto' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {(fullscreenImage % images.length) + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}