'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
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
  const observerTarget = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const ITEMS_PER_PAGE = 30;
  const categories = ['All', 'Justice', 'Politics', 'Society', 'Breaking'];

  const filteredEvents = useMemo(() => {
    return initialEvents.filter(event => {
      if (activeFilter === 'All') return true;
      return event.tags?.some(tag => tag.toLowerCase().includes(activeFilter.toLowerCase())) ||
             event.status.toLowerCase().includes(activeFilter.toLowerCase());
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
    }, 500);
  }, [filteredEvents, page, loadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreEvents();
        }
      },
      { threshold: 0.1 }
    );
    
    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }
    
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreEvents, hasMore, loadingMore]);

  useEffect(() => {
    setDisplayedEvents(filteredEvents.slice(0, ITEMS_PER_PAGE));
    setPage(1);
    setHasMore(filteredEvents.length > ITEMS_PER_PAGE);
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
    switch (status.toLowerCase()) {
      case 'injustice':
        return 'INJUSTICE';
      case 'resolved':
        return 'JUSTICE';
      case 'pending':
        return 'DEVELOPING';
      default:
        return status.toUpperCase();
    }
  }, []);

  const handleEventClick = useCallback((eventId: number) => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedEvents.map((event) => (
            <article 
              key={event.event_id} 
              onClick={() => handleEventClick(event.event_id)}
              className="group cursor-pointer"
            >
              <div className="relative h-64 mb-6 overflow-hidden bg-gray-100">
                <Image
                  src={event.image_url || '/api/placeholder/400/300'}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/400/300';
                  }}
                  priority={false}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-normal tracking-widest text-black font-mono">
                  <time>{formatDate(event.incident_date)}</time>
                  <span className="bg-black text-white px-2 py-1 tracking-wide">
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

        <div ref={observerTarget} className="h-10" />

        {displayedEvents.length === 0 && (
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
        )}
      </main>
    </>
  );
}