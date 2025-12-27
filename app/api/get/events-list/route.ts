import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('incident_date', { ascending: false, nullsFirst: false })
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { events: events || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=31536000',
        },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const revalidate = false;