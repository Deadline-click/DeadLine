'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();
  const ITEMS_PER_PAGE = 30;
  const categories = ['All', 'Justice', 'Injustice'];

  const filteredEvents = useMemo(() => {
    let filtered = initialEvents;
    
    if (activeFilter !== 'All') {
      filtered = initialEvents.filter(event => {
        const statusLower = event.status.toLowerCase();
        const filterLower = activeFilter.toLowerCase();
        return statusLower === filterLower;
      });
    }
    
    return filtered.sort((a, b) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return dateB - dateA;
    });
  }, [initialEvents, activeFilter]);

  const loadMoreEvents = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = page + 1;
      const endIndex = nextPage * ITEMS_PER_PAGE;
      const newEvents = filteredEvents.slice(0, endIndex);
      
      setDisplayedEvents(newEvents);
      setPage(nextPage);
      setHasMore(endIndex < filteredEvents.length);
      setLoadingMore(false);
    }, 200);
  }, [filteredEvents, page, loadingMore, hasMore]);

  useEffect(() => {
    setIsInitializing(true);
    
    const timer = setTimeout(() => {
      const initialBatch = filteredEvents.slice(0, ITEMS_PER_PAGE);
      setDisplayedEvents(initialBatch);
      setPage(1);
      setHasMore(filteredEvents.length > ITEMS_PER_PAGE);
      setIsInitializing(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredEvents]);

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

  const getStatusColor = useCallback((status: string) => {
    return 'bg-black text-white';
  }, []);

  const handleEventClick = useCallback((eventId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/event/${eventId}`);
  }, [router]);

  return (
    <>
      <section className="border-y border-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-200 font-mono ${
                  activeFilter === category
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {isInitializing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(9)].map((_, index) => (
              <EventCardSkeleton key={`init-skeleton-${index}`} />
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-black font-normal tracking-wide text-lg font-mono">
              NO STORIES MATCH YOUR FILTER
            </div>
            <button 
              onClick={() => setActiveFilter('All')}
              className="mt-4 text-black font-medium hover:text-gray-600 transition-colors font-mono"
            >
              VIEW ALL STORIES
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedEvents.map((event, index) => (
                <article 
                  key={event.event_id} 
                  onClick={(e) => handleEventClick(event.event_id, e)}
                  className="group cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/event/${event.event_id}`);
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
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 pointer-events-none"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/400/300';
                      }}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-normal tracking-widest text-black font-mono">
                      <time>{formatDate(event.incident_date)}</time>
                      <span className={`px-2 py-1 tracking-wide ${getStatusColor(event.status)}`}>
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
                        {event.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs font-normal text-black border border-black px-2 py-1 tracking-wide font-mono"
                          >
                            {tag.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {loadingMore && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                {[...Array(6)].map((_, index) => (
                  <EventCardSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMoreEvents}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-black text-white font-mono text-sm tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'LOADING...' : 'LOAD MORE'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}