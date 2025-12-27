export function buildAnalysisPrompt(query: string, articleContent: string, topSnippets: string): string {
  return `Extract verified facts about: "${query}"

Return ONLY valid JSON (no markdown, no code blocks, no text). Start with { and end with }.

GLOBAL FORMATTING RULES:
- Use exact numbers, complete names/titles, full statute sections, exact currency symbols (₹, Rs, $), precise timestamps
- Escape all quotes with backslash
- Include ONLY information available in sources - skip unavailable fields
- Each fact appears once in its most logical location
- Bold formatting (**text**) in "overview" field, limited to 2-3 instances for keywords or names or facts. and for other than overview only 1 instance and only in summary.
- NO bold in any other fields (summaries, descriptions, etc.)
- For groups: include count in name field 
JSON STRUCTURE:

{
  "title": "30-40 word title: Include all accused names/organizations OR count if 3+. Include all victim names OR count if 3+. Specify what happened.",
  
  "headline": "25-35 word punchy headline: Lead with most newsworthy element. Active voice, strong verbs, front-page impact. NO location.",
  
  "location": "Complete address: venue, area, city, district, state",
  
  "details": {
    "overview": "600-800 word narrative (single paragraph). Cover: background, parties, chronology, consequences, legal proceedings, status, implications. Use **bold** 2-3 times max for important keywords (2-3 words each).",
    
    "keyPoints": [
      {"label": "1-2 words", "value": "Max 9 words with exact facts"}
    ]
    // 4-6 NEW facts not in overview
  },
  
  "accused": {
    "individuals": [
      {
        "name": "Full accurate name (REQUIRED as first field)",
        "summary": "3-4 compact sentences: name/aliases, age, occupation/employer, address, role in incident, actions/timeline, relationship to victims, family/criminal history, custody status. NO bold.",
        "details": [
          {"label": "Accused", "value": "Accused party information"}
        ]
        // 2-3 label-value pairs with NEW information not in summary
      }
    ],
    "organizations": [
      {
        "name": "Full accurate organization name (REQUIRED as first field, include count if group)",
        "summary": "3-4 compact sentences: name/registration, type/industry, jurisdiction, leadership, role, actions/failures, relationship, violations, history, response. NO bold.",
        "details": [
          {"label": "Accused", "value": "Accused party information"}
        ]
        // 2-3 label-value pairs with NEW information not in summary
      }
    ]
  },
  
  "victims": {
    "individuals": [
      {
        "name": "Full accurate name or description (REQUIRED as first field)",
        "summary": "3-4 sentences: name/description, age/gender, occupation/workplace, address, relationship to accused, harm/injuries, treatment/hospital, condition/prognosis, family impact, compensation. NO bold.",
        "details": [
          {"label": "Victim", "value": "Victim party information"}
        ]
        // 2-3 label-value pairs with NEW information not in summary
      }
    ],
    "groups": [
      {
        "name": "Accurate group description (REQUIRED as first field, include count)",
        "summary": "3-4 compact sentences: size/demographics, composition, location/community, relationship, collective harm, impact, legal action, support. NO bold.",
        "details": [
          {"label": "Victims", "value": "Victim party information"}
        ]
        // 2-3 label-value pairs with NEW information not in summary
      }
    ]
  },
  
  "timeline": [
    {
      "date": "March 15, 2024",
      "context": "15-25 words",
      "events": [
        {
          "time": "2:30 PM",
          "description": "150-200 words: complete actions/sequence, people/roles, location/venue, evidence/items, witness statements, medical procedures, legal filings, monetary amounts, official responses, quotes, conditions, factors, aftermath.",
          "participants": "Complete list: Name (Role, Age, Occupation)",
          "evidence": "Exhaustive list with specifics"
        }
      ]
      // Critical dates: 4-6 events | Significant dates: 4-6 events | Routine dates: 1-2 events
    }
  ]
  // Chronological order, one entry per date mentioned
}

SOURCES:
${topSnippets}

ARTICLE:
${articleContent}

Return ONLY JSON starting with { and ending with }.`;
}