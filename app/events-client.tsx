'use client';
import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';

const SearchBar = lazy(() => import('./search-bar'));

interface Event {
  event_id: number;
  title: string;
  image_url: string | null;
  status: string;
  tags: string[] | null;
  query: string | null;
  summary: string | null;
  last_updated: string | null;
  incident_date: string | null;
  slug?: string;
}

interface CacheBatch {
  events: Event[];
  batchNumber: number;
  totalBatches: number;
}

interface EventsClientProps {
  batches: CacheBatch[];
  allEvents: Event[];
}

function EventCardSkeleton() {
  return (
    <article className="animate-pulse">
      <div className="relative h-64 mb-6 bg-gray-200"></div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 w-24"></div>
          <div className="h-6 bg-gray-200 w-20"></div>
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 w-full"></div>
          <div className="h-5 bg-gray-200 w-4/5"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 w-full"></div>
          <div className="h-3 bg-gray-200 w-full"></div>
          <div className="h-3 bg-gray-200 w-3/4"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 w-16"></div>
          <div className="h-6 bg-gray-200 w-20"></div>
        </div>
      </div>
    </article>
  );
}

export function EventsClient({ batches, allEvents }: EventsClientProps) {
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [clickedSlug, setClickedSlug] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  
  const router = useRouter();
  
  const categories = ['All', 'Justice', 'Injustice'];

  // Create filtered batches based on active filter (memoized)
  const filteredBatches = useMemo(() => {
    if (activeFilter === 'All') {
      return batches;
    }

    const filteredEvents = allEvents.filter(
      event => event.status.toLowerCase() === activeFilter.toLowerCase()
    );

    const newBatches: CacheBatch[] = [];
    const batchSize = 30;
    const totalBatches = Math.ceil(filteredEvents.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      newBatches.push({
        events: filteredEvents.slice(start, end),
        batchNumber: i + 1,
        totalBatches
      });
    }

    return newBatches;
  }, [activeFilter, batches, allEvents]);

  // Get events to display (either search results or batched events)
  const displayedEvents = useMemo(() => {
    if (searchActive && searchResults) {
      return searchResults;
    }

    const eventsToShow: Event[] = [];
    for (let i = 0; i <= currentBatchIndex && i < filteredBatches.length; i++) {
      eventsToShow.push(...filteredBatches[i].events);
    }
    return eventsToShow;
  }, [searchActive, searchResults, currentBatchIndex, filteredBatches]);

  const hasMoreBatches = currentBatchIndex < filteredBatches.length - 1;

  // Handle filter change
  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
    setCurrentBatchIndex(0);
    setSearchResults(null);
    setSearchActive(false);
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMoreBatches) {
      setCurrentBatchIndex(prev => prev + 1);
    }
  }, [hasMoreBatches]);

  // Handle search results
  const handleSearchResults = useCallback((results: Event[] | null, isActive: boolean) => {
    setSearchResults(results);
    setSearchActive(isActive);
  }, []);

  // Handle search toggle
  const handleSearchToggle = useCallback(() => {
    setSearchExpanded(prev => !prev);
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'NO DATE';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    return status.toUpperCase();
  }, []);

  const handleEventClick = useCallback((event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    const slug = event.slug || `${event.event_id}-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    setClickedSlug(slug);
    setTimeout(() => {
      router.push(`/event/${slug}`);
    }, 150);
  }, [router]);

  return (
    <>
      <section className="border-y border-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center justify-center gap-2 md:gap-3">
            {/* Category Tags */}
            {!searchExpanded && categories.map((category) => (
              <button
                key={category}
                onClick={() => handleFilterChange(category)}
                className={`px-3 md:px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 font-mono whitespace-nowrap h-[36px] ${
                  activeFilter === category
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                } hover:scale-105 active:scale-95`}
              >
                {category.toUpperCase()}
              </button>
            ))}
            
            {/* Search Bar */}
            <div className={`transition-all duration-300 ${
              searchExpanded 
                ? 'w-full max-w-full md:max-w-2xl' 
                : 'w-auto'
            }`}>
              <Suspense fallback={
                <button className="px-3 md:px-4 py-2 rounded-full text-xs font-medium tracking-wide font-mono bg-gray-100 text-black h-[36px]">
                  SEARCH
                </button>
              }>
                <SearchBar 
                  allEvents={allEvents} 
                  activeFilter={activeFilter}
                  onSearchResults={handleSearchResults}
                  isExpanded={searchExpanded}
                  onToggle={handleSearchToggle}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {displayedEvents.length === 0 ? (
          <div className="text-center py-24 animate-in fade-in duration-500">
            <div className="text-black font-normal tracking-wide text-lg font-mono mb-4">
              {searchActive ? 'NO STORIES MATCH YOUR SEARCH' : 'NO STORIES FOUND'}
            </div>
            {searchActive && (
              <button 
                onClick={() => {
                  setSearchResults(null);
                  setSearchActive(false);
                  setSearchExpanded(false);
                  handleFilterChange('All');
                }}
                className="text-black font-medium hover:text-gray-600 transition-colors font-mono text-sm underline hover:scale-105 active:scale-95 inline-block transition-transform duration-200"
              >
                CLEAR SEARCH
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedEvents.map((event, index) => {
                const slug = event.slug || `${event.event_id}-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                return (
                  <article 
                    key={`${event.event_id}-${index}`}
                    onClick={(e) => handleEventClick(event, e)}
                    className={`group cursor-pointer transition-opacity duration-150 ${
                      clickedSlug === slug ? 'opacity-60' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEventClick(event, e as any);
                      }
                    }}
                  >
                    <div className="relative h-64 mb-6 overflow-hidden bg-gray-100">
                      <img
                        src={event.image_url || '/api/placeholder/400/300'}
                        alt={event.title}
                        loading={index < 9 ? 'eager' : 'lazy'}
                        className="w-full h-full object-cover grayscale md:group-hover:grayscale-0 group-active:grayscale-0 transition-all duration-500 pointer-events-none"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/400/300';
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-normal tracking-widest text-black font-mono">
                        <time>{formatDate(event.incident_date)}</time>
                        <span className="px-2 py-1 tracking-wide bg-black text-white">
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold tracking-tight text-black leading-tight transition-colors text-justify" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {event.title}
                      </h3>
                      <p className="text-black font-normal leading-relaxed text-sm line-clamp-3 text-justify font-mono">
                        {event.summary || 'Breaking story developing...'}
                      </p>
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {event.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="text-xs font-normal text-black border border-black px-2 py-1 tracking-wide font-mono"
                            >
                              {tag.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {!searchActive && hasMoreBatches && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 font-mono bg-black text-white hover:bg-gray-800 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                  LOAD MORE
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
