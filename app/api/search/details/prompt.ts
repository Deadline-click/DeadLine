export function buildAnalysisPrompt(query: string, articleContent: string, topSnippets: string): string {
  return `Extract verified facts about: "${query}"

Return ONLY valid JSON (no markdown, no code blocks, no text). Start with { and end with }.

{
  "title": "30-40 word descriptive title with accurate names (if multiple accused/victims, mention count)",
  "headline": "20-30 word headline (no location)",
  "location": "Complete address: venue, area, city, district, state, country",
  "details": {
    "overview": "600-800 word narrative. Use **bold** 2-3 times max for critical terms (2-3 words each). Cover: background, parties, chronology, consequences, legal proceedings, status, implications.",
    "keyPoints": [
      {"label": "1-2 words", "value": "Max 10 words with exact facts"}
    ]
  },
  "accused": {
    "individuals": [
      {
        "name": "Full accurate name",
        "summary": "4-6 sentences: name/aliases, age, occupation/employer, address, role in incident, actions/timeline, relationship to victims, family/criminal history, custody status. NO bold.",
        "details": [
          {"label": "Accused", "value": "Accused party information"}
        ]
      }
    ],
    "organizations": [
      {
        "name": "Full accurate organization name",
        "summary": "4-6 sentences: name/registration, type/industry, jurisdiction, leadership, role, actions/failures, relationship, violations, history, response. NO bold.",
        "details": [
          {"label": "Accused", "value": "Accused party information"}
        ]
      }
    ]
  },
  "victims": {
    "individuals": [
      {
        "name": "Full accurate name or description",
        "summary": "4-6 sentences: name/description, age/gender, occupation/workplace, address, relationship to accused, harm/injuries, treatment/hospital, condition/prognosis, family impact, compensation. NO bold.",
        "details": [
          {"label": "Victim", "value": "Victim party information"}
        ]
      }
    ],
    "groups": [
      {
        "name": "Accurate group description",
        "summary": "4-6 sentences: size/demographics, composition, location/community, relationship, collective harm, impact, legal action, support. NO bold.",
        "details": [
          {"label": "Victims", "value": "Victim party information"}
        ]
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
    }
  ]
}

RULES:

1. Extract every fact, date, name, number, quote from sources
2. Title: 30-40 words with accurate names; if multiple accused/victims, mention count (e.g., "3 accused")
3. Headline: Who did what to whom and outcome (NO location)
4. Location: Complete address hierarchy
5. Overview: 600-800 words, single paragraph, **bold** 2-3 times only
6. Key Points: 10-15 NEW facts not in overview
7. Each accused/victim entry MUST have "name" as first field with accurate spelling
8. Summaries: Exactly 4-6 sentences, NO bold formatting
9. Details: Use "Accused"/"Victim"/"Victims" as labels, values contain party-specific information. 5-8 pairs with NEW info not in summary
10. Timeline: Entry per date mentioned, chronological. Critical dates: 15-25 events, significant: 10-15, routine: 5-8
11. Use exact numbers, complete names/titles, full statute sections, exact currency (₹, Rs, $), precise timestamps
12. Each fact appears once in most logical location
13. Bold only in overview: **text** format (2-3 times max)
14. Escape quotes with backslash
15. ONLY include label-value pairs for information that IS available - skip if not mentioned in sources

SOURCES:
${topSnippets}

ARTICLE:
${articleContent}

Return ONLY JSON starting with { and ending with }.`;
}