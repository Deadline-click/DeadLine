import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
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
  slug: string;
  location: string;
  headline: string;
  incident_date: string | null;
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

async function getEventDetails(slug: string): Promise<EventDetails | null> {
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

    const url = `${baseUrl}/api/get/details?slug=${encodeURIComponent(slug)}&api_key=${apiKey}`;
    
    console.log('[getEventDetails] Fetching:', url);

    const response = await fetch(url, {
      next: { 
        tags: [`event-${slug}`]
      },
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'force-cache'
    });

    console.log('[getEventDetails] Response status:', response.status);

    if (!response.ok) {
      console.error('[getEventDetails] Response not OK:', response.status, response.statusText);
      const text = await response.text();
      console.error('[getEventDetails] Response body:', text);
      return null;
    }

    const result: EventDetailsResponse = await response.json();
    console.log('[getEventDetails] Success:', result.success, 'Has data:', !!result.data);
    
    if (!result.success || !result.data) {
      console.error('[getEventDetails] Invalid response structure:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[getEventDetails] Exception:', error);
    return null;
  }
}

async function getEventUpdates(eventId: string): Promise<EventUpdate[]> {
  try {
    const apiKey = process.env.API_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!apiKey || !baseUrl) {
      return [];
    }

    const response = await fetch(
      `${baseUrl}/api/get/updates?event_id=${encodeURIComponent(eventId)}&api_key=${apiKey}`,
      {
        next: { 
          tags: [`event-${eventId}`]
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
              tags: [`event-${eventId}`, `source-${domain}`]
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
  const baseKeywords = [
    'news archive',
    'documented event',
    'news documentation',
    'archived story',
    'event chronicle',
    eventDetails.location,
    `${eventDetails.location} news`,
    `${eventDetails.location} incident`,
  ];

  const headlineWords = eventDetails.headline
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 4)
    .slice(0, 5);
  
  baseKeywords.push(...headlineWords);

  if (eventDetails.victims?.individuals?.length) {
    baseKeywords.push('documented victims', 'archived case', 'news record');
  }
  if (eventDetails.victims?.groups?.length) {
    baseKeywords.push('community documentation', 'archived news', 'event registry');
  }

  if (eventDetails.accused?.individuals?.length || eventDetails.accused?.organizations?.length) {
    baseKeywords.push('documented case', 'news archive', 'event documentation');
  }

  if (eventDetails.incident_date) {
    const year = new Date(eventDetails.incident_date).getFullYear();
    baseKeywords.push(`${year} incident`, `${year} news archive`);
  }

  return [...new Set(baseKeywords)];
}

function extractEntitiesForSEO(eventDetails: EventDetails): string {
  const entities: string[] = [];
  
  if (eventDetails.victims?.individuals) {
    entities.push(...eventDetails.victims.individuals.map(v => v.name));
  }
  
  if (eventDetails.accused?.individuals) {
    entities.push(...eventDetails.accused.individuals.map(a => a.name));
  }
  
  if (eventDetails.accused?.organizations) {
    entities.push(...eventDetails.accused.organizations.map(o => o.name));
  }
  
  return entities.filter(e => e && e.length > 0).join(', ');
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  console.log('[generateMetadata] slug:', slug);
  
  const eventDetails = await getEventDetails(slug);
  
  if (!eventDetails) {
    console.log('[generateMetadata] No event details found for slug:', slug);
    return {
      title: 'Event Not Found | DEADLINE - Museum of Temporary Truths',
      description: 'The requested event documentation could not be found on DEADLINE - Museum of Temporary Truths.',
      robots: {
        index: false,
        follow: true,
      }
    };
  }

  const title = eventDetails.headline;
  const description = truncateText(eventDetails.details?.overview || '', 155);
  const imageUrl = eventDetails.images && eventDetails.images.length > 0 
    ? eventDetails.images[0] 
    : `${process.env.NEXT_PUBLIC_BASE_URL}/og-default.png`;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  const url = `${baseUrl}/event/${slug}`;

  const keywords = generateDynamicKeywords(eventDetails);
  const entities = extractEntitiesForSEO(eventDetails);

  const incidentYear = eventDetails.incident_date 
    ? new Date(eventDetails.incident_date).getFullYear() 
    : new Date(eventDetails.created_at).getFullYear();

  return {
    title: `${title} - ${eventDetails.location} ${incidentYear} | DEADLINE Museum of Temporary Truths`,
    description: `${description} Documented by DEADLINE - Museum of Temporary Truths. Location: ${eventDetails.location}. A forgotten story that deserves remembrance.`,
    keywords: keywords,
    authors: [{ name: 'DEADLINE Documentation Team', url: baseUrl }],
    creator: 'DEADLINE',
    publisher: 'DEADLINE - Museum of Temporary Truths',
    applicationName: 'DEADLINE',
    category: 'News Documentation',
    classification: 'Human Rights & Social Justice',
    openGraph: {
      type: 'article',
      url,
      title: `${title} | DEADLINE - Museum of Temporary Truths`,
      description: `${description} Documented on DEADLINE - tracking stories the world abandoned. ${eventDetails.location}, ${incidentYear}.`,
      siteName: 'DEADLINE - Museum of Temporary Truths',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${eventDetails.headline} - DEADLINE documentation from ${eventDetails.location}`,
          type: 'image/png',
        },
      ],
      publishedTime: eventDetails.created_at,
      modifiedTime: eventDetails.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | DEADLINE`,
      description: `${description} Museum of Temporary Truths - ${eventDetails.location}, ${incidentYear}.`,
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
      'og:image:type': 'image/png',
      'article:published_time': eventDetails.created_at,
      'article:modified_time': eventDetails.updated_at,
      'article:author': 'DEADLINE Documentation Team',
      'article:section': 'Forgotten News',
      'article:tag': keywords.slice(0, 10).join(', '),
      'twitter:label1': 'Location',
      'twitter:data1': eventDetails.location,
      'twitter:label2': 'Year',
      'twitter:data2': incidentYear.toString(),
      'geo.region': eventDetails.location,
      'geo.placename': eventDetails.location,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  
  console.log('[EventPage] Rendering slug:', slug);
  
  if (!slug) {
    console.log('[EventPage] No slug provided');
    notFound();
  }

  const eventDetails = await getEventDetails(slug);

  if (!eventDetails) {
    console.log('[EventPage] Event details not found, calling notFound()');
    notFound();
  }

  console.log('[EventPage] Event found:', eventDetails.event_id, eventDetails.headline);

  const [eventUpdates, sourcesWithTitles] = await Promise.all([
    getEventUpdates(eventDetails.event_id),
    getSourceTitles(eventDetails.sources || [], eventDetails.event_id)
  ]);

  const safeEventDetails: EventDetails = {
    ...eventDetails,
    slug: eventDetails.slug,
    incident_date: eventDetails.incident_date || null,
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  const imageUrl = safeEventDetails.images.length > 0 
    ? safeEventDetails.images[0] 
    : `${baseUrl}/og-default.png`;

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || '';
  const upiName = process.env.NEXT_PUBLIC_UPI_NAME || '';
  const upiNote = process.env.NEXT_PUBLIC_UPI_NOTE || '';

  const entities = extractEntitiesForSEO(safeEventDetails);

  const newsArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: safeEventDetails.headline,
    description: truncateText(safeEventDetails.details?.overview || '', 155),
    image: {
      '@type': 'ImageObject',
      url: imageUrl,
      width: 1200,
      height: 630
    },
    datePublished: safeEventDetails.created_at,
    dateModified: safeEventDetails.updated_at,
    author: {
      '@type': 'Organization',
      name: 'DEADLINE',
      url: baseUrl,
      description: 'Museum of Temporary Truths - Documenting stories the world forgot'
    },
    publisher: {
      '@type': 'Organization',
      name: 'DEADLINE',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
        width: 600,
        height: 60
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/event/${slug}`,
    },
    about: {
      '@type': 'Event',
      name: safeEventDetails.headline,
      description: safeEventDetails.details?.overview || '',
      location: {
        '@type': 'Place',
        name: safeEventDetails.location
      },
      startDate: safeEventDetails.incident_date || safeEventDetails.created_at
    },
    keywords: generateDynamicKeywords(safeEventDetails).join(', '),
    articleBody: safeEventDetails.details?.overview || '',
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    isPartOf: {
      '@type': 'WebSite',
      name: 'DEADLINE - Museum of Temporary Truths',
      url: baseUrl
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Events',
        item: `${baseUrl}/#events`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: safeEventDetails.headline,
        item: `${baseUrl}/event/${slug}`
      }
    ]
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DEADLINE',
    alternateName: 'Museum of Temporary Truths',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'Documenting forgotten stories, sewer deaths, and abandoned justice cases',
    sameAs: [
      'https://twitter.com/dxedline',
      'https://facebook.com/deadline.click'
    ]
  };

  const seoTextContent = `
    ${safeEventDetails.headline}. 
    Incident Location: ${safeEventDetails.location}. 
    Incident Date: ${safeEventDetails.incident_date ? new Date(safeEventDetails.incident_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not specified'}.
    ${safeEventDetails.details?.overview || ''}
    ${safeEventDetails.details?.keyPoints?.map(kp => `${kp.label}: ${kp.value}`).join('. ') || ''}
    ${safeEventDetails.victims?.individuals?.length ? `Victims documented: ${safeEventDetails.victims.individuals.map(v => `${v.name} - ${v.summary}`).join('; ')}` : ''}
    ${safeEventDetails.victims?.groups?.length ? `Affected communities: ${safeEventDetails.victims.groups.map(g => `${g.name} - ${g.summary}`).join('; ')}` : ''}
    ${safeEventDetails.accused?.individuals?.length ? `Individuals accused: ${safeEventDetails.accused.individuals.map(a => `${a.name} - ${a.summary}`).join('; ')}` : ''}
    ${safeEventDetails.accused?.organizations?.length ? `Organizations involved: ${safeEventDetails.accused.organizations.map(o => `${o.name} - ${o.summary}`).join('; ')}` : ''}
    ${safeEventDetails.timeline?.length ? `Timeline of events: ${safeEventDetails.timeline.map(t => `${t.date}: ${t.context}`).join('. ')}` : ''}
    ${entities ? `Key entities: ${entities}.` : ''}
    This incident is documented by DEADLINE - Museum of Temporary Truths, a platform dedicated to preserving stories that received brief public attention before being abandoned and forgotten by mainstream media and society. These are the temporary truths that once mattered, then disappeared from collective memory. Every life has a voice. Every story deserves to be remembered.
    Documentation tags: ${generateDynamicKeywords(safeEventDetails).join(', ')}.
    Published: ${new Date(safeEventDetails.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
    Last Updated: ${new Date(safeEventDetails.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
    Sources verified: ${sourcesWithTitles.length} reference sources.
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      
      <div className="sr-only" aria-hidden="true">
        <h1>{safeEventDetails.headline} - {safeEventDetails.location}</h1>
        <div>{seoTextContent}</div>
        <p>Category: Forgotten News, Abandoned Justice, Social Documentation</p>
        <p>Type: Human Rights Documentation, News Archive</p>
        <p>Platform: DEADLINE - Museum of Temporary Truths</p>
        <p>Mission: Every life has a voice. Every story deserves to be remembered.</p>
      </div>

      <div className="min-h-screen bg-gray-50 scroll-smooth" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} itemScope itemType="https://schema.org/NewsArticle">
        <header className="border-b border-black bg-white sticky top-0 z-50">
          <div className="max-w-full mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/" 
                  className="text-black hover:opacity-70 transition-opacity flex items-center"
                  title="Back to DEADLINE homepage - Museum of Temporary Truths"
                  aria-label="Back to DEADLINE homepage"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </Link>
                <Link
                  href="/"
                  className="text-xl font-black tracking-tight uppercase text-black hover:opacity-80 transition-opacity" 
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  title="DEADLINE - Museum of Temporary Truths"
                  aria-label="DEADLINE - Museum of Temporary Truths Homepage"
                >
                  DEADLINE
                </Link>
              </div>
              <nav className="flex space-x-4" aria-label="Article navigation">
                <a href="#overview" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono" title="Jump to event overview section">Overview</a>
                <a href="#sources" className="text-xs font-normal text-black hover:underline transition-all duration-300 font-mono" title="Jump to verified sources section">Sources</a>
              </nav>
            </div>
          </div>
        </header>

        <article itemProp="articleBody">
          <section className="bg-black text-white py-8 border-b-2 border-black">
            <div className="max-w-full mx-auto px-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <time 
                    className="px-3 py-1 bg-white text-black text-xs uppercase tracking-wider border border-black font-mono"
                    dateTime={safeEventDetails.incident_date || safeEventDetails.created_at}
                    itemProp="datePublished"
                  >
                    {safeEventDetails.incident_date 
                      ? new Date(safeEventDetails.incident_date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : new Date(safeEventDetails.created_at || Date.now()).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                    }
                  </time>
                  <ShareDonateButtons 
                    eventId={slug}
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
                  itemProp="headline"
                >
                  {safeEventDetails.headline}
                </h1>
                <p className="text-base text-white text-justify font-mono">
                  <span itemProp="contentLocation" itemScope itemType="https://schema.org/Place">
                    <span itemProp="name">{safeEventDetails.location}</span>
                  </span>
                </p>
                <meta itemProp="dateModified" content={safeEventDetails.updated_at} />
                <meta itemProp="author" content="DEADLINE Documentation Team" />
                <meta itemProp="publisher" content="DEADLINE - Museum of Temporary Truths" />
              </div>
            </div>
          </section>

          <main className="max-w-full mx-auto px-6 py-8">
            <div className="max-w-none">
              <div itemProp="image" itemScope itemType="https://schema.org/ImageObject">
                <ImageSlider images={safeEventDetails.images} />
                <meta itemProp="url" content={imageUrl} />
                <meta itemProp="width" content="1200" />
                <meta itemProp="height" content="630" />
              </div>
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
              <p className="text-white text-sm font-mono mb-2">
                Museum of Temporary Truths
              </p>
            </div>
            <nav className="flex justify-center space-x-6 mb-4" aria-label="Footer navigation">
              <a href="/about" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="About DEADLINE - Our Mission and Purpose">About</a>
              <a href="/report" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="Report a Forgotten Story to DEADLINE">Report</a>
              <a href="/policies" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="DEADLINE Documentation Policies and Ethics">Policies</a>
              <a href="/donate" className="text-xs font-normal text-white hover:underline transition-all duration-300 font-mono" title="Support DEADLINE's Documentation Work">Donate</a>
            </nav>
            <p className="text-center text-xs text-white opacity-70 font-mono">
              © {new Date().getFullYear()} DEADLINE. Every life has a voice.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}