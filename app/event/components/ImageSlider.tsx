import { useState, useRef, useEffect, useMemo } from 'react';

interface ImageSliderProps {
  images: string[];
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const sliderRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  const extendedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return [...images, ...images, ...images];
  }, [images]);

  useEffect(() => {
    if (extendedImages.length > 0) {
      const loadingState: Record<number, boolean> = {};
      extendedImages.forEach((_, idx) => {
        loadingState[idx] = true;
      });
      setImageLoading(loadingState);
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
    
    requestAnimationFrame(() => {
      if (slider) {
        const slideWidth = 280;
        const gap = 12;
        const itemWidth = slideWidth + gap;
        slider.scrollLeft = images.length * itemWidth;
      }
    });

    return () => {
      slider.removeEventListener('scroll', handleScroll);
      Object.values(loadTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [extendedImages, images.length]);

  const handleImageError = (index: number) => {
    if (loadTimeoutRef.current[index]) {
      clearTimeout(loadTimeoutRef.current[index]);
    }
    setImageErrors(prev => ({ ...prev, [index]: true }));
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoad = (index: number) => {
    if (loadTimeoutRef.current[index]) {
      clearTimeout(loadTimeoutRef.current[index]);
    }
    setImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageStart = (index: number) => {
    loadTimeoutRef.current[index] = setTimeout(() => {
      setImageLoading(prev => ({ ...prev, [index]: false }));
    }, 10000);
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
          {extendedImages.map((image, index) => (
            !imageErrors[index] && (
              <div
                key={`image-${index}`}
                className="flex-shrink-0 w-70 h-52 bg-gray-50 overflow-hidden relative border border-gray-200"
              >
                {imageLoading[index] && (
                  <div className="absolute inset-0 bg-gray-200 animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                  </div>
                )}
                <img
                  src={image}
                  alt={`Gallery image ${(index % images.length) + 1}`}
                  className={`w-full h-full object-cover select-none transition-opacity duration-300 ${
                    imageLoading[index] ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoadStart={() => handleImageStart(index)}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  draggable={false}
                  loading={index < images.length ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index < 3 ? 'high' : 'auto'}
                />
              </div>
            )
          ))}
        </div>
      </div>

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
    </section>
  );
}