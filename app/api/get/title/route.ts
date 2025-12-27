import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let decodedUrl = '';
  
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    try {
      decodedUrl = decodeURIComponent(url);
      new URL(decodedUrl);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      cache: 'force-cache',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { title: 'Article' },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
          }
        }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    let title = '';
    
    title = $('meta[property="og:title"]').attr('content') || '';
    
    if (!title) {
      title = $('meta[name="twitter:title"]').attr('content') || '';
    }
    
    if (!title) {
      title = $('title').text().trim();
    }
    
    if (!title) {
      title = $('h1').first().text().trim();
    }
    
    if (!title) {
      title = $('meta[name="title"]').attr('content') || '';
    }
    
    if (!title) {
      title = 'Article';
    }

    title = title
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim();

    const siteName = $('meta[property="og:site_name"]').attr('content') || '';
    if (siteName && title.toLowerCase().includes(siteName.toLowerCase())) {
      title = title
        .replace(new RegExp(`\\s*[-|—–]\\s*${siteName}\\s*$`, 'i'), '')
        .replace(new RegExp(`^${siteName}\\s*[-|—–]\\s*`, 'i'), '')
        .trim();
    }

    const commonSuffixes = ['Home', 'Homepage', 'Official Site', 'Official Website'];
    commonSuffixes.forEach(suffix => {
      const regex = new RegExp(`\\s*[-|—–]\\s*${suffix}\\s*$`, 'i');
      title = title.replace(regex, '').trim();
    });

    const parts = title.split(/[\|—–]/);
    if (parts.length > 1) {
      const mainPart = parts[0].trim();
      if (mainPart.length > 10) {
        title = mainPart;
      }
    }

    if (title.length > 120) {
      title = title.substring(0, 117) + '...';
    }

    if (!title || title.length < 3) {
      title = 'Article';
    }

    const duration = Date.now() - startTime;

    return NextResponse.json(
      { title },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { title: 'Article' },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        }
      }
    );
  }
}