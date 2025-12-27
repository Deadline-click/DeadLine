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
  context: string;
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
    <div className="animate-pulse space-y-4">
      <div className="bg-white p-6 border border-black">
        <div className="h-5 bg-gray-300 w-24 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 w-full"></div>
          <div className="h-3 bg-gray-200 w-full"></div>
          <div className="h-3 bg-gray-200 w-3/4"></div>
        </div>
      </div>
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
            <span key={index} className="bg-black text-white px-1 py-0.5 mx-0.5 font-mono">
              {cleanText}
            </span>
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
        
        if (timelineHeight > 0 && updatesHeight > 0) {
          setBottomHeight(Math.min(timelineHeight, updatesHeight) + 80);
        }
      };

      requestAnimationFrame(() => {
        calculateHeights();
      });

      window.addEventListener('resize', calculateHeights);
      return () => window.removeEventListener('resize', calculateHeights);
    }
  }, [loading]);

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

  return (
    <div className="max-w-7xl mx-auto">
      <article className="mb-4">
        <div className="bg-white p-5 border border-black">
          <h2 className="text-sm font-bold mb-3 uppercase tracking-tight text-black border-b border-black pb-2 font-mono">
            OVERVIEW
          </h2>
          <p className="text-xs leading-loose text-justify mb-4 text-black font-mono">
            <HighlightedText text={details.overview || ''} />
          </p>
          
          {sortedKeyPoints.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2 mt-4 pt-4 border-t border-gray-300">
              {sortedKeyPoints.map((fact, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="bg-black text-white px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0 font-mono">
                    {fact.label}
                  </span>
                  <span className="text-black text-[11px] leading-relaxed flex-1 font-mono">
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {allAccused.length > 0 && (
          <div className="bg-white border border-black relative"
               style={{ height: partiesHeight ? `${partiesHeight}px` : 'auto' }}>
            <div className="p-4 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                ACCUSED PARTIES
              </h3>
            </div>
            <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                 style={{ height: partiesHeight ? `${partiesHeight - 70}px` : 'auto' }}>
              <div ref={accusedContentRef} className="space-y-4">
                {allAccused.map((person, index) => {
                  const sortedDetails = person.details
                    ? [...person.details].sort((a, b) => a.value.length - b.value.length)
                    : [];
                  
                  return (
                    <div key={index} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                      <h4 className="text-sm font-bold mb-2 text-black font-mono">
                        {person.name}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-justify mb-3 text-black font-mono">
                        {person.summary || ''}
                      </p>
                      {sortedDetails.length > 0 && (
                        <div className="space-y-1.5 pl-2 border-l-2 border-black">
                          {sortedDetails.map((fact, factIndex) => (
                            <div key={factIndex} className="flex items-start gap-2">
                              <span className="bg-black text-white px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0 font-mono">
                                {fact.label}
                              </span>
                              <span className="text-black text-[11px] leading-relaxed flex-1 font-mono">
                                {fact.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {accusedNeedsScroll && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none"></div>
            )}
          </div>
        )}

        {allVictims.length > 0 && (
          <div className="bg-white border border-black relative"
               style={{ height: partiesHeight ? `${partiesHeight}px` : 'auto' }}>
            <div className="p-4 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                AFFECTED PARTIES
              </h3>
            </div>
            <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                 style={{ height: partiesHeight ? `${partiesHeight - 70}px` : 'auto' }}>
              <div ref={victimsContentRef} className="space-y-4">
                {allVictims.map((victim, index) => {
                  const sortedDetails = victim.details
                    ? [...victim.details].sort((a, b) => a.value.length - b.value.length)
                    : [];
                  
                  return (
                    <div key={index} className="pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                      <h4 className="text-sm font-bold mb-2 text-black font-mono">
                        {victim.name}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-justify mb-3 text-black font-mono">
                        {victim.summary || ''}
                      </p>
                      {sortedDetails.length > 0 && (
                        <div className="space-y-1.5 pl-2 border-l-2 border-black">
                          {sortedDetails.map((fact, factIndex) => (
                            <div key={factIndex} className="flex items-start gap-2">
                              <span className="bg-black text-white px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0 font-mono">
                                {fact.label}
                              </span>
                              <span className="text-black text-[11px] leading-relaxed flex-1 font-mono">
                                {fact.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {victimsNeedsScroll && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none"></div>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {timeline.length > 0 && (
          <div className="bg-white border border-black relative"
               style={{ height: bottomHeight ? `${bottomHeight}px` : 'auto' }}>
            <div className="p-4 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                TIMELINE
              </h3>
            </div>
            <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                 style={{ height: bottomHeight ? `${bottomHeight - 70}px` : 'auto' }}>
              <div ref={timelineContentRef} className="relative">
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-black"></div>
                <div className="space-y-3">
                  {timeline.map((entry, index) => (
                    <div key={index} className="relative pl-7">
                      <div className="absolute left-1 top-1.5 w-3 h-3 bg-black border-2 border-white"></div>
                      <div>
                        {entry.date && (
                          <div className="mb-2">
                            <span className="inline-block px-1.5 py-0.5 bg-black text-white text-[10px] uppercase tracking-wide font-bold font-mono">
                              {entry.date}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] font-bold leading-relaxed mb-2 text-black font-mono">
                          {entry.context}
                        </p>
                        {entry.events && entry.events.length > 0 && (
                          <div className="space-y-2 pl-2 border-l border-gray-300">
                            {entry.events.map((evt, evtIndex) => (
                              <div key={evtIndex}>
                                {evt.time && (
                                  <span className="inline-block px-1.5 py-0.5 bg-gray-800 text-white text-[10px] mb-1 font-mono">
                                    {evt.time}
                                  </span>
                                )}
                                <p className="text-[11px] leading-relaxed text-black mb-1 font-mono">
                                  {evt.description}
                                </p>
                                {evt.participants && (
                                  <p className="text-[10px] text-gray-600 italic mb-1 font-mono">
                                    <span className="font-bold">Participants:</span> {evt.participants}
                                  </p>
                                )}
                                {evt.evidence && (
                                  <p className="text-[10px] text-gray-600 italic font-mono">
                                    <span className="font-bold">Evidence:</span> {evt.evidence}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {timelineNeedsScroll && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none"></div>
            )}
          </div>
        )}

        {eventUpdates.length > 0 && (
          <div className="bg-white border border-black relative"
               style={{ height: bottomHeight ? `${bottomHeight}px` : 'auto' }}>
            <div className="p-4 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-tight border-b border-black pb-2 mb-3 text-black font-mono">
                RECENT UPDATES
              </h3>
            </div>
            <div className="px-4 pb-4 overflow-y-auto scrollbar-thin"
                 style={{ height: bottomHeight ? `${bottomHeight - 70}px` : 'auto' }}>
              <div ref={updatesContentRef} className="space-y-3">
                {eventUpdates.map((update) => (
                  <article key={update.update_id} className="pb-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-black flex-1 font-mono">
                        {update.title}
                      </h4>
                      <time className="text-[10px] text-white bg-black px-1.5 py-0.5 whitespace-nowrap font-mono">
                        {new Date(update.update_date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </time>
                    </div>
                    <p className="text-[11px] leading-relaxed text-justify text-black font-mono">
                      {update.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
            {updatesNeedsScroll && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/95 to-transparent pointer-events-none"></div>
            )}
          </div>
        )}
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
    </div>
  );
}