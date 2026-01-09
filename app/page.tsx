import { Metadata } from 'next';
import { EventsClient } from './events-client';

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
  slug: string;
}

interface CacheBatch {
  events: Event[];
  batchNumber: number;
  totalBatches: number;
}

const BATCH_SIZE = 30;

async function getAllEventsSorted(): Promise<Event[]> {
  try {
    const allEvents: Event[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/get/events?limit=${limit}&offset=${offset}`,
        {
          cache: 'no-store'
        }
      );
      
      if (!response.ok) {
        console.error('Failed to fetch events:', response.statusText);
        break;
      }
      
      const data = await response.json();
      const fetchedEvents = data.events || [];
      
      if (fetchedEvents.length === 0) {
        hasMore = false;
      } else {
        allEvents.push(...fetchedEvents);
        offset += limit;
        
        if (fetchedEvents.length < limit) {
          hasMore = false;
        }
      }
    }

    return allEvents.sort((a, b) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching all events:', error);
    return [];
  }
}

function createBatches(events: Event[]): CacheBatch[] {
  const batches: CacheBatch[] = [];
  const totalBatches = Math.ceil(events.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    batches.push({
      events: events.slice(start, end),
      batchNumber: i + 1,
      totalBatches
    });
  }

  return batches;
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  
  const title = 'DEADLINE - Museum of Temporary Truths | Documenting Forgotten Lives & Untold Stories';
  const description = 'Museum of Temporary Truths: DEADLINE documents sewer deaths, manual scavenging victims, and forgotten workers whose stories vanished from headlines. Every life has a voice. Explore unreported injustices and marginalized voices that deserve to be remembered.';
  const imageUrl = `${baseUrl}/og-default.png`;
  const faviconUrl = `${baseUrl}/favicon.ico`;

  return {
    title: {
      default: title,
      template: '%s | DEADLINE - Museum of Temporary Truths'
    },
    description,
    keywords: [
      'news archive',
      'news documentation',
      'archived news stories',
      'news repository',
      'historical news',
      'news database',
      'documented events',
      'news collection',
      'event archive',
      'news timeline',
      'documented stories',
      'news chronicles',
      'archival journalism',
      'news records',
      'event documentation',
      'news preservation',
      'story archive',
      'news registry',
      'documented incidents',
      'news inventory',
      'archived events',
      'news catalog',
      'event registry',
      'news storage',
      'documented reports',
      'news compilation',
      'event records',
      'news aggregation',
      'documented news',
      'news updates archive'
    ],
    authors: [{ name: 'DEADLINE', url: baseUrl }],
    creator: 'DEADLINE',
    publisher: 'DEADLINE',
    applicationName: 'DEADLINE',
    category: 'News & Documentation',
    classification: 'Human Rights & Social Justice',
    icons: {
      icon: [
        { url: faviconUrl, sizes: 'any' },
        { url: `${baseUrl}/favicon-16x16.png`, sizes: '16x16', type: 'image/png' },
        { url: `${baseUrl}/favicon-32x32.png`, sizes: '32x32', type: 'image/png' }
      ],
      apple: [
        { url: `${baseUrl}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }
      ],
      other: [
        { rel: 'mask-icon', url: `${baseUrl}/safari-pinned-tab.svg`, color: '#000000' }
      ]
    },
    manifest: `${baseUrl}/site.webmanifest`,
    openGraph: {
      type: 'website',
      url: baseUrl,
      title: 'DEADLINE - Museum of Temporary Truths',
      description: 'Documenting forgotten lives, sewer deaths, and untold stories that vanished from headlines. Every life has a voice.',
      siteName: 'DEADLINE - Museum of Temporary Truths',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'DEADLINE - Museum of Temporary Truths: Documenting forgotten lives and untold stories',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'DEADLINE - Museum of Temporary Truths',
      description: 'Documenting sewer deaths, forgotten workers, and lives that briefly made headlines then vanished. Every life has a voice.',
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
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    },
    alternates: {
      canonical: baseUrl,
      languages: {
        'en-US': baseUrl,
        'en': baseUrl,
      }
    },
    metadataBase: new URL(baseUrl),
    other: {
      'msapplication-TileColor': '#000000',
      'theme-color': '#ffffff',
      ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION && {
        'yandex-verification': process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
      }),
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION && {
        'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION,
      }),
    }
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DeadlineEventsPage() {
  const allEventsSorted = await getAllEventsSorted();
  
  const batches = createBatches(allEventsSorted);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DEADLINE - Museum of Temporary Truths',
    description: 'Museum of Temporary Truths documenting sewer deaths, manual scavenging victims, forgotten workers, and marginalized lives that disappeared from news coverage. Every life has a voice.',
    url: baseUrl,
    about: {
      '@type': 'Thing',
      name: 'Human Rights and Social Justice Documentation',
      description: 'Documenting sewer deaths, manual scavenging, forgotten workers, and marginalized lives that disappeared from news coverage'
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
      description: 'Museum of Temporary Truths: DEADLINE documents the forgotten—sewer deaths, marginalized workers, and lives that briefly made headlines then vanished. Every life has a voice.',
      sameAs: [
        'https://twitter.com/deadline',
        'https://facebook.com/deadline'
      ]
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    mainEntity: {
      '@type': 'CollectionPage',
      name: 'Documented Events',
      description: 'Archive of forgotten lives and untold stories'
    }
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      }
    ]
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      
      <div className="min-h-screen bg-white">
        <header className="bg-white">
          <div className="max-w-7xl mx-auto px-6 py-16 text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              DEADLINE
            </h1>
            <p className="text-lg font-normal text-black tracking-wide font-mono mb-2">
              Museum of Temporary Truths
            </p>
          </div>
        </header>
        
        <main>
          <EventsClient batches={batches} allEvents={allEventsSorted} />
        </main>
        
        <footer className="border-t border-black bg-white mt-24">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight mb-4 text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>DEADLINE</h2>
              <p className="text-sm font-normal text-black tracking-wide font-mono mb-6">
                Museum of Temporary Truths
              </p>
              <nav className="flex justify-center gap-8 text-sm font-mono mb-8" aria-label="Footer navigation">
                <a href="/about" className="text-black hover:underline" title="About DEADLINE - Our Mission">About</a>
                <a href="/report" className="text-black hover:underline" title="Report a Story">Report</a>
                <a href="/policies" className="text-black hover:underline" title="Our Policies">Policies</a>
                <a href="/donate" className="text-black hover:underline" title="Support Our Work">Donate</a>
              </nav>
              <p className="text-xs text-gray-600 font-mono">
                © {new Date().getFullYear()} DEADLINE. Documenting lives that matter.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
