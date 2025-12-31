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
      setTimeout(() => searchInputRef.current?.focus(), 400);
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

  return (
    <div className="relative w-full h-[36px] flex items-center justify-center">
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isExpanded 
            ? 'opacity-100 scale-100' 
            : 'opacity-100 scale-100'
        }`}
      >
        <div className={`relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isExpanded 
            ? 'w-full' 
            : 'w-auto'
        }`}>
          <div className={`flex items-center px-4 py-2 rounded-full border-2 bg-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isExpanded 
              ? 'border-black shadow-sm justify-between gap-2 md:gap-3' 
              : 'border-transparent bg-gray-100 hover:bg-gray-200 justify-center cursor-pointer hover:scale-105 active:scale-95'
          }`}
          onClick={!isExpanded ? onToggle : undefined}
          >
            <div className={`flex items-center gap-2 md:gap-3 transition-all duration-500 ${
              isExpanded ? 'flex-1 min-w-0' : 'flex-none'
            }`}>
              <Search className={`w-4 h-4 flex-shrink-0 transition-colors duration-500 ${
                isExpanded ? 'text-gray-500' : 'text-black'
              }`} />
              
              <div className={`relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
                isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'
              }`}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search stories..."
                  className="w-full bg-transparent outline-none text-black placeholder-gray-400 font-mono text-xs md:text-sm"
                />
              </div>
              
              <span className={`text-xs font-medium tracking-wide font-mono text-black whitespace-nowrap transition-all duration-500 ${
                isExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              }`}>
                SEARCH
              </span>
            </div>
            
            <button
              onClick={isExpanded ? onToggle : undefined}
              className={`flex-shrink-0 transition-all duration-500 ${
                isExpanded 
                  ? 'opacity-100 scale-100 rotate-0 hover:rotate-90 text-gray-600 hover:text-black' 
                  : 'opacity-0 scale-0 w-0'
              }`}
              aria-label="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
