import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET_KEY = process.env.API_SECRET_KEY;

interface EventUpdate {
  update_id: number;
  event_id: string;
  title: string;
  description: string;
  update_date: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const slug = searchParams.get('slug');
    const apiKey = searchParams.get('api_key');

    if (!apiKey || apiKey !== API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    let finalEventId = eventId;

    if (slug && !eventId) {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('event_id')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        console.error('[API /api/get/updates] Error fetching event_id:', eventError);
        return NextResponse.json(
          { success: true, data: [], count: 0 },
          {
            status: 200,
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
          }
        );
      }

      finalEventId = eventData.event_id;
    }

    if (!finalEventId) {
      return NextResponse.json(
        { success: false, error: 'Either event_id or slug parameter is required' },
        { status: 400 }
      );
    }

    const { data, error, count } = await supabase
      .from('event_updates')
      .select('*', { count: 'exact' })
      .eq('event_id', finalEventId)
      .order('update_date', { ascending: false });

    if (error) {
      console.error('[API /api/get/updates] Supabase error:', error);
      return NextResponse.json(
        {
          success: true,
          data: [],
          count: 0
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
          }
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: (data || []) as EventUpdate[],
        count: count || 0
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
        }
      }
    );
  } catch (error) {
    console.error('[API /api/get/updates] Exception:', error);
    return NextResponse.json(
      { 
        success: true,
        data: [],
        count: 0
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
        }
      }
    );
  }
}
