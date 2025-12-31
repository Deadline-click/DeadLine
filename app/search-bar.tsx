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
      setTimeout(() => searchInputRef.current?.focus(), 100);
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
      {!isExpanded ? (
        <button
          onClick={onToggle}
          className="px-3 md:px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 font-mono whitespace-nowrap h-[36px] bg-gray-100 text-black hover:bg-gray-200 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          SEARCH
        </button>
      ) : (
        <div className="flex items-center gap-2 w-full animate-in fade-in duration-300">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search stories..."
              className="w-full h-[36px] pl-10 pr-4 rounded-full border-2 border-black bg-white text-black placeholder-gray-400 font-mono text-xs md:text-sm outline-none shadow-sm"
            />
          </div>
          <button
            onClick={handleClear}
            className="flex-shrink-0 w-[36px] h-[36px] rounded-full bg-black text-white hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center shadow-md"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
