'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

interface SearchBarProps {
  allEvents: Event[];
  activeFilter: string;
  onSearchResults: (results: Event[] | null, isActive: boolean) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function SearchBar({ allEvents, activeFilter, onSearchResults, isExpanded, onToggle }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchIndexRef = useRef<Map<number, string>>(new Map());

  // Build search index on mount (memoized)
  useEffect(() => {
    if (searchIndexRef.current.size === 0) {
      allEvents.forEach(event => {
        const searchText = [
          event.title,
          event.summary || '',
          event.incident_date || '',
          event.last_updated || '',
          ...(event.tags || [])
        ]
          .join(' ')
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        searchIndexRef.current.set(event.event_id, searchText);
      });
    }
  }, [allEvents]);

  // Get filtered events based on active filter
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'All') {
      return allEvents;
    }
    return allEvents.filter(
      event => event.status.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [allEvents, activeFilter]);

  // Perform search across all events
  const performSearch = useCallback((query: string): Event[] => {
    if (!query.trim()) return filteredEvents;
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) return filteredEvents;
    
    const results = filteredEvents.filter(event => {
      const searchText = searchIndexRef.current.get(event.event_id) || '';
      return searchTerms.every(term => searchText.includes(term));
    });
    
    return results;
  }, [filteredEvents]);

  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (!value.trim()) {
      onSearchResults(null, false);
      return;
    }

    const timeoutId = setTimeout(() => {
      const results = performSearch(value);
      onSearchResults(results, true);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [performSearch, onSearchResults]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    } else {
      setSearchQuery('');
      onSearchResults(null, false);
    }
  }, [isExpanded, onSearchResults]);

  // Clear search when filter changes
  useEffect(() => {
    if (searchQuery) {
      const results = performSearch(searchQuery);
      onSearchResults(results, true);
    }
  }, [activeFilter]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    onSearchResults(null, false);
    onToggle();
  }, [onSearchResults, onToggle]);

  return (
    <div className="relative h-[36px] flex items-center">
      <div 
        className={`relative flex items-center overflow-hidden rounded-full bg-gray-100 transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] h-[36px] ${
          isExpanded 
            ? 'w-full' 
            : 'w-auto cursor-pointer'
        }`}
        style={{
          transform: isExpanded ? 'scale(1)' : 'scale(1)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.15s ease-out, background-color 0.2s ease-out'
        }}
        onClick={!isExpanded ? onToggle : undefined}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = 'rgb(229, 231, 235)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'rgb(243, 244, 246)';
          }
        }}
        onMouseDown={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.transform = 'scale(0.95)';
          }
        }}
        onMouseUp={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
      >
        {/* Search Icon */}
        <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isExpanded ? 'pl-3 md:pl-4 opacity-100 scale-100' : 'pl-0 opacity-0 scale-0 w-0'
        }`}>
          <Search className="w-4 h-4 text-black transition-all duration-300 ease-out" />
        </div>

        {/* Input Field */}
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search stories..."
          className={`bg-transparent text-black placeholder-gray-400 font-mono text-xs md:text-sm outline-none transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isExpanded 
              ? 'flex-1 opacity-100 px-2 translate-x-0' 
              : 'w-0 opacity-0 pointer-events-none -translate-x-4'
          }`}
          style={{
            transitionDelay: isExpanded ? '80ms' : '0ms'
          }}
        />

        {/* Button Text / Close Button Container */}
        <div className="relative flex items-center pr-3 md:pr-4 flex-shrink-0">
          {/* SEARCH Text */}
          <div 
            className={`absolute right-3 md:right-4 transition-all duration-300 ease-out ${
              isExpanded ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
            }`}
          >
            <span className="text-xs font-medium tracking-wide text-black font-mono whitespace-nowrap">
              SEARCH
            </span>
          </div>
          
          {/* Close Button */}
          <div 
            className={`transition-all duration-300 ease-out ${
              isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
            }`}
            style={{
              transitionDelay: isExpanded ? '150ms' : '0ms'
            }}
          >
            <button
              onClick={handleClear}
              className="w-6 h-6 rounded-full bg-black text-white hover:bg-gray-800 transition-all duration-150 ease-out hover:scale-110 active:scale-90 flex items-center justify-center"
              aria-label="Close search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
