'use client';

import { useState, useEffect, useRef } from 'react';

interface KeyFact {
  label: string;
  value: string;
}

interface TimelineEvent {
  time?: string;
  description: string;
  participants?: string;
  evidence?: string;
}

interface TimelineEntry {
  date: string;
  event?: string;
  details?: string;
  context?: string;
  events?: TimelineEvent[];
}

interface PartyDetails {
  name: string;
  summary: string;
  details?: KeyFact[];
}

interface EventDetails {
  event_id: string;
  location: string;
  headline: string;
  details: {
    overview: string;
    keyPoints?: KeyFact[];
  };
  accused: {
    individuals?: PartyDetails[];
    organizations?: PartyDetails[];
  };
  victims: {
    individuals?: PartyDetails[];
    groups?: PartyDetails[];
  };
  timeline: TimelineEntry[];
  sources: string[];
  images: string[];
  created_at: string;
  updated_at: string;
}

interface EventUpdate {
  update_id: number;
  event_id: string;
  title: string;
  description: string;
  update_date: string;
}

interface EventDetailsProps {
  eventDetails: EventDetails;
  eventUpdates: EventUpdate[];
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading event details">
      <div className="bg-white p-6 border border-black">
        <div className="h-5 bg-gray-300 w-24 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 w-full"></div>
          <div className="h-3 bg-gray-200 w-full"></div>
          <div className="h-3 bg-gray-200 w-3/4"></div>
        </div>
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

function HighlightedText({ text }: { text: string }) {
  if (!text) return null;
  
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const cleanText = part.slice(2, -2);
          return (
            <mark key={index} className="bg-yellow-300 text-black px-1 py-0.5 mx-0.5 font-mono">
              {cleanText}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export default function EventDetailsComponent({ eventDetails, eventUpdates }: EventDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [partiesHeight, setPartiesHeight] = useState<number | null>(null);
  const [bottomHeight, setBottomHeight] = useState<number | null>(null);
  const accusedContentRef = useRef<HTMLDivElement>(null);
  const victimsContentRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const updatesContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      const calculateHeights = () => {
        const accusedHeight = accusedContentRef.current?.scrollHeight || 0;
        const victimsHeight = victimsContentRef.current?.scrollHeight || 0;
        
        if (accusedHeight > 0 && victimsHeight > 0) {
          setPartiesHeight(Math.min(accusedHeight, victimsHeight) + 80);
        }

        const timelineHeight = timelineContentRef.current?.scrollHeight || 0;
        const updatesHeight = updatesContentRef.current?.scrollHeight || 0;
        
        const minUpdatesHeight = eventUpdates && eventUpdates.length === 0 ? 350 : updatesHeight;
        
        if (timelineHeight > 0 && minUpdatesHeight > 0) {
          setBottomHeight(Math.min(timelineHeight, minUpdatesHeight) + 80);
        }
      };

      requestAnimationFrame(() => {
        calculateHeights();
      });

      window.addEventListener('resize', calculateHeights);
      return () => window.removeEventListener('resize', calculateHeights);
    }
  }, [loading, eventUpdates]);

  if (loading) {
    return <Skeleton />;
  }

  const accused = eventDetails.accused || { individuals: [], organizations: [] };
  const victims = eventDetails.victims || { individuals: [], groups: [] };
  const timeline = eventDetails.timeline || [];
  const details = eventDetails.details || { overview: '', keyPoints: [] };

  const allAccused = [
    ...(accused.individuals || []),
    ...(accused.organizations || [])
  ];

  const allVictims = [
    ...(victims.individuals || []),
    ...(victims.groups || [])
  ];

  const sortedKeyPoints = details.keyPoints 
    ? [...details.keyPoints].sort((a, b) => a.value.length - b.value.length)
    : [];

  const accusedNeedsScroll = partiesHeight && accusedContentRef.current && 
    accusedContentRef.current.scrollHeight > (partiesHeight - 80);
  
  const victimsNeedsScroll = partiesHeight && victimsContentRef.current && 
    victimsContentRef.current.scrollHeight > (partiesHeight - 80);

  const timelineNeedsScroll = bottomHeight && timelineContentRef.current && 
    timelineContentRef.current.scrollHeight > (bottomHeight - 80);
  
  const updatesNeedsScroll = bottomHeight && updatesContentRef.current && 
    updatesContentRef.current.scrollHeight > (bottomHeight - 80);

