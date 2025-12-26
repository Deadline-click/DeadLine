interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  publishedDate?: string;
  fullContent?: string;
}

export function buildUpdateAnalysisPrompt(query: string, searchResults: GoogleSearchResult[], lastUpdateDate: string): string {
  const searchContent = searchResults.map((result, index) => 
    `Result ${index + 1}:
Title: ${result.title}
Snippet: ${result.snippet}
Published: ${result.publishedDate || 'Date not available'}
Full Article Content:
${result.fullContent || 'Content not available'}
---`
  ).join('\n\n');

  return `Analyze developments for: "${query}" occurring AFTER ${lastUpdateDate}

Return ONLY valid JSON. Start with { and end with }.

{
  "has_new_updates": true,
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "title": "Max 100 characters",
      "description": "800-1000 characters",
      "relevance_score": 8.5,
      "key_insights": ["insight 1", "insight 2", "insight 3"],
      "summary": "Max 200 characters",
      "sources": ["url1", "url2"]
    }
  ]
}

REQUIREMENTS:

Read ALL full article content provided. Extract ONLY content published AFTER ${lastUpdateDate}.

Group findings by publication date. Create SEPARATE update object for EACH distinct date.

If NO content after ${lastUpdateDate} exists, return: {"has_new_updates": false, "updates": []}

Each update represents ONE specific date only.

Date field must be YYYY-MM-DD format matching article publication date.

Title must be newsworthy and specific to that date's development. Maximum 100 characters.

Description must be 800-1000 characters covering that date's developments only. Include specific data, facts, implications. Synthesize information from the full article content published on that date.

Relevance score must be 0-10 indicating significance of that date's updates.

Key insights must be 3-5 complete sentences covering distinct findings from that specific date.

Summary must be under 200 characters providing quick overview of that date's updates.

Sources array must list URLs of articles used for that specific date's update.

Sort updates chronologically from oldest to newest.

Do NOT combine multiple dates into one update.

Do NOT include information from before ${lastUpdateDate}.

Focus on changes, new developments, and specific events from each date.

Use exact numbers, complete names, precise data points, specific timestamps from the full article content.

Escape quotes with backslash.

LAST UPDATE: ${lastUpdateDate}

RESULTS:
${searchContent}

Return ONLY JSON.`;
}