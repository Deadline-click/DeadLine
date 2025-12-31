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
}

export default function SearchBar({ allEvents, activeFilter, onSearchResults }: SearchBarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
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

  // Toggle search bar
  const toggleSearch = useCallback(() => {
    setSearchExpanded(prev => {
      const newState = !prev;
      if (newState) {
        setTimeout(() => searchInputRef.current?.focus(), 200);
      } else {
        setSearchQuery('');
        onSearchResults(null, false);
      }
      return newState;
    });
  }, [onSearchResults]);

  // Clear search when filter changes
  useEffect(() => {
    if (searchQuery) {
      const results = performSearch(searchQuery);
      onSearchResults(results, true);
    }
  }, [activeFilter]);

  return (
    <div 
      className={`relative transition-all duration-500 ease-out ${
        searchExpanded 
          ? 'w-full max-w-2xl' 
          : 'w-auto'
      }`}
    >
      <div className={`relative overflow-hidden transition-all duration-500 ease-out ${
        searchExpanded 
          ? 'w-full' 
          : 'w-auto'
      }`}>
        {searchExpanded ? (
          <div className="w-full px-5 py-2.5 rounded-full border-2 border-black bg-white shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between w-full gap-3">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0 transition-colors duration-300" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by title, summary, date, or tags..."
                className="flex-1 bg-transparent outline-none text-black placeholder-gray-400 font-mono text-xs transition-all duration-300"
              />
              <button
                onClick={toggleSearch}
                className="text-gray-600 hover:text-black flex-shrink-0 transition-all duration-300 hover:rotate-90 active:scale-90"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={toggleSearch}
            className="px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 font-mono bg-gray-100 text-black hover:bg-gray-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            SEARCH
          </button>
        )}
      </div>
    </div>
  );
}
