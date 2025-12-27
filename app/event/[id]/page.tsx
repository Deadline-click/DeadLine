import { notFound } from 'next/navigation';
import ImageSlider from '../components/ImageSlider';
import EventDetailsComponent from '../components/EventDetails';
import SourcesComponent from '../components/Sources';

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

interface EventDetailsResponse {
  success: boolean;
  data: EventDetails;
}

interface EventUpdatesResponse {
  success: boolean;
  data: EventUpdate[];
  count: number;
}

async function getEventDetails(id: string): Promise<EventDetails | null> {
  try {
    const apiKey = process.env.API_SECRET_KEY;
    
    if (!apiKey) {
      console.error('[getEventDetails] API_SECRET_KEY not found');
      return null;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      console.error('[getEventDetails] NEXT_PUBLIC_BASE_URL not found');
      return null;
    }

    const url = `${baseUrl}/api/get/details?event_id=${id}&api_key=${apiKey}`;

    const response = await fetch(url, {
      next: { 
        revalidate: false,
        tags: [`event-${id}`, `event-details-${id}`]
      },
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'force-cache'
    });

    if (!response.ok) {
      return null;
    }

    const result: EventDetailsResponse = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[getEventDetails] Exception:', error);
    return null;
  }
}

async function getEventUpdates(id: string): Promise<EventUpdate[]> {
  try {
    const apiKey = process.env.API_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!apiKey || !baseUrl) {
      return [];
    }

    const response = await fetch(
      `${baseUrl}/api/get/updates?event_id=${id}&api_key=${apiKey}`,
      {
        next: { 
          revalidate: false,
          tags: [`event-${id}`, `event-updates-${id}`]
        },
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'force-cache'
      }
    );

    if (!response.ok) {
      return [];
    }

    const result: EventUpdatesResponse = await response.json();
    return result.success && result.data ? result.data : [];
  } catch (error) {
    console.error('[getEventUpdates] Exception:', error);
    return [];
  }
}

export const dynamic = 'force-static';
export const revalidate = false;

export default async function EventPage({ 
  params 
}: { 
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  const [eventDetails, eventUpdates] = await Promise.all([
    getEventDetails(id),
    getEventUpdates(id)
  ]);

  if (!eventDetails) {
    notFound();
  }

  const safeEventDetails: EventDetails = {
    ...eventDetails,
    images: Array.isArray(eventDetails.images) ? eventDetails.images : [],
    sources: Array.isArray(eventDetails.sources) ? eventDetails.sources : [],
    location: eventDetails.location || 'Unknown Location',
    headline: eventDetails.headline || 'Event Details',
    details: eventDetails.details || { overview: 'No details available', keyPoints: [] },
    accused: {
      individuals: Array.isArray(eventDetails.accused?.individuals) ? eventDetails.accused.individuals : [],
      organizations: Array.isArray(eventDetails.accused?.organizations) ? eventDetails.accused.organizations : [],
    },
    victims: {
      individuals: Array.isArray(eventDetails.victims?.individuals) ? eventDetails.victims.individuals : [],
      groups: Array.isArray(eventDetails.victims?.groups) ? eventDetails.victims.groups : [],
    },
    timeline: Array.isArray(eventDetails.timeline) ? eventDetails.timeline : [],
    event_id: eventDetails.event_id,
    created_at: eventDetails.created_at,
    updated_at: eventDetails.updated_at,
  };

  const safeEventUpdates = Array.isArray(eventUpdates) ? eventUpdates : [];

  return (
    <div className="min-h-screen bg-gray-50 scroll-smooth" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header className="border-b border-black bg-white sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="text-xl font-black tracking-tight uppercase text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              DEADLINE
            </a>
            <nav className="flex space-x-4">
              <a href="#overview" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono">Overview</a>
              <a href="#sources" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono">Sources</a>
            </nav>
          </div>
        </div>
      </header>

      <section className="bg-black text-white py-8 border-b-2 border-black">
        <div className="max-w-full mx-auto px-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-white text-black text-xs uppercase tracking-wider border border-black font-mono">
                {new Date(safeEventDetails.created_at || Date.now()).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <h1 
              className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white text-justify" 
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {safeEventDetails.headline}
            </h1>
            <p className="text-base text-white text-justify font-mono">
              {safeEventDetails.location}
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-full mx-auto px-6 py-8">
        <div className="max-w-none">
          <ImageSlider images={safeEventDetails.images} />
          <div id="overview">
            <EventDetailsComponent 
              eventDetails={safeEventDetails} 
              eventUpdates={safeEventUpdates} 
            />
          </div>
          <div id="sources">
            <SourcesComponent sources={safeEventDetails.sources} />
          </div>
        </div>
      </main>

      <footer className="bg-black text-white py-6 border-t-2 border-black">
        <div className="max-w-full mx-auto px-6 text-center">
          <h2 className="text-lg font-black tracking-tight uppercase mb-2 text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            DEADLINE
          </h2>
          <p className="text-white text-sm font-mono">
            A Museum of temporary truths.
          </p>
        </div>
      </footer>
    </div>
  );
}