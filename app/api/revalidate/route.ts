import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, event_id, revalidate_main } = body;

    if (!api_key || api_key !== process.env.API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    const tagsToRevalidate: string[] = [];
    let message = '';

    if (event_id) {
      tagsToRevalidate.push(
        `event-${event_id}`,
        `event-details-${event_id}`,
        `event-updates-${event_id}`
      );
      message = `Cache revalidated for event ${event_id}`;
    }

    if (revalidate_main) {
      tagsToRevalidate.push('events-list');
      message = event_id 
        ? `Cache revalidated for event ${event_id} and main events list`
        : 'Cache revalidated for main events list';
    }

    if (tagsToRevalidate.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing event_id or revalidate_main parameter' },
        { status: 400 }
      );
    }

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/internal/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tags: tagsToRevalidate
      }),
    });

    return NextResponse.json({
      success: true,
      message,
      revalidated: true,
      tags: tagsToRevalidate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const api_key = searchParams.get('api_key');
    const event_id = searchParams.get('event_id');
    const revalidate_main = searchParams.get('revalidate_main') === 'true';

    if (!api_key || api_key !== process.env.API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 401 }
      );
    }

    const tagsToRevalidate: string[] = [];
    let message = '';

    if (event_id) {
      tagsToRevalidate.push(
        `event-${event_id}`,
        `event-details-${event_id}`,
        `event-updates-${event_id}`
      );
      message = `Cache revalidated for event ${event_id}`;
    }

    if (revalidate_main) {
      tagsToRevalidate.push('events-list');
      message = event_id 
        ? `Cache revalidated for event ${event_id} and main events list`
        : 'Cache revalidated for main events list';
    }

    if (tagsToRevalidate.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing event_id or revalidate_main parameter' },
        { status: 400 }
      );
    }

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/internal/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tags: tagsToRevalidate
      }),
    });

    return NextResponse.json({
      success: true,
      message,
      revalidated: true,
      tags: tagsToRevalidate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}