import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET_KEY = process.env.API_SECRET_KEY;

interface EventDetails {
  event_id: string;
  headline: string;
  location: string;
  details: {
    overview: string;
    keyPoints: Array<{ label: string; value: string }>;
  };
  accused: {
    individuals: Array<{ summary: string; details: Array<{ label: string; value: string }> }>;
    organizations: Array<{ summary: string; details: Array<{ label: string; value: string }> }>;
  };
  victims: {
    individuals: Array<{ summary: string; details: Array<{ label: string; value: string }> }>;
    groups: Array<{ summary: string; details: Array<{ label: string; value: string }> }>;
  };
  timeline: Array<{
    date: string;
    context: string;
    events: Array<{
      time?: string;
      description: string;
      participants?: string;
      evidence?: string;
    }>;
  }>;
  sources: string[];
  images: string[];
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const apiKey = searchParams.get('api_key');

    if (!apiKey || apiKey !== API_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'event_id parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('event_details')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch event details', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as EventDetails
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}