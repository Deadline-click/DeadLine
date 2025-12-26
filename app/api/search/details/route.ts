import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import config from '../../config.json';
import { buildAnalysisPrompt } from './prompt';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const API_SECRET_KEY = process.env.API_SECRET_KEY;

const MAX_TOKENS_BUDGET = 12000;
const AVG_CHARS_PER_TOKEN = 4;
const MAX_TOTAL_CHARS = MAX_TOKENS_BUDGET * AVG_CHARS_PER_TOKEN;
const MAX_ARTICLES_PER_PERIOD = 8;
const MAX_CHARS_PER_SITE = 3000;

interface AccusedIndividual {
  summary: string;
  details: Array<{ label: string; value: string }>;
}

interface AccusedOrganization {
  summary: string;
  details: Array<{ label: string; value: string }>;
}

interface VictimIndividual {
  summary: string;
  details: Array<{ label: string; value: string }>;
}

interface VictimGroup {
  summary: string;
  details: Array<{ label: string; value: string }>;
}

interface TimelineEvent {
  time: string;
  description: string;
  participants: string;
  evidence: string;
}

interface TimelineEntry {
  date: string;
  context: string;
  events: TimelineEvent[];
}

interface EventDetails {
  headline: string;
  location: string;
  details: {
    overview: string;
    keyPoints: Array<{ label: string; value: string }>;
  };
  accused: {
    individuals: AccusedIndividual[];
    organizations: AccusedOrganization[];
  };
  victims: {
    individuals: VictimIndividual[];
    groups: VictimGroup[];
  };
  timeline: TimelineEntry[];
  sources: string[];
  images: string[];
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  publishDate?: string;
  author?: string;
  source: string;
  relevanceScore: number;
  timePeriod: string;
}

interface ScrapedData {
  results: GoogleSearchResult[];
  articles: ScrapedArticle[];
  images: string[];
}

interface DateRange {
  start: string;
  end: string;
  label: string;
}

function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function isHTMLResponse(response: string): boolean {
  return response.trim().toLowerCase().startsWith('<!doctype') || 
         response.trim().toLowerCase().startsWith('<html');
}

function calculateRelevanceScore(content: string, query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
  const contentLower = content.toLowerCase();
  
  let score = 0;
  queryTerms.forEach(term => {
    const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length;
    score += occurrences;
  });
  
  if (content.length > 1000) score += 2;
  if (content.length > 2000) score += 3;
  
  return score;
}

function extractMainContent(html: string): string {
  let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleanHtml = cleanHtml.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  cleanHtml = cleanHtml.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
  cleanHtml = cleanHtml.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  cleanHtml = cleanHtml.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');
  cleanHtml = cleanHtml.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '');
  
  const articleMatches = cleanHtml.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/gi);
  
  if (articleMatches && articleMatches.length > 0) {
    const longestMatch = articleMatches.reduce((a, b) => a.length > b.length ? a : b);
    return extractTextFromHTML(longestMatch);
  }
  
  const contentDivs = cleanHtml.match(/<div[^>]*(?:class|id)=["'][^"']*(?:content|article|post|story|entry|body|text|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi);
  
  if (contentDivs && contentDivs.length > 0) {
    const longestDiv = contentDivs.reduce((a, b) => a.length > b.length ? a : b);
    return extractTextFromHTML(longestDiv);
  }
  
  const paragraphs = cleanHtml.match(/<p[^>]*>(?:(?!<\/p>).)*<\/p>/gi);
  if (paragraphs && paragraphs.length > 3) {
    return paragraphs
      .map(p => extractTextFromHTML(p))
      .filter(text => text.length > 50)
      .join(' ');
  }
  
  return '';
}

function extractTextFromHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArticleContent(html: string, url: string, query: string): ScrapedArticle {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s*[-|]\s*.+$/, '') : '';
  
  const content = extractMainContent(html);
  const source = new URL(url).hostname.replace('www.', '');
  const relevanceScore = calculateRelevanceScore(content, query);
  
  return {
    url,
    title,
    content,
    publishDate: '',
    author: '',
    source,
    relevanceScore,
    timePeriod: ''
  };
}

async function scrapeArticle(url: string, query: string, timePeriod: string): Promise<ScrapedArticle | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }
    
    const html = await response.text();
    
    if (!html || html.length < 200) {
      return null;
    }
    
    const article = extractArticleContent(html, url, query);
    article.timePeriod = timePeriod;
    
    if (article.content.length < 100) {
      return null;
    }
    
    return article;
    
  } catch (error) {
    return null;
  }
}

