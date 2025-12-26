import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const api_key = searchParams.get('api_key');
  const event_id = searchParams.get('event_id');
  const revalidate_all = searchParams.get('revalidate_all');

  if (!api_key || api_key !== process.env.API_SECRET_KEY) {
    return NextResponse.json(
      { success: false, message: 'Invalid API key' },
      { status: 401 }
    );
  }

  try {
    const revalidated: string[] = [];

    if (revalidate_all === 'true') {
      revalidateTag('events-list');
      revalidatePath('/');
      revalidated.push('events-list', 'homepage');
    }

    if (event_id) {
      revalidateTag(`event-${event_id}`);
      revalidateTag(`event-updates-${event_id}`);
      revalidatePath(`/event/${event_id}`);
      revalidated.push(`event-${event_id}`, `event-updates-${event_id}`);
      
      revalidateTag('events-list');
      revalidatePath('/');
      revalidated.push('events-list', 'homepage');
    }

    if (!event_id && revalidate_all !== 'true') {
      return NextResponse.json(
        { success: false, message: 'event_id or revalidate_all parameter is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: revalidate_all === 'true' 
        ? 'All caches revalidated' 
        : `Cache revalidated for event ${event_id}`,
      revalidated,
      now: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error revalidating cache', error: String(err) },
      { status: 500 }
    );
  }
}
