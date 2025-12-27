'use client';

import { useState, useEffect } from 'react';

interface SourcesProps {
  sources: string[];
}

interface SourceData {
  url: string;
  title: string;
  domain: string;
  favicon: string;
  loading: boolean;
}

function SourceCard({ sourceData }: { sourceData: SourceData }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a 
      href={sourceData.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white border border-black p-3 sm:p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 transform hover:-translate-y-0.5 block"
    >
      <div className="flex flex-col items-center space-y-2">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black overflow-hidden bg-white flex items-center justify-center relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
          )}
          {!imageError ? (
            <img 
              src={sourceData.favicon}
              alt=""
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
          )}
        </div>
        {sourceData.loading ? (
          <div className="w-full space-y-2">
            <div className="h-3 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4 mx-auto"></div>
          </div>
        ) : (
          <p className="text-black text-xs sm:text-sm text-center font-mono leading-tight px-1 line-clamp-2">
            {sourceData.title}
          </p>
        )}
      </div>
    </a>
  );
}

export default function SourcesComponent({ sources }: SourcesProps) {
  const [sourcesData, setSourcesData] = useState<SourceData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !sources || sources.length === 0) {
      return;
    }

    const validSources = sources.filter(source => {
      if (!source || typeof source !== 'string' || source.trim() === '') return false;
      try {
        const testUrl = new URL(source.trim());
        return testUrl.protocol === 'http:' || testUrl.protocol === 'https:';
      } catch {
        return false;
      }
    });

    const initialData: SourceData[] = validSources.map(url => {
      try {
        const trimmedUrl = url.trim();
        const urlObj = new URL(trimmedUrl);
        const domain = urlObj.hostname.replace('www.', '');
        
        return {
          url: trimmedUrl,
          domain,
          title: 'Loading...',
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          loading: true
        };
      } catch (e) {
        return null;
      }
    }).filter((data): data is SourceData => data !== null);

    setSourcesData(initialData);

    const fetchTitles = async () => {
      try {
        const updatedData = await Promise.all(
          initialData.map(async (source) => {
            try {
              const timestamp = Date.now();
              const response = await fetch(`/api/get/title?url=${encodeURIComponent(source.url)}&_t=${timestamp}`, {
                cache: 'no-store'
              });
              
              if (response.ok) {
                const data = await response.json();
                const headline = data.title || source.domain.charAt(0).toUpperCase() + source.domain.slice(1).split('.')[0];
                return {
                  ...source,
                  title: headline,
                  loading: false
                };
              }
            } catch (error) {
              console.error('Error fetching title for', source.url, error);
            }
            
            return {
              ...source,
              title: source.domain.charAt(0).toUpperCase() + source.domain.slice(1).split('.')[0],
              loading: false
            };
          })
        );
        
        setSourcesData(updatedData);
      } catch (error) {
        console.error('Error fetching titles:', error);
        setSourcesData(initialData.map(s => ({ 
          ...s, 
          title: s.domain.charAt(0).toUpperCase() + s.domain.slice(1).split('.')[0],
          loading: false 
        })));
      }
    };

    fetchTitles();
  }, [mounted, sources]);

  if (!mounted) {
    return null;
  }

  if (!sources || sources.length === 0) {
    return (
      <section className="mb-6">
        <h3 className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2 font-mono uppercase">
          SOURCES
        </h3>
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm font-mono">No sources available</p>
        </div>
      </section>
    );
  }

  if (sourcesData.length === 0 && mounted) {
    return (
      <section className="mb-6">
        <h3 className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2 font-mono uppercase">
          SOURCES
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: Math.min(sources?.length || 0, 12) }).map((_, index) => (
            <div key={index} className="bg-white border border-black p-3 sm:p-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black overflow-hidden bg-gray-200 animate-pulse"></div>
                <div className="w-full space-y-2">
                  <div className="h-3 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4 mx-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h3 className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2 font-mono uppercase">
        SOURCES ({sourcesData.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {sourcesData.map((sourceData, index) => (
          <SourceCard 
            key={`${sourceData.url}-${index}`} 
            sourceData={sourceData}
          />
        ))}
      </div>
    </section>
  );
}