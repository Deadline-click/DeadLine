'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

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

interface EventsClientProps {
  initialEvents: Event[];
}

interface CacheEntry {
  events: Event[];
  hasMore: boolean;
  offset: number;
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

export function EventsClient({ initialEvents }: EventsClientProps) {
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [clickedSlug, setClickedSlug] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const searchIndexRef = useRef<Map<number, string>>(new Map());
  const router = useRouter();
  
  const ITEMS_PER_PAGE = 30;
  const FETCH_SIZE = 50;
  const categories = ['All', 'Justice', 'Injustice'];

  // Sort events by last_updated (most recent first - DESCENDING)
  const sortEventsByLastUpdated = useCallback((events: Event[]): Event[] => {
    return [...events].sort((a, b) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return dateB - dateA; // Descending: newest first
    });
  }, []);

  // Build search index for fast searching
  const buildSearchIndex = useCallback((events: Event[]) => {
    events.forEach(event => {
      if (!searchIndexRef.current.has(event.event_id)) {
        const searchText = [
          event.title,
          event.summary || '',
          event.incident_date || '',
          ...(event.tags || [])
        ]
          .join(' ')
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        searchIndexRef.current.set(event.event_id, searchText);
      }
    });
  }, []);

  // Fast search implementation
  const performSearch = useCallback((query: string, events: Event[]): Event[] => {
    if (!query.trim()) return events;
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) return events;
    
    return events.filter(event => {
      const searchText = searchIndexRef.current.get(event.event_id) || '';
      return searchTerms.every(term => searchText.includes(term));
    });
  }, []);

  // Get cache key
  const getCacheKey = useCallback((filter: string): string => {
    return filter.toLowerCase();
  }, []);

  // Initialize cache with sorted initial events
  useEffect(() => {
    const sortedInitial = sortEventsByLastUpdated(initialEvents);
    buildSearchIndex(sortedInitial);
    
    // Cache "All" events
    cacheRef.current.set('all', {
      events: sortedInitial,
      hasMore: sortedInitial.length >= FETCH_SIZE,
      offset: sortedInitial.length
    });
    
    // Cache filtered events - also sorted by last_updated
    const justiceEvents = sortEventsByLastUpdated(
      sortedInitial.filter(e => e.status.toLowerCase() === 'justice')
    );
    const injusticeEvents = sortEventsByLastUpdated(
      sortedInitial.filter(e => e.status.toLowerCase() === 'injustice')
    );
    
    cacheRef.current.set('justice', {
      events: justiceEvents,
      hasMore: true,
      offset: 0
    });
    
    cacheRef.current.set('injustice', {
      events: injusticeEvents,
      hasMore: true,
      offset: 0
    });
    
    setDisplayedEvents(sortedInitial.slice(0, ITEMS_PER_PAGE));
    setInitialLoading(false);
  }, [initialEvents, sortEventsByLastUpdated, buildSearchIndex]);

  // Fetch more events from API
  const fetchMoreEvents = useCallback(async (filter: string): Promise<Event[]> => {
    const cacheKey = getCacheKey(filter);
    const cache = cacheRef.current.get(cacheKey);
    
    if (!cache || !cache.hasMore) return [];
    
    try {
      const params = new URLSearchParams({
        limit: FETCH_SIZE.toString(),
        offset: cache.offset.toString()
      });
      
      if (filter !== 'All') {
        params.append('status', filter.toLowerCase());
      }
      
      const response = await fetch(`/api/get/events?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store' // Don't auto-revalidate
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const newEvents: Event[] = data.events || [];
      
      if (newEvents.length > 0) {
        buildSearchIndex(newEvents);
        
        // Merge and sort all events by last_updated
        const allEvents = [...cache.events, ...newEvents];
        const sortedAll = sortEventsByLastUpdated(allEvents);
        
        cacheRef.current.set(cacheKey, {
          events: sortedAll,
          hasMore: newEvents.length >= FETCH_SIZE,
          offset: cache.offset + newEvents.length
        });
        
        return newEvents;
      }
      
      // No more events to fetch
      cacheRef.current.set(cacheKey, {
        ...cache,
        hasMore: false
      });
      
      return [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }, [getCacheKey, sortEventsByLastUpdated, buildSearchIndex]);

  // Get current events for display
  const getCurrentEvents = useCallback((): Event[] => {
    const cacheKey = getCacheKey(activeFilter);
    const cache = cacheRef.current.get(cacheKey);
    
    if (!cache) return [];
    
    if (searchQuery.trim()) {
      // Search results are also sorted by last_updated
      return performSearch(searchQuery, cache.events);
    }
    
    return cache.events;
  }, [activeFilter, searchQuery, getCacheKey, performSearch]);

  // Handle filter change
  const handleFilterChange = useCallback(async (filter: string) => {
    setActiveFilter(filter);
    setSearchQuery('');
    setCurrentPage(1);
    
    const cacheKey = getCacheKey(filter);
    const cache = cacheRef.current.get(cacheKey);
    
    if (!cache) return;
    
    // If cache is empty and can fetch more, do initial fetch
    if (cache.events.length === 0 && cache.hasMore) {
      setLoading(true);
      await fetchMoreEvents(filter);
      const updatedCache = cacheRef.current.get(cacheKey);
      if (updatedCache) {
        setDisplayedEvents(updatedCache.events.slice(0, ITEMS_PER_PAGE));
      }
      setLoading(false);
    } else {
      setDisplayedEvents(cache.events.slice(0, ITEMS_PER_PAGE));
    }
  }, [getCacheKey, fetchMoreEvents]);

  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setIsSearching(true);
    
    setTimeout(() => {
      const filtered = getCurrentEvents();
      setDisplayedEvents(filtered.slice(0, ITEMS_PER_PAGE));
      setIsSearching(false);
    }, 150);
  }, [getCurrentEvents]);

  // Toggle search bar
  const toggleSearch = useCallback(() => {
    setSearchExpanded(prev => {
      const newState = !prev;
      if (newState) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
        setCurrentPage(1);
        const cacheKey = getCacheKey(activeFilter);
        const cache = cacheRef.current.get(cacheKey);
        if (cache) {
          setDisplayedEvents(cache.events.slice(0, ITEMS_PER_PAGE));
        }
      }
      return newState;
    });
  }, [activeFilter, getCacheKey]);

  // Load more handler
  const handleLoadMore = useCallback(async () => {
    if (loading) return;
    
    const currentEvents = getCurrentEvents();
    const nextPageEnd = (currentPage + 1) * ITEMS_PER_PAGE;
    
    // If we have enough events in cache, just show more
    if (nextPageEnd <= currentEvents.length) {
      setDisplayedEvents(currentEvents.slice(0, nextPageEnd));
      setCurrentPage(prev => prev + 1);
      return;
    }
    
    // If searching, no need to fetch more (search already covers all cached)
    if (searchQuery.trim()) {
      if (currentEvents.length > displayedEvents.length) {
        setDisplayedEvents(currentEvents.slice(0, nextPageEnd));
        setCurrentPage(prev => prev + 1);
      }
      return;
    }
    
    // Need to fetch more from API
    const cacheKey = getCacheKey(activeFilter);
    const cache = cacheRef.current.get(cacheKey);
    
    if (cache && cache.hasMore) {
      setLoading(true);
      const newEvents = await fetchMoreEvents(activeFilter);
      
      if (newEvents.length > 0) {
        const updatedEvents = getCurrentEvents();
        setDisplayedEvents(updatedEvents.slice(0, nextPageEnd));
        setCurrentPage(prev => prev + 1);
      }
      
      setLoading(false);
    }
  }, [
    loading,
    currentPage,
    getCurrentEvents,
    searchQuery,
    displayedEvents.length,
    activeFilter,
    getCacheKey,
    fetchMoreEvents
  ]);

  // Check if more content available
  const hasMore = useCallback((): boolean => {
    const currentEvents = getCurrentEvents();
    const cacheKey = getCacheKey(activeFilter);
    const cache = cacheRef.current.get(cacheKey);
    
    return (
      displayedEvents.length < currentEvents.length ||
      (Boolean(cache?.hasMore) && !searchQuery.trim())
    );
  }, [getCurrentEvents, displayedEvents.length, activeFilter, getCacheKey, searchQuery]);

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
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-wrap gap-3 justify-center items-center relative">
            <div className={`flex flex-wrap gap-3 justify-center items-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              searchExpanded 
                ? 'opacity-0 scale-90 blur-sm pointer-events-none absolute inset-0' 
                : 'opacity-100 scale-100 blur-0 relative'
            }`}>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleFilterChange(category)}
                  className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 font-mono ${
                    activeFilter === category
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  {category.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className={`transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              searchExpanded 
                ? 'w-full max-w-xl opacity-100 scale-100' 
                : 'w-auto opacity-100 scale-100'
            }`}>
              {searchExpanded ? (
                <div className="px-4 py-2 rounded-full border-2 border-black bg-white w-full">
                  <div className="flex items-center justify-between w-full gap-2">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search by title, summary, date, or tags..."
                      className="flex-1 bg-transparent outline-none text-black placeholder-gray-400 font-mono text-xs"
                    />
                    <button
                      onClick={toggleSearch}
                      className="text-black hover:text-gray-600 flex-shrink-0 transition-all duration-300 hover:rotate-90"
                      aria-label="Close search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={toggleSearch}
                  className="px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 font-mono bg-gray-100 text-black hover:bg-gray-200 hover:scale-105 active:scale-95"
                >
                  SEARCH
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {(initialLoading || isSearching) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <EventCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-black font-normal tracking-wide text-lg font-mono mb-4">
              {searchQuery ? 'NO STORIES MATCH YOUR SEARCH' : 'NO STORIES FOUND'}
            </div>
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  handleFilterChange('All');
                }}
                className="text-black font-medium hover:text-gray-600 transition-colors font-mono text-sm underline"
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

            {hasMore() && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`px-8 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 font-mono ${
                    loading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800 hover:scale-105 active:scale-95'
                  }`}
                >
                  {loading ? 'LOADING...' : 'LOAD MORE'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
