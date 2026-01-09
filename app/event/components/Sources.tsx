'use client';

import { useState } from 'react';

interface SourceData {
  url: string;
  title: string;
  domain: string;
  favicon: string;
}

interface SourcesProps {
  sources: SourceData[];
}

function SourceCard({ sourceData, index }: { sourceData: SourceData; index: number }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article 
      itemScope 
      itemType="https://schema.org/WebPage"
      className="h-full"
    >
      <a 
        href={sourceData.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="bg-white border border-black p-3 sm:p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 transform hover:-translate-y-0.5 block h-full"
        itemProp="url"
        aria-label={`Read source ${index + 1}: ${sourceData.title} from ${sourceData.domain}`}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black overflow-hidden bg-white flex items-center justify-center relative">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" role="status" aria-label="Loading icon">
                <span className="sr-only">Loading</span>
              </div>
            )}
            {!imageError ? (
              <img 
                src={sourceData.favicon}
                alt={`${sourceData.domain} favicon`}
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
                width="24"
                height="24"
                itemProp="image"
              />
            ) : (
              <div className="w-4 h-4 bg-gray-300 rounded" aria-hidden="true"></div>
            )}
          </div>
          <p className="text-black text-xs sm:text-sm text-center font-mono leading-tight px-1 line-clamp-2" itemProp="name">
            {sourceData.title}
          </p>
          <meta itemProp="publisher" content={sourceData.domain} />
        </div>
      </a>
    </article>
  );
}

export default function SourcesComponent({ sources }: SourcesProps) {
  if (!sources || sources.length === 0) {
    return (
      <section className="mb-6" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2 font-mono uppercase">
          SOURCES
        </h2>
        <div className="text-center py-6 text-gray-400" role="status">
          <p className="text-sm font-mono">No sources available</p>
        </div>
      </section>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "numberOfItems": sources.length,
    "itemListElement": sources.map((source, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "WebPage",
        "url": source.url,
        "name": source.title,
        "publisher": {
          "@type": "Organization",
          "name": source.domain
        }
      }
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
        aria-labelledby="sources-heading"
        itemScope 
        itemType="https://schema.org/ItemList"
      >
        <h2 id="sources-heading" className="text-base font-bold mb-3 sm:mb-4 text-black border-b-2 border-black pb-2 font-mono uppercase">
          SOURCES (<span itemProp="numberOfItems">{sources.length}</span>)
        </h2>
        <nav aria-label="Source references">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3" role="list">
            {sources.map((sourceData, index) => (
              <li 
                key={`${sourceData.url}-${index}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <meta itemProp="position" content={String(index + 1)} />
                <SourceCard 
                  sourceData={sourceData}
                  index={index}
                />
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </>
  );
}