async function searchImages(query: string): Promise<string[]> {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    return [];
  }

  try {
    const imageSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=10&safe=active&imgSize=medium`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const imageResponse = await fetch(imageSearchUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);

    if (!imageResponse.ok) {
      return [];
    }

    const imageResponseText = await imageResponse.text();
    
    if (!isValidJSON(imageResponseText) || isHTMLResponse(imageResponseText)) {
      return [];
    }

    const imageData = JSON.parse(imageResponseText);
    
    if (imageData.error || !imageData.items || !Array.isArray(imageData.items)) {
      return [];
    }

    const imageLinks = imageData.items
      .map((item: any) => item.link)
      .filter(Boolean)
      .filter((link: string) => {
        const url = link.toLowerCase();
        return !url.includes('favicon') && 
               !url.includes('/logo') && 
               !url.includes('/icon') &&
               (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
                url.includes('.webp') || url.includes('.gif') || url.includes('image'));
      })
      .slice(0, 8);

    return imageLinks;

  } catch (error) {
    return [];
  }
}

function generateDateRanges(): DateRange[] {
  const now = new Date();
  const ranges: DateRange[] = [];
  
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  ranges.push({
    start: formatDateForSearch(twoYearsAgo),
    end: formatDateForSearch(oneYearAgo),
    label: 'Oldest Period (2-1 years ago)'
  });
  
  ranges.push({
    start: formatDateForSearch(oneYearAgo),
    end: formatDateForSearch(sixMonthsAgo),
    label: 'Early Period (1 year - 6 months ago)'
  });
  
  ranges.push({
    start: formatDateForSearch(sixMonthsAgo),
    end: formatDateForSearch(threeMonthsAgo),
    label: 'Middle Period (6-3 months ago)'
  });
  
  ranges.push({
    start: formatDateForSearch(threeMonthsAgo),
    end: formatDateForSearch(now),
    label: 'Recent Period (Last 3 months)'
  });
  
  return ranges;
}

function formatDateForSearch(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function searchPeriod(query: string, dateRange: DateRange): Promise<GoogleSearchResult[]> {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    throw new Error('Google API credentials not configured');
  }

  try {
    const dateRestrict = `date:r:${dateRange.start}:${dateRange.end}`;
    const webSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10&sort=date:d:s&dateRestrict=${dateRestrict}`;
    
    const webResponse = await fetch(webSearchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!webResponse.ok) {
      return [];
    }

    const webResponseText = await webResponse.text();
    
    if (isHTMLResponse(webResponseText) || !isValidJSON(webResponseText)) {
      return [];
    }

    const webData = JSON.parse(webResponseText);

    if (webData.error) {
      return [];
    }

    const results: GoogleSearchResult[] = webData.items?.map((item: any) => ({
      title: item.title || 'No title',
      link: item.link || '',
      snippet: item.snippet || 'No snippet available',
      displayLink: item.displayLink || '',
    })) || [];

    return results;

  } catch (error) {
    return [];
  }
}

