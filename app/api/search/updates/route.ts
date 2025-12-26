import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { buildUpdateAnalysisPrompt } from './prompts';

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
}

interface DateUpdate {
  date: string;
  title: string;
  description: string;
  relevance_score: number;
  key_insights: string[];
  summary: string;
  sources: string[];
}

interface GroqAnalysisResponse {
  has_new_updates: boolean;
  updates: DateUpdate[];
}

interface UpdateRecord {
  event_id: number;
  title: string;
  description: string;
  update_date: string;
  relevance_score: number;
  sources: string[];
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
  has_new_content: boolean;
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
    has_new_content: false
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
      .select('event_id, query, last_updated')
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

    const filteredResults = searchResults.filter(result => {
      const articleDate = parseArticleDate(result.publishedDate);
      return isArticleNewer(articleDate, lastUpdated);
    });

    debugInfo.filtered_results_count = filteredResults.length;
    debugInfo.has_new_content = filteredResults.length > 0;

    if (filteredResults.length === 0) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        message: 'No new updates found since last update',
        last_updated: lastUpdated.toISOString(),
        total_search_results: searchResults.length,
        new_articles_found: 0,
        debug: debugInfo
      });
    }

    const webFetchStart = Date.now();
    const resultsWithContent = await Promise.all(
      filteredResults.map(async (result) => ({
        ...result,
        fullContent: await fetchPageContent(result.link)
      }))
    );
    debugInfo.web_fetch_time = Date.now() - webFetchStart;

    const groqAnalysisStart = Date.now();
    const analysis = await analyzeWithGroq(resultsWithContent, event.query, lastUpdated.toISOString());
    debugInfo.groq_analysis_time = Date.now() - groqAnalysisStart;
    
    if (!analysis || !analysis.has_new_updates || analysis.updates.length === 0) {
      debugInfo.total_processing_time = Date.now() - startTime;
      return NextResponse.json({ 
        message: 'No new updates found after analysis',
        last_updated: lastUpdated.toISOString(),
        debug: debugInfo
      });
    }

    const dbInsertStart = Date.now();
    
    const updateRecords: UpdateRecord[] = analysis.updates.map(update => ({
      event_id: event.event_id,
      title: update.title.substring(0, 100),
      description: update.description.substring(0, 1000),
      update_date: update.date,
      relevance_score: update.relevance_score,
      sources: update.sources
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

    const mostRecentUpdateDate = analysis.updates[analysis.updates.length - 1].date;
    const { error: updateError } = await supabase
      .from('events')
      .update({ last_updated: mostRecentUpdateDate })
      .eq('event_id', event.event_id);

    if (updateError) {
      console.error('Error updating events table:', updateError);
    }

    debugInfo.total_processing_time = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `${analysis.updates.length} updates created successfully`,
      updates: updateRecords,
      analysis: analysis,
      new_articles_processed: filteredResults.length,
      total_search_results: searchResults.length,
      updates_by_date: analysis.updates.length,
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
    
    if (!analysisResult.has_new_updates || !analysisResult.updates || analysisResult.updates.length === 0) {
      return { has_new_updates: false, updates: [] };
    }

    const validUpdates = analysisResult.updates.filter((update: DateUpdate) => 
      update.date && update.title && update.description
    );

    if (validUpdates.length === 0) {
      return { has_new_updates: false, updates: [] };
    }

    return { has_new_updates: true, updates: validUpdates };
  } catch (error) {
    return null;
  }
}