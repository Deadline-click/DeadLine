'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [imageStates, setImageStates] = useState<Record<number, { loaded: boolean; error: boolean }>>({});
  const sliderRef = useRef<HTMLDivElement>(null);

  const extendedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images, ...images, ...images];
  }, [images]);

  useEffect(() => {
    if (extendedImages.length > 0) {
      const initialStates: Record<number, { loaded: boolean; error: boolean }> = {};
      extendedImages.forEach((_, idx) => {
        initialStates[idx] = { loaded: false, error: false };
      });
      setImageStates(initialStates);
    }
  }, [extendedImages]);

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
    
    setTimeout(() => {
      if (slider) {
        const slideWidth = 280;
        const gap = 12;
        const itemWidth = slideWidth + gap;
        slider.scrollLeft = images.length * itemWidth;
      }
    }, 100);

    return () => {
      slider.removeEventListener('scroll', handleScroll);
    };
  }, [extendedImages, images.length]);

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
              
              if (state.error) {
                return null;
              }

              return (
                <div
                  key={`image-${index}`}
                  className="flex-shrink-0 w-70 h-52 bg-gray-50 overflow-hidden relative border border-gray-200"
                >
                  {!state.loaded && (
                    <div className="absolute inset-0 bg-gray-200">
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                    </div>
                  )}
                  <img
                    src={`${image}?t=${Date.now()}`}
                    alt={`Gallery image ${(index % images.length) + 1}`}
                    className={`w-full h-full object-cover select-none transition-opacity duration-300 ${
                      state.loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                    draggable={false}
                    loading={index < images.length ? 'eager' : 'lazy'}
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
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
}