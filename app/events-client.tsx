'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
}

interface EventsClientProps {
  initialEvents: Event[];
}

interface FilterCache {
  events: Event[];
  hasMore: boolean;
  totalFetched: number;
}

interface SearchIndexEntry {
  event_id: number;
  searchText: string;
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
  const [activeFilter, setActiveFilter] = useState('All');
  const [clickedSlug, setClickedSlug] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterCacheRef = useRef<Map<string, FilterCache>>(new Map());
  const searchIndexRef = useRef<Map<number, SearchIndexEntry>>(new Map());
  const searchCacheRef = useRef<Map<string, Event[]>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const ITEMS_PER_PAGE = 30;
  const ITEMS_PER_FETCH = 50;
  const categories = ['All', 'Justice', 'Injustice'];

  // Generate slug from event
  const getSlug = useCallback((event: Event): string => {
    const titleSlug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${event.event_id}-${titleSlug}`;
  }, []);

  // Build search index
  const buildSearchIndex = useCallback((events: Event[]) => {
    events.forEach(event => {
      if (!searchIndexRef.current.has(event.event_id)) {
        const searchText = [
          event.title,
          event.summary || '',
          ...(event.tags || [])
        ]
          .join(' ')
          .toLowerCase()
          .trim();
        
        searchIndexRef.current.set(event.event_id, {
          event_id: event.event_id,
          searchText
        });
      }
    });
  }, []);

  // Search events
  const searchEvents = useCallback((query: string, sourceEvents: Event[]): Event[] => {
    if (!query.trim()) return sourceEvents;
    
    const cacheKey = `${activeFilter}-${query}`;
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey)!;
    }
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    const matchedIds = new Set<number>();
    
    searchIndexRef.current.forEach((entry, eventId) => {
      const matches = searchTerms.every(term => entry.searchText.includes(term));
      if (matches) matchedIds.add(eventId);
    });
    
    const results = sourceEvents.filter(event => matchedIds.has(event.event_id));
    searchCacheRef.current.set(cacheKey, results);
    
    return results;
  }, [activeFilter]);

  // Fetch more events for current filter
  const fetchMoreEvents = useCallback(async (filter: string): Promise<Event[]> => {
    const cache = filterCacheRef.current.get(filter);
    if (!cache || !cache.hasMore) return [];
    
    try {
      const response = await fetch(
        `/api/get/events?limit=${ITEMS_PER_FETCH}&offset=${cache.totalFetched}${
          filter !== 'All' ? `&status=${filter.toLowerCase()}` : ''
        }`,
        {
          headers: { 'Content-Type': 'application/json' },
          cache: 'force-cache'
        }
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const newEvents = data.events || [];
      
      buildSearchIndex(newEvents);
      
      const updatedCache: FilterCache = {
        events: [...cache.events, ...newEvents],
        hasMore: newEvents.length === ITEMS_PER_FETCH,
        totalFetched: cache.totalFetched + newEvents.length
      };
      
      filterCacheRef.current.set(filter, updatedCache);
      
      return newEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }, [buildSearchIndex]);

  // Get filtered events
  const getFilteredEvents = useCallback((): Event[] => {
    const cache = filterCacheRef.current.get(activeFilter);
    if (!cache) return [];
    
    if (searchQuery.trim()) {
      return searchEvents(searchQuery, cache.events);
    }
    
    return cache.events;
  }, [activeFilter, searchQuery, searchEvents]);

  // Initialize cache with initial events
  useEffect(() => {
    buildSearchIndex(initialEvents);
    
    filterCacheRef.current.set('All', {
      events: initialEvents,
      hasMore: initialEvents.length === ITEMS_PER_FETCH,
      totalFetched: initialEvents.length
    });
    
    const justiceEvents = initialEvents.filter(e => e.status.toLowerCase() === 'justice');
    const injusticeEvents = initialEvents.filter(e => e.status.toLowerCase() === 'injustice');
    
    filterCacheRef.current.set('Justice', {
      events: justiceEvents,
      hasMore: true,
      totalFetched: 0
    });
    
    filterCacheRef.current.set('Injustice', {
      events: injusticeEvents,
      hasMore: true,
      totalFetched: 0
    });
    
    setDisplayedEvents(initialEvents.slice(0, ITEMS_PER_PAGE));
  }, [initialEvents, buildSearchIndex]);

  // Load more events
  const loadMore = useCallback(async () => {
    if (loading) return;
    
    const cache = filterCacheRef.current.get(activeFilter);
    if (!cache) return;
    
    const currentFiltered = getFilteredEvents();
    const currentDisplayed = displayedEvents.length;
    
    // If we have more filtered events to show, just display them
    if (currentDisplayed < currentFiltered.length) {
      const nextBatch = currentFiltered.slice(0, currentDisplayed + ITEMS_PER_PAGE);
      setDisplayedEvents(nextBatch);
      return;
    }
    
    // If we've shown all filtered events and there are more to fetch
    if (cache.hasMore && currentDisplayed >= currentFiltered.length) {
      setLoading(true);
      const newEvents = await fetchMoreEvents(activeFilter);
      
      if (newEvents.length > 0) {
        const allFiltered = getFilteredEvents();
        const nextBatch = allFiltered.slice(0, currentDisplayed + ITEMS_PER_PAGE);
        setDisplayedEvents(nextBatch);
      }
      
      setLoading(false);
    }
  }, [loading, activeFilter, displayedEvents.length, getFilteredEvents, fetchMoreEvents]);

  // Handle filter change
  const handleFilterChange = useCallback(async (filter: string) => {
    setActiveFilter(filter);
    setSearchQuery('');
    searchCacheRef.current.clear();
    
    const cache = filterCacheRef.current.get(filter);
    if (!cache) return;
    
    // If we don't have any events for this filter, fetch them
    if (cache.events.length === 0 && cache.hasMore) {
      setLoading(true);
      await fetchMoreEvents(filter);
      const updatedCache = filterCacheRef.current.get(filter);
      if (updatedCache) {
        setDisplayedEvents(updatedCache.events.slice(0, ITEMS_PER_PAGE));
      }
      setLoading(false);
    } else {
      setDisplayedEvents(cache.events.slice(0, ITEMS_PER_PAGE));
    }
  }, [fetchMoreEvents]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearching(true);
    
    setTimeout(() => {
      const filtered = getFilteredEvents();
      setDisplayedEvents(filtered.slice(0, ITEMS_PER_PAGE));
      setIsSearching(false);
    }, 300);
  }, [getFilteredEvents]);

  // Toggle search
  const toggleSearch = useCallback(() => {
    setSearchExpanded(prev => {
      const newState = !prev;
      if (newState) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
        searchCacheRef.current.clear();
        const cache = filterCacheRef.current.get(activeFilter);
        if (cache) {
          setDisplayedEvents(cache.events.slice(0, ITEMS_PER_PAGE));
        }
      }
      return newState;
    });
  }, [activeFilter]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  // Check if there are more events to load
  const hasMore = useMemo(() => {
    const cache = filterCacheRef.current.get(activeFilter);
    if (!cache) return false;
    
    const filtered = getFilteredEvents();
    return displayedEvents.length < filtered.length || cache.hasMore;
  }, [activeFilter, displayedEvents.length, getFilteredEvents]);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'NO DATE';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'justice') return 'JUSTICE';
    if (statusLower === 'injustice') return 'INJUSTICE';
    return status.toUpperCase();
  }, []);

  const handleEventClick = useCallback((event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    const slug = getSlug(event);
    setClickedSlug(slug);
    setTimeout(() => {
      router.push(`/event/${slug}`);
    }, 150);
  }, [router, getSlug]);

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
                      placeholder="Search stories..."
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
        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(9)].map((_, index) => (
              <EventCardSkeleton key={`search-skeleton-${index}`} />
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-black font-normal tracking-wide text-lg font-mono">
              {searchQuery ? 'NO STORIES MATCH YOUR SEARCH' : 'NO STORIES FOUND'}
            </div>
            <button 
              onClick={() => {
                handleFilterChange('All');
                setSearchQuery('');
              }}
              className="mt-4 text-black font-medium hover:text-gray-600 transition-colors font-mono"
            >
              VIEW ALL STORIES
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedEvents.map((event, index) => {
                const slug = getSlug(event);
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
                        setClickedSlug(slug);
                        setTimeout(() => {
                          router.push(`/event/${slug}`);
                        }, 150);
                      }
                    }}
                  >
                    <div className="relative h-64 mb-6 overflow-hidden bg-gray-100">
                      <img
                        src={event.image_url || '/api/placeholder/400/300'}
                        alt={event.title}
                        loading={index < 9 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={index < 3 ? 'high' : 'auto'}
                        className="w-full h-full object-cover grayscale md:group-hover:grayscale-0 group-active:grayscale-0 transition-all duration-500 pointer-events-none"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/400/300';
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-normal tracking-widest text-black font-mono">
                        <time>{formatDate(event.last_updated)}</time>
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
                          {event.tags.slice(0, 2).map((tag, tagIndex) => (
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

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {[...Array(6)].map((_, index) => (
                  <EventCardSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}

            {hasMore && !loading && (
              <div ref={loadMoreTriggerRef} className="h-20 flex items-center justify-center mt-8">
                <div className="text-gray-400 font-mono text-xs">Loading more...</div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}