async function searchGoogleChronologically(query: string): Promise<ScrapedData> {
  const dateRanges = generateDateRanges();
  const allResults: GoogleSearchResult[] = [];
  const allArticles: ScrapedArticle[] = [];
  
  for (const dateRange of dateRanges) {
    const periodResults = await searchPeriod(query, dateRange);
    
    const filteredResults = periodResults.filter((result, index, self) => {
      const isDuplicate = allResults.some(r => r.link === result.link);
      if (isDuplicate) return false;
      
      const url = result.link.toLowerCase();
      const domain = result.displayLink?.toLowerCase() || '';
      
      const blockDomains = ['tiktok.com', 'pinterest.com', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'reddit.com'];
      const isBlocked = blockDomains.some(blocked => domain.includes(blocked) || url.includes(blocked));
      
      const isPaywall = domain.includes('nytimes.com') || domain.includes('wsj.com') || domain.includes('ft.com');
      
      return !isBlocked && !isPaywall && result.title && result.snippet;
    });
    
    allResults.push(...filteredResults);
    
    const priorityResults = filteredResults.slice(0, MAX_ARTICLES_PER_PERIOD);
    
    const scrapedArticles = await Promise.allSettled(
      priorityResults.map(result => scrapeArticle(result.link, query, dateRange.label))
    );
    
    const successfulArticles: ScrapedArticle[] = scrapedArticles
      .filter((result): result is PromiseFulfilledResult<ScrapedArticle> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
      .filter(article => article.content.length > 150);

    allArticles.push(...successfulArticles);
    
    if (dateRange !== dateRanges[dateRanges.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  allArticles.sort((a, b) => {
    const periodOrder = ['Oldest Period (2-1 years ago)', 'Early Period (1 year - 6 months ago)', 'Middle Period (6-3 months ago)', 'Recent Period (Last 3 months)'];
    const aPeriodIndex = periodOrder.indexOf(a.timePeriod);
    const bPeriodIndex = periodOrder.indexOf(b.timePeriod);
    
    if (aPeriodIndex !== bPeriodIndex) {
      return aPeriodIndex - bPeriodIndex;
    }
    
    return b.relevanceScore - a.relevanceScore;
  });

  const imageLinks = await searchImages(query);

  return { 
    results: allResults, 
    articles: allArticles,
    images: imageLinks
  };
}

function optimizeContentForContext(articles: ScrapedArticle[]): string {
  const siteContentMap = new Map<string, string[]>();
  let totalChars = 0;
  const optimizedArticles: string[] = [];
  
  articles.forEach((article, index) => {
    const site = article.source;
    
    if (!siteContentMap.has(site)) {
      siteContentMap.set(site, []);
    }
    
    const siteContents = siteContentMap.get(site)!;
    const currentSiteChars = siteContents.reduce((sum, content) => sum + content.length, 0);
    
    if (currentSiteChars >= MAX_CHARS_PER_SITE) {
      return;
    }
    
    const availableSiteChars = MAX_CHARS_PER_SITE - currentSiteChars;
    const availableTotalChars = MAX_TOTAL_CHARS - totalChars;
    const maxCharsForArticle = Math.min(availableSiteChars, availableTotalChars, article.content.length);
    
    if (maxCharsForArticle < 100) {
      return;
    }
    
    const truncatedContent = article.content.substring(0, maxCharsForArticle);
    const articleText = `[${index + 1}] ${article.source} - ${article.title} (${article.timePeriod})
${truncatedContent}
---`;
    
    if (totalChars + articleText.length > MAX_TOTAL_CHARS) {
      return;
    }
    
    optimizedArticles.push(articleText);
    siteContents.push(articleText);
    totalChars += articleText.length;
  });
  
  return optimizedArticles.join('\n\n');
}

async function processArticlesWithGroq(scrapedData: ScrapedData, query: string): Promise<Omit<EventDetails, 'images' | 'sources'>> {
  const articleContent = optimizeContentForContext(scrapedData.articles);

  const topSnippets = scrapedData.results
    .slice(0, 20)
    .map((result, index) => `${index + 1}. [${result.displayLink}] ${result.title}: ${result.snippet}`)
    .join('\n');

  const prompt = buildAnalysisPrompt(query, articleContent, topSnippets);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a precise factual data extraction system. Output ONLY valid JSON. No markdown, no backticks, no preamble. Start with { and end with }. Properly escape all quotes in strings. Follow the exact structure provided: headline at root level, location at root level, details with overview and keyPoints, accused with individuals and organizations arrays, victims with individuals and groups arrays, timeline with date/context/events structure. Extract every relevant detail without repetition."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: config.groq.model,
      temperature: config.groq.temperature,
      max_tokens: config.groq.max_tokens,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Groq API');
    }

    let cleanedResponse = response.trim();
    
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    cleanedResponse = cleanedResponse.trim();
    
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid response from Groq - no JSON object found');
    }
    
    const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
    }
    
    // Validate and normalize the structure to match the prompt exactly
    const normalizedData: Omit<EventDetails, 'images' | 'sources'> = {
      headline: parsedData.headline || '',
      location: parsedData.location || '',
      details: {
        overview: parsedData.details?.overview || '',
        keyPoints: Array.isArray(parsedData.details?.keyPoints) 
          ? parsedData.details.keyPoints 
          : []
      },
      accused: {
        individuals: Array.isArray(parsedData.accused?.individuals) 
          ? parsedData.accused.individuals 
          : [],
        organizations: Array.isArray(parsedData.accused?.organizations) 
          ? parsedData.accused.organizations 
          : []
      },
      victims: {
        individuals: Array.isArray(parsedData.victims?.individuals) 
          ? parsedData.victims.individuals 
          : [],
        groups: Array.isArray(parsedData.victims?.groups) 
          ? parsedData.victims.groups 
          : []
      },
      timeline: Array.isArray(parsedData.timeline) 
        ? parsedData.timeline 
        : []
    };
    
    return normalizedData;
    
  } catch (error) {
    throw new Error(`Failed to process with Groq API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchEventFromDatabase(event_id: string) {
  const { data: eventData, error: fetchError } = await supabase
    .from('events')
    .select('query, title')
    .eq('event_id', event_id)
    .single();
    
  if (fetchError) {
    throw new Error(`Event not found: ${fetchError.message}`);
  }
  
  if (!eventData || !eventData.query) {
    throw new Error('Event not found or missing query');
  }
  
  return eventData;
}

async function saveEventDetails(event_id: string, structuredData: EventDetails) {
  const { data: existingDetails, error: checkError } = await supabase
    .from('event_details')
    .select('event_id')
    .eq('event_id', event_id)
    .single();

  const timestamp = new Date().toISOString();
  
  let dbOperation;
  if (existingDetails && !checkError) {
    dbOperation = supabase
      .from('event_details')
      .update({
        headline: structuredData.headline,
        location: structuredData.location,
        details: structuredData.details,
        accused: structuredData.accused,
        victims: structuredData.victims,
        timeline: structuredData.timeline,
        sources: structuredData.sources,
        images: structuredData.images,
        updated_at: timestamp
      })
      .eq('event_id', event_id);
  } else {
    dbOperation = supabase
      .from('event_details')
      .insert({
        event_id: event_id,
        headline: structuredData.headline,
        location: structuredData.location,
        details: structuredData.details,
        accused: structuredData.accused,
        victims: structuredData.victims,
        timeline: structuredData.timeline,
        sources: structuredData.sources,
        images: structuredData.images,
        created_at: timestamp,
        updated_at: timestamp
      });
  }

  const { error: saveError } = await dbOperation;
  if (saveError) {
    throw new Error(`Failed to save event details: ${saveError.message}`);
  }
}

async function updateEventTimestamp(event_id: string) {
  const { error: updateError } = await supabase
    .from('events')
    .update({ last_updated: new Date().toISOString() })
    .eq('event_id', event_id);

  if (updateError) {
    console.warn('Failed to update timestamp:', updateError);
  }
}

async function processEvent(event_id: string) {
  const eventData = await fetchEventFromDatabase(event_id);

  const scrapedData = await searchGoogleChronologically(eventData.query);

  if (!scrapedData.articles || scrapedData.articles.length === 0) {
    throw new Error('No articles found or scraped');
  }

  const analyzedData = await processArticlesWithGroq(scrapedData, eventData.query);

  const scrapedSourceUrls = scrapedData.articles
    .filter(article => article.url && article.content.length > 150)
    .map(article => article.url);

  const structuredData: EventDetails = {
    ...analyzedData,
    sources: scrapedSourceUrls,
    images: scrapedData.images
  };

  await saveEventDetails(event_id, structuredData);
  await updateEventTimestamp(event_id);

  const periodBreakdown = scrapedData.articles.reduce((acc, article) => {
    acc[article.timePeriod] = (acc[article.timePeriod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    eventData,
    structuredData,
    scrapedData,
    periodBreakdown
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');
    const api_key = searchParams.get('api_key');

    if (!api_key || api_key !== API_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const { eventData, structuredData, scrapedData, periodBreakdown } = await processEvent(event_id);

    return NextResponse.json({
      success: true,
      message: "Event analyzed chronologically and saved successfully",
      event_id: event_id,
      event_title: eventData.title,
      query_used: eventData.query,
      articles_scraped: structuredData.sources.length,
      images_found: structuredData.images.length,
      sources_analyzed: [...new Set(scrapedData.articles.map(a => a.source))].join(', '),
      chronological_breakdown: periodBreakdown,
      analysis_summary: {
        headline: structuredData.headline,
        location: structuredData.location,
        accused_individuals_count: structuredData.accused.individuals.length,
        accused_organizations_count: structuredData.accused.organizations.length,
        victim_individuals_count: structuredData.victims.individuals.length,
        victim_groups_count: structuredData.victims.groups.length,
        timeline_events: structuredData.timeline.length,
        key_points_count: structuredData.details.keyPoints?.length || 0,
        total_content_analyzed: scrapedData.articles.reduce((sum, article) => sum + article.content.length, 0)
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { event_id } = await request.json();

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const { eventData, structuredData, scrapedData, periodBreakdown } = await processEvent(event_id);

    return NextResponse.json({
      success: true,
      message: "Event analyzed chronologically and saved successfully",
      event_id: event_id,
      event_title: eventData.title,
      query_used: eventData.query,
      articles_scraped: structuredData.sources.length,
      images_found: structuredData.images.length,
      sources_analyzed: [...new Set(scrapedData.articles.map(a => a.source))].join(', '),
      chronological_breakdown: periodBreakdown,
      analysis_summary: {
        headline: structuredData.headline,
        location: structuredData.location,
        accused_individuals_count: structuredData.accused.individuals.length,
        accused_organizations_count: structuredData.accused.organizations.length,
        victim_individuals_count: structuredData.victims.individuals.length,
        victim_groups_count: structuredData.victims.groups.length,
        timeline_events: structuredData.timeline.length,
        key_points_count: structuredData.details.keyPoints?.length || 0,
        total_content_analyzed: scrapedData.articles.reduce((sum, article) => sum + article.content.length, 0)
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}