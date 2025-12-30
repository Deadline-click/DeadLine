import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ImageSlider from '../components/ImageSlider';
import EventDetailsComponent from '../components/EventDetails';
import SourcesComponent from '../components/Sources';
import ShareDonateButtons from '../components/ShareDonateButtons';

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

function generateDynamicKeywords(eventDetails: EventDetails): string[] {
  const keywords = [
    'forgotten news',
    'abandoned case',
    'justice delayed',
    'collective amnesia',
    eventDetails.location,
  ];

  // Add victim-related keywords
  if (eventDetails.victims?.individuals?.length) {
    keywords.push('victim advocacy', 'justice for victims');
  }
  if (eventDetails.victims?.groups?.length) {
    keywords.push('marginalized communities', 'systemic injustice');
  }

  // Add accused-related keywords
  if (eventDetails.accused?.individuals?.length || eventDetails.accused?.organizations?.length) {
    keywords.push('accountability', 'alleged perpetrators');
  }

  return keywords;
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
  const description = truncateText(eventDetails.details?.overview || '', 155);
  const imageUrl = eventDetails.images && eventDetails.images.length > 0 
    ? eventDetails.images[0] 
    : `${process.env.NEXT_PUBLIC_BASE_URL}/og-default.png`;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  const url = `${baseUrl}/event/${id}`;

  const keywords = generateDynamicKeywords(eventDetails);

  return {
    title: `${title} | DEADLINE - They Cared. Then They Forgot.`,
    description: `${description} Documented on DEADLINE - tracking stories the world abandoned.`,
    keywords,
    authors: [{ name: 'DEADLINE' }],
    creator: 'DEADLINE',
    publisher: 'DEADLINE',
    applicationName: 'DEADLINE',
    openGraph: {
      type: 'article',
      url,
      title: `${title} | DEADLINE`,
      description: `${description} A story the world forgot.`,
      siteName: 'DEADLINE - They Cared. Then They Forgot.',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${eventDetails.headline} - DEADLINE documentation`,
          type: 'image/jpeg',
        },
      ],
      publishedTime: eventDetails.created_at,
      modifiedTime: eventDetails.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | DEADLINE`,
      description: `${description} They cared. Then they forgot.`,
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
    other: {
      'og:image:secure_url': imageUrl,
      'og:image:type': 'image/jpeg',
      'article:published_time': eventDetails.created_at,
      'article:modified_time': eventDetails.updated_at,
      'article:tag': keywords.join(', '),
      'twitter:label1': 'Location',
      'twitter:data1': eventDetails.location,
      'twitter:label2': 'Status',
      'twitter:data2': 'Forgotten by mainstream media',
    },
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

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || '';
  const upiName = process.env.NEXT_PUBLIC_UPI_NAME || '';
  const upiNote = process.env.NEXT_PUBLIC_UPI_NOTE || '';

  // Enhanced structured data for better AI/search engine understanding
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: safeEventDetails.headline,
    description: truncateText(safeEventDetails.details?.overview || '', 155),
    image: imageUrl,
    datePublished: safeEventDetails.created_at,
    dateModified: safeEventDetails.updated_at,
    author: {
      '@type': 'Organization',
      name: 'DEADLINE',
      url: baseUrl,
      description: 'Documenting stories the world forgot - tracking abandoned justice cases and forgotten outrage'
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
    about: {
      '@type': 'Thing',
      name: safeEventDetails.headline,
      description: 'A documented case of forgotten justice and abandoned public interest'
    },
    keywords: generateDynamicKeywords(safeEventDetails).join(', '),
    articleBody: safeEventDetails.details?.overview || '',
    locationCreated: {
      '@type': 'Place',
      name: safeEventDetails.location
    }
  };

  // Generate SEO-friendly text content for AI crawlers
  const seoTextContent = `
    ${safeEventDetails.headline}. 
    Location: ${safeEventDetails.location}. 
    ${safeEventDetails.details?.overview || ''}
    ${safeEventDetails.details?.keyPoints?.map(kp => `${kp.label}: ${kp.value}`).join('. ') || ''}
    ${safeEventDetails.victims?.individuals?.map(v => `Victim: ${v.name}. ${v.summary}`).join('. ') || ''}
    ${safeEventDetails.victims?.groups?.map(g => `Affected group: ${g.name}. ${g.summary}`).join('. ') || ''}
    ${safeEventDetails.accused?.individuals?.map(a => `Accused: ${a.name}. ${a.summary}`).join('. ') || ''}
    ${safeEventDetails.accused?.organizations?.map(o => `Organization: ${o.name}. ${o.summary}`).join('. ') || ''}
    ${safeEventDetails.timeline?.map(t => `${t.date}: ${t.context}`).join('. ') || ''}
    This is a story documented by DEADLINE - a platform tracking cases that received public attention, then were abandoned and forgotten by mainstream media and society.
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* Hidden SEO content for AI search engines */}
      <div className="sr-only" aria-hidden="true">
        <h1>{safeEventDetails.headline}</h1>
        <p>{seoTextContent}</p>
        <p>Keywords: {generateDynamicKeywords(safeEventDetails).join(', ')}</p>
        <p>Published: {new Date(safeEventDetails.created_at).toLocaleDateString()}</p>
        <p>Last Updated: {new Date(safeEventDetails.updated_at).toLocaleDateString()}</p>
        <p>Location: {safeEventDetails.location}</p>
        <p>DEADLINE - Museum of Temporary Truths - They Cared. Then They Forgot.</p>
      </div>

      <div className="min-h-screen bg-gray-50 scroll-smooth" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <header className="border-b border-black bg-white sticky top-0 z-50">
          <div className="max-w-full mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <a 
                href="/" 
                className="text-xl font-black tracking-tight uppercase text-black hover:opacity-80 transition-opacity" 
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                title="DEADLINE - Home"
                aria-label="DEADLINE Homepage"
              >
                DEADLINE
              </a>
              <nav className="flex space-x-4" aria-label="Article navigation">
                <a href="#overview" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono" title="View event overview">Overview</a>
                <a href="#sources" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono" title="View sources and references">Sources</a>
              </nav>
            </div>
          </div>
        </header>

        <article>
          <section className="bg-black text-white py-8 border-b-2 border-black">
            <div className="max-w-full mx-auto px-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <time 
                    className="px-3 py-1 bg-white text-black text-xs uppercase tracking-wider border border-black font-mono"
                    dateTime={safeEventDetails.created_at}
                  >
                    {new Date(safeEventDetails.created_at || Date.now()).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </time>
                  <ShareDonateButtons 
                    eventId={id}
                    headline={safeEventDetails.headline}
                    upiId={upiId}
                    upiName={upiName}
                    upiNote={upiNote}
                    baseUrl={baseUrl}
                  />
                </div>
                <h1 
                  className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white text-justify" 
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {safeEventDetails.headline}
                </h1>
                <p className="text-base text-white text-justify font-mono">
                  <span itemProp="locationCreated">{safeEventDetails.location}</span>
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
        </article>

        <footer className="bg-black text-white py-6 border-t-2 border-black">
          <div className="max-w-full mx-auto px-6">
            <div className="text-center mb-4">
              <h2 className="text-lg font-black tracking-tight uppercase mb-2 text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                DEADLINE
              </h2>
              <p className="text-white text-sm font-mono">
                Museum of Temporary Truths
              </p>
            </div>
            <nav className="flex justify-center space-x-6" aria-label="Footer navigation">
              <a href="/about" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="About DEADLINE - Our Mission">About</a>
              <a href="/report" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="Report a Forgotten Story">Report</a>
              <a href="/policies" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="Our Documentation Policies">Policies</a>
              <a href="/donate" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="Support DEADLINE's Work">Donate</a>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}