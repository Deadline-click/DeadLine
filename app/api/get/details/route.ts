import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_SECRET_KEY = process.env.API_SECRET_KEY;

interface EventDetails {
  event_id: string;
  slug: string;
  headline: string;
  location: string;
  details: {
    overview: string;
    keyPoints: Array<{ label: string; value: string }>;
  };
  accused: {
    individuals: Array<{ name: string; summary: string; details: Array<{ label: string; value: string }> }>;
    organizations: Array<{ name: string; summary: string; details: Array<{ label: string; value: string }> }>;
  };
  victims: {
    individuals: Array<{ name: string; summary: string; details: Array<{ label: string; value: string }> }>;
    groups: Array<{ name: string; summary: string; details: Array<{ label: string; value: string }> }>;
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
    const slug = searchParams.get('slug');
    const apiKey = searchParams.get('api_key');

    // Validate API key
    if (!apiKey || apiKey !== API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Check if either event_id or slug is provided
    if (!eventId && !slug) {
      return NextResponse.json(
        { success: false, error: 'Either event_id or slug parameter is required' },
        { status: 400 }
      );
    }

    // Query by slug if provided, otherwise by event_id
    let query = supabase.from('event_details').select('*');
    
    if (slug) {
      query = query.eq('slug', slug);
    } else if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('[API /api/get/details] Supabase error:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch event details', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Ensure the response has the correct structure
    const eventDetails: EventDetails = {
      event_id: data.event_id,
      slug: data.slug || '',
      headline: data.headline || '',
      location: data.location || '',
      details: data.details || { overview: '', keyPoints: [] },
      accused: data.accused || { individuals: [], organizations: [] },
      victims: data.victims || { individuals: [], groups: [] },
      timeline: data.timeline || [],
      sources: Array.isArray(data.sources) ? data.sources : [],
      images: Array.isArray(data.images) ? data.images : [],
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: eventDetails
    });

  } catch (error) {
    console.error('[API /api/get/details] Exception:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}