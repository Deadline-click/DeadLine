import { notFound } from 'next/navigation';
import { Metadata } from 'next';
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

interface SourceWithTitle {
  url: string;
  title: string;
  domain: string;
  favicon: string;
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
        tags: [`event-${id}`, `event-details-${id}`],
        revalidate: false
      },
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'force-cache'
    });

    if (!response.ok) {
      console.error('[getEventDetails] Response not OK:', response.status);
      return null;
    }

    const result: EventDetailsResponse = await response.json();
    
    if (!result.success || !result.data) {
      console.error('[getEventDetails] Invalid response structure');
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
          tags: [`event-${id}`, `event-updates-${id}`],
          revalidate: false
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

async function getSourceTitles(sources: string[], eventId: string): Promise<SourceWithTitle[]> {
  const validSources = sources.filter(source => {
    if (!source || typeof source !== 'string' || source.trim() === '') return false;
    try {
      const testUrl = new URL(source.trim());
      return testUrl.protocol === 'http:' || testUrl.protocol === 'https:';
    } catch {
      return false;
    }
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) return [];

  const sourcesWithTitles = await Promise.all(
    validSources.map(async (url) => {
      try {
        const trimmedUrl = url.trim();
        const urlObj = new URL(trimmedUrl);
        const domain = urlObj.hostname.replace('www.', '');
        
        const response = await fetch(
          `${baseUrl}/api/get/title?url=${encodeURIComponent(trimmedUrl)}`,
          {
            next: {
              tags: [`event-${eventId}`, `source-${domain}`],
              revalidate: false
            },
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'force-cache'
          }
        );

        let title = 'Article';
        if (response.ok) {
          const data = await response.json();
          title = data.title || 'Article';
        }

        return {
          url: trimmedUrl,
          title,
          domain,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
        };
      } catch (error) {
        console.error('Error processing source:', url, error);
        return null;
      }
    })
  );

  return sourcesWithTitles.filter((s): s is SourceWithTitle => s !== null);
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

function truncateText(text: string, maxLength: number): string {
  const stripped = stripMarkdown(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength).trim() + '...';
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  
  const eventDetails = await getEventDetails(id);
  
  if (!eventDetails) {
    return {
      title: 'Event Not Found - DEADLINE',
      description: 'The requested event could not be found.',
    };
  }

  const title = eventDetails.headline;
  const description = truncateText(eventDetails.details?.overview || '', 200);
  const imageUrl = eventDetails.images && eventDetails.images.length > 0 
    ? eventDetails.images[0] 
    : `${process.env.NEXT_PUBLIC_BASE_URL}/og-default.png`;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  const url = `${baseUrl}/event/${id}`;

  return {
    title: `${title} | DEADLINE`,
    description,
    keywords: ['news', 'investigation', 'deadline', eventDetails.location, 'events'],
    authors: [{ name: 'DEADLINE' }],
    creator: 'DEADLINE',
    publisher: 'DEADLINE',
    applicationName: 'DEADLINE',
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'DEADLINE',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: eventDetails.headline,
          type: 'image/jpeg',
        },
      ],
      publishedTime: eventDetails.created_at,
      modifiedTime: eventDetails.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@deadline',
      site: '@deadline',
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: url,
    },
    metadataBase: new URL(baseUrl),
  };
}

export const dynamic = 'force-static';
export const revalidate = false;
export const fetchCache = 'force-cache';

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

  const sourcesWithTitles = await getSourceTitles(safeEventDetails.sources, id);
  const safeEventUpdates = Array.isArray(eventUpdates) ? eventUpdates : [];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  const imageUrl = safeEventDetails.images.length > 0 
    ? safeEventDetails.images[0] 
    : `${baseUrl}/og-default.png`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: safeEventDetails.headline,
    description: truncateText(safeEventDetails.details?.overview || '', 200),
    image: imageUrl,
    datePublished: safeEventDetails.created_at,
    dateModified: safeEventDetails.updated_at,
    author: {
      '@type': 'Organization',
      name: 'DEADLINE',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'DEADLINE',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/event/${id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@deadline" />
      <meta name="twitter:creator" content="@deadline" />
      <meta name="twitter:title" content={safeEventDetails.headline} />
      <meta name="twitter:description" content={truncateText(safeEventDetails.details?.overview || '', 200)} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={safeEventDetails.headline} />
      
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="DEADLINE" />
      <meta property="og:title" content={safeEventDetails.headline} />
      <meta property="og:description" content={truncateText(safeEventDetails.details?.overview || '', 200)} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={safeEventDetails.headline} />
      <meta property="og:url" content={`${baseUrl}/event/${id}`} />
      <meta property="article:published_time" content={safeEventDetails.created_at} />
      <meta property="article:modified_time" content={safeEventDetails.updated_at} />
      
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="DEADLINE" />
      
      <meta name="description" content={truncateText(safeEventDetails.details?.overview || '', 200)} />
      
      <link rel="canonical" href={`${baseUrl}/event/${id}`} />
      
      <div className="min-h-screen bg-gray-50 scroll-smooth" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <header className="border-b border-black bg-white sticky top-0 z-50">
          <div className="max-w-full mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-black tracking-tight uppercase text-black hover:opacity-80 transition-opacity" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
              <SourcesComponent sources={sourcesWithTitles} />
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
    </>
  );
}
