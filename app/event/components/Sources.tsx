import { useState, useEffect, useMemo } from 'react';

interface SourcesProps {
  sources: string[];
}

interface SourceData {
  url: string;
  title: string;
  domain: string;
  favicon: string;
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
              decoding="async"
            />
          ) : (
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
          )}
        </div>
        <p className="text-black text-xs sm:text-sm text-center font-mono leading-tight px-1 line-clamp-2">
          {sourceData.title}
        </p>
      </div>
    </a>
  );
}

export default function SourcesComponent({ sources }: SourcesProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sourceDataList = useMemo(() => {
    if (!sources || sources.length === 0) return [];
    
    return sources
      .filter(source => {
        try {
          new URL(source);
          return true;
        } catch {
          return false;
        }
      })
      .map(url => {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace('www.', '');
          
          return {
            url,
            domain,
            title: domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0],
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
          };
        } catch {
          return null;
        }
      })
      .filter((data): data is SourceData => data !== null);
  }, [sources]);

  if (!isClient || sourceDataList.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <h3 className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2 font-mono uppercase">
        SOURCES
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {sourceDataList.map((sourceData, index) => (
          <SourceCard 
            key={`${sourceData.url}-${index}`} 
            sourceData={sourceData}
          />
        ))}
      </div>
    </section>
  );
}