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
}

async function getEvents(): Promise<Event[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/get/events`, {
      next: { 
        tags: ['events-list']
      },
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'force-cache'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch events:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    const events = data.events || [];
    
    return events.sort((a: Event, b: Event) => {
      const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  
  const title = 'DEADLINE | Every Life Has a Voice';
  
  const description = 'Tracking the stories nobody else remembers. From sewer deaths to forgotten injustices—we document the lives that mattered, then disappeared from headlines.';
  
  const imageUrl = `${baseUrl}/og-default.png`;

  return {
    title,
    description,
    keywords: [
      'sewer deaths',
      'manual scavenging',
      'forgotten victims',
      'invisible workers',
      'human rights documentation',
      'social injustice',
      'marginalized voices',
      'untold stories',
      'sanitation workers deaths',
      'everyday heroes',
      'unreported news',
      'dignity in death'
    ],
    authors: [{ name: 'DEADLINE' }],
    creator: 'DEADLINE',
    publisher: 'DEADLINE',
    applicationName: 'DEADLINE',
    openGraph: {
      type: 'website',
      url: baseUrl,
      title: 'DEADLINE | Every Life Has a Voice',
      description: 'Tracking the stories nobody else remembers. From sewer deaths to forgotten injustices—we document the lives that mattered, then disappeared from headlines.',
      siteName: 'DEADLINE',
      locale: 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'DEADLINE - Every life has a voice',
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'DEADLINE | Every Life Has a Voice',
      description: 'Tracking the stories nobody else remembers. Sewer deaths. Forgotten workers. Lives that mattered.',
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
      canonical: baseUrl,
    },
    metadataBase: new URL(baseUrl),
  };
}

export const dynamic = 'force-static';
export const revalidate = 3600;

export default async function DeadlineEventsPage() {
  const events = await getEvents();
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://deadline.com';
  const imageUrl = `${baseUrl}/og-default.png`;
  const description = 'Tracking the stories nobody else remembers. From sewer deaths to forgotten injustices—we document the lives that mattered, then disappeared from headlines.';
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DEADLINE',
    description: 'Every Life Has a Voice - Museum of Temporary Truths',
    url: baseUrl,
    about: {
      '@type': 'Thing',
      name: 'Human Rights and Social Justice Documentation',
      description: 'Documenting sewer deaths, forgotten workers, and marginalized lives that disappeared from news coverage'
    },
    publisher: {
      '@type': 'Organization',
      name: 'DEADLINE',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
      description: 'DEADLINE documents the forgotten: sewer deaths, marginalized workers, and lives that briefly made headlines, then vanished. Every life has a voice.'
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <meta name="description" content={description} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@deadline" />
      <meta name="twitter:creator" content="@deadline" />
      <meta name="twitter:title" content="DEADLINE | Every Life Has a Voice" />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content="DEADLINE - Every life has a voice" />
      
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="DEADLINE" />
      <meta property="og:title" content="DEADLINE | Every Life Has a Voice" />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="DEADLINE - Every life has a voice" />
      <meta property="og:url" content={baseUrl} />
      <meta property="og:locale" content="en_US" />
      
      <link rel="canonical" href={baseUrl} />
      
      <div className="min-h-screen bg-white">
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-6 py-16 text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              DEADLINE
            </h1>
            <p className="text-lg font-normal text-black tracking-wide font-mono">
              Museum of Temporary Truths
            </p>
          </div>
        </section>
        <EventsClient initialEvents={events} />
        <footer className="border-t border-black bg-white mt-24">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center">
              <h3 className="text-2xl font-black tracking-tight mb-4 text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>DEADLINE</h3>
              <p className="text-sm font-normal text-black tracking-wide font-mono mb-6">
                Museum of Temporary Truths
              </p>
              <div className="flex justify-center gap-8 text-sm font-mono">
                <a href="/about" className="text-black hover:underline" title="About DEADLINE - Our Mission">About</a>
                <a href="/report" className="text-black hover:underline" title="Report about a Story">Report</a>
                <a href="/policies" className="text-black hover:underline" title="Our Policies">Policies</a>
                <a href="/donate" className="text-black hover:underline" title="Support Our Work">Donate</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}