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

    // Validate API key
    if (!apiKey || apiKey !== API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // If slug is provided, first get the event_id
    let finalEventId = eventId;
    
    if (slug && !eventId) {
      const { data: eventData, error: eventError } = await supabase
        .from('event_details')
        .select('event_id')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        return NextResponse.json(
          { success: false, error: 'Event not found', data: [], count: 0 },
          { status: 404 }
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

    // Fetch updates for the event
    const { data, error, count } = await supabase
      .from('event_updates')
      .select('*', { count: 'exact' })
      .eq('event_id', finalEventId)
      .order('update_date', { ascending: false });

    if (error) {
      console.error('[API /api/get/updates] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updates', details: error.message, data: [], count: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (data || []) as EventUpdate[],
      count: count || 0
    });

  } catch (error) {
    console.error('[API /api/get/updates] Exception:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        count: 0
      },
      { status: 500 }
    );
  }
}