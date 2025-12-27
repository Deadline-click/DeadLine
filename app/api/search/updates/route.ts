import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { buildUpdateAnalysisPrompt } from './prompt';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Config {
  groq: {
    model: string;
    temperature: number;
    max_tokens: number;
  };
}

function loadConfig(): Config {
  const config: Config = require('../../config.json');
  return config;
}

const config = loadConfig();

interface Event {
  event_id: number;
  query: string;
  last_updated: string;
  status: string;
}

interface DateUpdate {
  date: string;
  title: string;
  description: string;
}

interface GroqAnalysisResponse {
  status: 'Justice' | 'Injustice';
  updates: DateUpdate[];
}

interface UpdateRecord {
  event_id: number;
  title: string;
  description: string;
  update_date: string;
}

interface DebugInfo {
  event_fetch_time: number;
  google_search_time: number;
  web_fetch_time: number;
  groq_analysis_time: number;
  database_insert_time: number;
  total_processing_time: number;
  search_results_count: number;
  filtered_results_count: number;
  last_updated_date: string | null;
  days_since_last_update: number;
  has_new_articles: boolean;
  dates_scanned: number;
  links_per_date: Record<string, number>;
}

interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  publishedDate?: string;
  fullContent?: string;
}

const customSearch = google.customsearch('v1');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getRequestParams(req: NextRequest, body?: any) {
  const url = new URL(req.url);
  
  if (req.method === 'GET') {
    return {
      event_id: url.searchParams.get('event_id'),
      api_key: url.searchParams.get('api_key') || req.headers.get('x-api-key')
    };
  }
  
  return {
    event_id: body?.event_id,
    api_key: req.headers.get('x-api-key') || body?.api_key
  };
}

function parseArticleDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    const parsedDate = new Date(dateString);
    
    if (isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
      return null;
    }
    
    return parsedDate;
  } catch (error) {
    return null;
  }
}

function isArticleNewer(articleDate: Date | null, lastUpdated: Date): boolean {
  if (!articleDate) return false;
  return articleDate > lastUpdated;
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return '';
    }
    
    const html = await response.text();
    
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.substring(0, 8000);
  } catch (error) {
    return '';
  }
}

function selectLinksToScan(results: GoogleSearchResult[], maxPerDate: number = 3): GoogleSearchResult[] {
  const dateGroups = new Map<string, GoogleSearchResult[]>();
  
  results.forEach(result => {
    const dateKey = result.publishedDate ? result.publishedDate.split('T')[0] : 'unknown';
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(result);
  });
  
  const selected: GoogleSearchResult[] = [];
  dateGroups.forEach((dateResults) => {
    selected.push(...dateResults.slice(0, maxPerDate));
  });
  
  return selected;
}

