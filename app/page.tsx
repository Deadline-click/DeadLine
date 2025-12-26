import { EventsClient } from './events-client';
import { createClient } from '@supabase/supabase-js';

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('incident_date', { ascending: false, nullsFirst: false })
      .order('last_updated', { ascending: false });
    
    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }
    
    return (data as Event[]) || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

export const revalidate = 3600;
export const dynamic = 'force-static';

export default async function DeadlineEventsPage() {
  const events = await getEvents();
  
  return (
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
            <p className="text-sm font-normal text-black tracking-wide font-mono">
              Museum of Temporary Truths
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