  const hasUpdates = eventUpdates && Array.isArray(eventUpdates) && eventUpdates.length > 0;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": eventDetails.headline,
    "datePublished": eventDetails.created_at,
    "dateModified": eventDetails.updated_at,
    "description": details.overview,
    "articleBody": details.overview,
    "locationCreated": {
      "@type": "Place",
      "name": eventDetails.location
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="max-w-7xl mx-auto">
        <article className="mb-4" itemScope itemType="https://schema.org/NewsArticle">
          <meta itemProp="headline" content={eventDetails.headline} />
          <meta itemProp="datePublished" content={eventDetails.created_at} />
          <meta itemProp="dateModified" content={eventDetails.updated_at} />
          
          <section className="bg-white p-5 border border-black" aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-sm font-bold mb-3 uppercase tracking-tight text-black border-b border-black pb-2 font-mono">
              OVERVIEW
            </h2>
            <p className="text-xs leading-loose text-justify mb-4 text-black font-mono" itemProp="description">
              <HighlightedText text={details.overview || ''} />
            </p>
            
            {sortedKeyPoints.length > 0 && (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2 mt-4 pt-4 border-t border-gray-300">
                {sortedKeyPoints.map((fact, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <dt className="bg-black text-white px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0 font-mono">
                      {fact.label}
                    </dt>
                    <dd className="text-black text-[11px] leading-relaxed flex-1 font-mono">
                      <HighlightedText text={fact.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </article>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {allAccused.length > 0 && (
            <article className="bg-white border border-black relative" aria-labelledby="accused-heading"
                 style={{ height: partiesHeight ? `${partiesHeight}px` : 'auto' }}>
              <header className="p-4 pb-2">
                <h3 id="accused-heading" className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                  ACCUSED PARTIES
                </h3>
              </header>
              <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                   style={{ height: partiesHeight ? `${partiesHeight - 70}px` : 'auto' }}
                   role="region"
                   aria-label="Accused parties information"
                   tabIndex={0}>
                <div ref={accusedContentRef} className="space-y-4">
                  {allAccused.map((person, index) => {
                    const sortedDetails = person.details
                      ? [...person.details].sort((a, b) => a.value.length - b.value.length)
                      : [];
                    
                    return (
                      <article key={index} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0" itemScope itemType="https://schema.org/Person">
                        <h4 className="text-sm font-bold mb-2 text-black font-mono" itemProp="name">
                          <HighlightedText text={person.name} />
                        </h4>
                        <p className="text-[11px] leading-relaxed text-justify mb-3 text-black font-mono" itemProp="description">
                          <HighlightedText text={person.summary || ''} />
                        </p>
                        {sortedDetails.length > 0 && (
                          <dl className="space-y-1.5 pl-2 border-l-2 border-black">
                            {sortedDetails.map((fact, factIndex) => (
                              <div key={factIndex} className="flex items-start gap-2">
                                <dt className="bg-black text-white px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0 font-mono">
                                  {fact.label}
                                </dt>
                                <dd className="text-black text-[11px] leading-relaxed flex-1 font-mono">
                                  <HighlightedText text={fact.value} />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
              {accusedNeedsScroll && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none" aria-hidden="true"></div>
              )}
            </article>
          )}

          {allVictims.length > 0 && (
            <article className="bg-white border border-black relative" aria-labelledby="victims-heading"
                 style={{ height: partiesHeight ? `${partiesHeight}px` : 'auto' }}>
              <header className="p-4 pb-2">
                <h3 id="victims-heading" className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                  AFFECTED PARTIES
                </h3>
              </header>
              <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                   style={{ height: partiesHeight ? `${partiesHeight - 70}px` : 'auto' }}
                   role="region"
                   aria-label="Affected parties information"
                   tabIndex={0}>
                <div ref={victimsContentRef} className="space-y-4">
                  {allVictims.map((victim, index) => {
                    const sortedDetails = victim.details
                      ? [...victim.details].sort((a, b) => a.value.length - b.value.length)
                      : [];
                    
                    return (
                      <article key={index} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0" itemScope itemType="https://schema.org/Person">
                        <h4 className="text-sm font-bold mb-2 text-black font-mono" itemProp="name">
                          <HighlightedText text={victim.name} />
                        </h4>
                        <p className="text-[11px] leading-relaxed text-justify mb-3 text-black font-mono" itemProp="description">
                          <HighlightedText text={victim.summary || ''} />
                        </p>
                        {sortedDetails.length > 0 && (
                          <dl className="space-y-1.5 pl-2 border-l-2 border-black">
                            {sortedDetails.map((fact, factIndex) => (
                              <div key={factIndex} className="flex items-start gap-2">
                                <dt className="bg-black text-white px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0 font-mono">
                                  {fact.label}
                                </dt>
                                <dd className="text-black text-[11px] leading-relaxed flex-1 font-mono">
                                  <HighlightedText text={fact.value} />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
              {victimsNeedsScroll && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none" aria-hidden="true"></div>
              )}
            </article>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {timeline.length > 0 && (
            <article className="bg-white border border-black relative" aria-labelledby="timeline-heading"
                 style={{ height: bottomHeight ? `${bottomHeight}px` : 'auto' }}>
              <header className="p-4 pb-2">
                <h3 id="timeline-heading" className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                  TIMELINE
                </h3>
              </header>
              <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                   style={{ height: bottomHeight ? `${bottomHeight - 70}px` : 'auto' }}
                   role="region"
                   aria-label="Event timeline"
                   tabIndex={0}>
                <div ref={timelineContentRef} className="relative">
                  <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-black" aria-hidden="true"></div>
                  <ol className="space-y-3">
                    {timeline.map((entry, index) => (
                      <li key={index} className="relative pl-7">
                        <div className="absolute left-1 top-1.5 w-3 h-3 bg-black border-2 border-white" aria-hidden="true"></div>
                        <div>
                          {entry.date && (
                            <div className="mb-2">
                              <time className="inline-block px-1.5 py-0.5 bg-black text-white text-[10px] uppercase tracking-wide font-bold font-mono" dateTime={entry.date}>
                                {entry.date}
                              </time>
                            </div>
                          )}
                          
                          {entry.event && (
                            <p className="text-[11px] font-bold leading-relaxed mb-2 text-black font-mono">
                              <HighlightedText text={entry.event} />
                            </p>
                          )}
                          
                          {entry.context && (
                            <p className="text-[11px] font-bold leading-relaxed mb-2 text-black font-mono">
                              <HighlightedText text={entry.context} />
                            </p>
                          )}
                          
                          {entry.details && (
                            <p className="text-[11px] leading-relaxed mb-2 text-black font-mono">
                              <HighlightedText text={entry.details} />
                            </p>
                          )}
                          
                          {entry.events && entry.events.length > 0 && (
                            <ul className="space-y-2 pl-2 border-l border-gray-300 mt-2">
                              {entry.events.map((evt, evtIndex) => (
                                <li key={evtIndex}>
                                  {evt.time && (
                                    <time className="inline-block px-1.5 py-0.5 bg-gray-800 text-white text-[10px] mb-1 font-mono" dateTime={evt.time}>
                                      {evt.time}
                                    </time>
                                  )}
                                  <p className="text-[11px] leading-relaxed text-black mb-1 font-mono">
                                    <HighlightedText text={evt.description} />
                                  </p>
                                  {evt.participants && (
                                    <p className="text-[10px] text-gray-600 italic mb-1 font-mono">
                                      <strong>Participants:</strong> <HighlightedText text={evt.participants} />
                                    </p>
                                  )}
                                  {evt.evidence && (
                                    <p className="text-[10px] text-gray-600 italic font-mono">
                                      <strong>Evidence:</strong> <HighlightedText text={evt.evidence} />
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              {timelineNeedsScroll && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none" aria-hidden="true"></div>
              )}
            </article>
          )}

          <article className="bg-white border border-black relative" aria-labelledby="updates-heading"
               style={{ height: bottomHeight ? `${bottomHeight}px` : 'auto' }}>
            <header className="p-4 pb-2">
              <h3 id="updates-heading" className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                RECENT UPDATES
              </h3>
            </header>
            <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                 style={{ height: bottomHeight ? `${bottomHeight - 70}px` : 'auto' }}
                 role="region"
                 aria-label="Recent updates"
                 tabIndex={0}>
              <div ref={updatesContentRef} className="space-y-3">
                {hasUpdates ? (
                  eventUpdates.map((update) => (
                    <article key={update.update_id} className="pb-3 border-b border-gray-200 last:border-b-0" itemScope itemType="https://schema.org/NewsArticle">
                      <header className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-black flex-1 font-mono" itemProp="headline">
                          <HighlightedText text={update.title} />
                        </h4>
                        <time className="text-[10px] text-white bg-black px-1.5 py-0.5 whitespace-nowrap font-mono" 
                              dateTime={update.update_date}
                              itemProp="datePublished">
                          {new Date(update.update_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </time>
                      </header>
                      <p className="text-[11px] leading-relaxed text-justify text-black font-mono" itemProp="description">
                        <HighlightedText text={update.description} />
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="h-full min-h-[270px] flex flex-col items-center justify-center text-center space-y-8">
                    <div className="space-y-3">
                      <div className="inline-block bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono">
                        INVESTIGATION IN PROGRESS
                      </div>
                      <p className="text-[11px] text-black font-mono leading-relaxed max-w-xs mx-auto">
                        Our investigative team is actively monitoring this case. Updates will be published as new information emerges from verified sources.
                      </p>
                    </div>
                    
                    <hr className="w-16 border-t border-black" aria-hidden="true" />
                    
                    <div className="space-y-3">
                      <p className="text-[11px] text-black font-mono leading-relaxed max-w-xs mx-auto">
                        Support independent investigative journalism
                      </p>
                      <a 
                        href="/donate"
                        className="inline-block bg-black text-white px-5 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors font-mono"
                        aria-label="Donate to support investigative journalism">
                        DONATE
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {updatesNeedsScroll && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none" aria-hidden="true"></div>
            )}
          </article>
        </section>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `}</style>
    </>
  );
}