async function processEventUpdate(event_id: string, apiKey: string) {
  const startTime = Date.now();
  const debugInfo: DebugInfo = {
    event_fetch_time: 0,
    google_search_time: 0,
    web_fetch_time: 0,
    groq_analysis_time: 0,
    database_insert_time: 0,
    total_processing_time: 0,
    search_results_count: 0,
    filtered_results_count: 0,
    last_updated_date: null,
    days_since_last_update: 0,
    has_new_articles: false,
    dates_scanned: 0,
    links_per_date: {}
  };

  try {
    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid API key',
        debug: debugInfo
      }, { status: 401 });
    }

    if (!event_id) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        error: 'event_id is required',
        debug: debugInfo
      }, { status: 400 });
    }

    const eventIdNumber = parseInt(event_id);
    if (isNaN(eventIdNumber)) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        error: 'event_id must be a valid number',
        debug: debugInfo
      }, { status: 400 });
    }

    const eventFetchStart = Date.now();
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('event_id, query, last_updated, status')
      .eq('event_id', eventIdNumber)
      .single();
    
    debugInfo.event_fetch_time = Date.now() - eventFetchStart;
    
    if (eventError || !eventData) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        error: 'Event not found',
        debug: debugInfo,
        supabase_error: eventError
      }, { status: 404 });
    }

    const event: Event = eventData;
    const lastUpdated = event.last_updated ? new Date(event.last_updated) : new Date(0);
    
    debugInfo.last_updated_date = lastUpdated.toISOString();
    debugInfo.days_since_last_update = Math.ceil((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

    const googleSearchStart = Date.now();
    const searchResults = await searchGoogleForUpdates(event.query, lastUpdated);
    debugInfo.google_search_time = Date.now() - googleSearchStart;
    debugInfo.search_results_count = searchResults.length;

    // Filter articles published AFTER last update date
    const filteredResults = searchResults.filter(result => {
      const articleDate = parseArticleDate(result.publishedDate);
      return isArticleNewer(articleDate, lastUpdated);
    });

    debugInfo.filtered_results_count = filteredResults.length;
    debugInfo.has_new_articles = filteredResults.length > 0;

    // If no new articles, return early - no analysis needed
    if (filteredResults.length === 0) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        message: 'No new articles found after last update date',
        last_updated: lastUpdated.toISOString(),
        total_search_results: searchResults.length,
        new_articles_found: 0,
        debug: debugInfo
      });
    }

    // Select limited links per date
    const selectedResults = selectLinksToScan(filteredResults, 3);
    
    // Track dates and links per date
    const dateCount = new Map<string, number>();
    selectedResults.forEach(result => {
      const dateKey = result.publishedDate ? result.publishedDate.split('T')[0] : 'unknown';
      dateCount.set(dateKey, (dateCount.get(dateKey) || 0) + 1);
    });
    
    debugInfo.dates_scanned = dateCount.size;
    debugInfo.links_per_date = Object.fromEntries(dateCount);

    const webFetchStart = Date.now();
    const resultsWithContent = await Promise.all(
      selectedResults.map(async (result) => ({
        ...result,
        fullContent: await fetchPageContent(result.link)
      }))
    );
    debugInfo.web_fetch_time = Date.now() - webFetchStart;

    // Since we have new articles, analyze them to extract what happened
    const groqAnalysisStart = Date.now();
    const analysis = await analyzeWithGroq(resultsWithContent, event.query, lastUpdated.toISOString());
    debugInfo.groq_analysis_time = Date.now() - groqAnalysisStart;
    
    // If analysis failed or returned no updates, return error
    if (!analysis || analysis.updates.length === 0) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        error: 'Failed to analyze new articles',
        message: 'Analysis returned no updates despite having new articles',
        new_articles_found: selectedResults.length,
        debug: debugInfo
      }, { status: 500 });
    }

    const dbInsertStart = Date.now();
    
    const updateRecords: UpdateRecord[] = analysis.updates.map(update => ({
      event_id: event.event_id,
      title: update.title,
      description: update.description,
      update_date: update.date
    }));

    const { data: insertData, error: insertError } = await supabase
      .from('event_updates')
      .insert(updateRecords)
      .select();

    debugInfo.database_insert_time = Date.now() - dbInsertStart;

    if (insertError) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        error: 'Failed to insert updates',
        debug: debugInfo,
        supabase_error: insertError
      }, { status: 500 });
    }

    // Update event status and last_updated
    const mostRecentUpdateDate = analysis.updates[analysis.updates.length - 1].date;
    const { error: updateError } = await supabase
      .from('events')
      .update({ 
        last_updated: mostRecentUpdateDate,
        status: analysis.status
      })
      .eq('event_id', event.event_id);

    if (updateError) {
      console.error('Error updating events table:', updateError);
    }

    // Update event_details sources (keep track of source links)
    const newSources = selectedResults.map(r => r.link);
    const { data: existingDetails } = await supabase
      .from('event_details')
      .select('sources')
      .eq('event_id', event_id.toString())
      .single();

    const currentSources = existingDetails?.sources || [];
    const uniqueSources = Array.from(new Set([...currentSources, ...newSources]));

    const { error: detailsError } = await supabase
      .from('event_details')
      .upsert({
        event_id: event_id.toString(),
        sources: uniqueSources,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id'
      });

    if (detailsError) {
      console.error('Error updating event_details:', detailsError);
    }

    debugInfo.total_processing_time = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `${analysis.updates.length} updates created successfully`,
      status: analysis.status,
      updates: updateRecords,
      new_articles_processed: selectedResults.length,
      total_search_results: searchResults.length,
      updates_created: analysis.updates.length,
      new_sources_added: newSources.length,
      debug: debugInfo
    });

  } catch (error) {
    debugInfo.total_processing_time = Date.now() - startTime;
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: debugInfo
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { event_id, api_key } = getRequestParams(req);
    
    if (!event_id || !api_key) {
      return NextResponse.json({ 
        error: 'Missing required parameters',
        message: 'event_id and api_key are required as query parameters'
      }, { status: 400 });
    }

    return await processEventUpdate(event_id, api_key);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_id, api_key } = getRequestParams(req, body);
    
    if (!event_id || !api_key) {
      return NextResponse.json({ 
        error: 'Missing required parameters',
        message: 'event_id and api_key are required in request body or headers'
      }, { status: 400 });
    }

    return await processEventUpdate(event_id, api_key);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function searchGoogleForUpdates(
  query: string, 
  lastUpdated: Date
): Promise<GoogleSearchResult[]> {
  try {
    const daysSinceUpdate = Math.ceil((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    
    const searchParams = {
      key: process.env.GOOGLE_API_KEY,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      num: 10,
      sort: 'date',
      dateRestrict: `d${Math.max(daysSinceUpdate, 1)}`
    };

    const response = await customSearch.cse.list(searchParams);
    
    if (!response.data.items) {
      return [];
    }

    const results: GoogleSearchResult[] = response.data.items
      .filter(item => item.title && item.snippet)
      .map(item => {
        const publishedDate = 
          item.pagemap?.metatags?.[0]?.['article:published_time'] ||
          item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
          item.pagemap?.metatags?.[0]?.['article:modified_time'] ||
          item.pagemap?.metatags?.[0]?.['pubdate'] ||
          item.pagemap?.metatags?.[0]?.['date'] ||
          item.pagemap?.newsarticle?.[0]?.datepublished ||
          item.pagemap?.article?.[0]?.datepublished;

        return {
          title: item.title!,
          snippet: item.snippet!,
          link: item.link!,
          publishedDate: publishedDate
        };
      });

    return results;
  } catch (error) {
    return [];
  }
}

async function analyzeWithGroq(
  searchResults: GoogleSearchResult[],
  originalQuery: string,
  lastUpdateDate: string
): Promise<GroqAnalysisResponse | null> {
  try {
    const analysisPrompt = buildUpdateAnalysisPrompt(originalQuery, searchResults, lastUpdateDate);

    const completion = await groq.chat.completions.create({
      model: config.groq.model,
      messages: [
        {
          role: "user" as const,
          content: analysisPrompt
        }
      ],
      temperature: config.groq.temperature,
      max_tokens: config.groq.max_tokens,
      response_format: { type: "json_object" }
    });
    
    if (!completion.choices?.[0]?.message?.content) {
      return null;
    }

    const analysisResult = JSON.parse(completion.choices[0].message.content);
    
    // Validate that we have updates
    if (!analysisResult.updates || analysisResult.updates.length === 0) {
      return null;
    }

    const validUpdates = analysisResult.updates.filter((update: DateUpdate) => 
      update.date && update.title && update.description
    );

    if (validUpdates.length === 0) {
      return null;
    }

    return { 
      status: analysisResult.status || 'Injustice',
      updates: validUpdates 
    };
  } catch (error) {
    return null;
  }
}