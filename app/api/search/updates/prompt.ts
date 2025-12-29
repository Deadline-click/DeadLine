interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  publishedDate?: string;
  fullContent?: string;
}

export function buildUpdateAnalysisPrompt(
  query: string, 
  searchResults: GoogleSearchResult[], 
  lastUpdateDate: string
): string {
  
  return `You are analyzing case developments for: "${query}"

Last Update Date: ${lastUpdateDate}

Your task: Extract what happened in the case from the news articles below. All articles are AFTER ${lastUpdateDate}, so analyze and summarize the developments.

RESPONSE FORMAT (JSON only):
{
  "status": "Justice/Injustice",
  "updates": [
    {
      "date": "YYYY-MM-DD",
      "title": "Specific development description",
      "description": "Use 2-4 Compact Scentences. Complete summary with key facts, numbers, names. Use **keyword** once for most important keyword or name or fact or date or amount or crime but regarding the new update"
    }
  ]
}

RULES:
1. Write it with an Indian Perspective
2. DATE: Use article publication date in YYYY-MM-DD format
3. GROUPING: Combine articles from same date into one update
4. SORT: Chronological order (oldest → newest)
5. TITLE: Describe what happened (not case name). Be specific and newsworthy
6. DESCRIPTION:
   - Include all key facts, numbers, names, outcomes
   - Use **bold** ONCE on 2-3 word key phrase
   - Escape quotes with backslash
   - Be concise but complete
7. STATUS: 
   - "Justice" if outcome clearly states that justice is provided. till that never state Justice always state "Injustice"
8. NO speculation - only facts from articles
---

NEWS ARTICLES:

${searchResults.map((result, index) => `
[${index + 1}]
Title: ${result.title}
Date: ${result.publishedDate || 'Date unavailable'}
Snippet: ${result.snippet}

Full Content:
${result.fullContent || 'Content not available'}
`).join('\n---\n')}

Return valid JSON only. No preamble.`;
}