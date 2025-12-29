'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [imageStates, setImageStates] = useState<Record<number, { loaded: boolean; error: boolean }>>({});
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const extendedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images, ...images, ...images];
  }, [images]);

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
    setActiveImageIndex(prev => prev === index ? null : index);
  };

  if (!images || images.length === 0) {
    return (
      <section className="mb-6">
        <h3 className="text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black font-mono">
          IMAGE GALLERY
        </h3>
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm font-mono">No images to display</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mb-6">
        <h3 className="text-lg font-bold uppercase tracking-tight mb-3 border-b-2 border-black pb-2 text-black font-mono">
          IMAGE GALLERY
        </h3>
        <div className="relative">
          <div
            ref={sliderRef}
            className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position'
            }}
          >
            {extendedImages.map((image, index) => {
              const state = imageStates[index] || { loaded: false, error: false };
              const isEager = index < images.length;
              const isPriority = index < 3;
              const isActive = activeImageIndex === index;
              
              if (state.error) {
                return null;
              }

              return (
                <div
                  key={`image-${index}`}
                  className="flex-shrink-0 w-70 h-52 bg-gray-50 overflow-hidden relative border border-gray-200 group cursor-pointer"
                  onClick={() => handleImageClick(index)}
                >
                  {!state.loaded && (
                    <div className="absolute inset-0 bg-gray-200">
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                    </div>
                  )}
                  <img
                    src={isEager ? image : undefined}
                    data-src={!isEager ? image : undefined}
                    alt={`Gallery image ${(index % images.length) + 1}`}
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
                    ref={(el) => {
                      if (el && !isEager && observerRef.current) {
                        observerRef.current.observe(el);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

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
      `}</style>
    </>
  );
}