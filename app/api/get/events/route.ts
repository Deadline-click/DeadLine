// app/api/get/events/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Define the Event type based on your database schema
interface Event {
  event_id: number
  title: string
  image_url: string | null
  status: string
  tags: string[] | null
  query: string | null
  summary: string | null
  last_updated: string | null
  incident_date: string | null
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Named export for GET method (required for App Router)
export async function GET() {
  try {
    // Fetch all events from the database, ordered by last_updated (newest first)
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('last_updated', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Return all events with proper CORS headers if needed
    return NextResponse.json(
      { events: events || [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}