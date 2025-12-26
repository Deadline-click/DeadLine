export function buildAnalysisPrompt(query: string, articleContent: string, topSnippets: string): string {
  return `Extract verified facts about: "${query}"

Return ONLY valid JSON (no markdown, no code blocks, no text). Start with { and end with }.

{
  "title": "30-40 word title: Include all accused names/organizations OR count if 3+. Include all victim names OR count if 3+. Specify what happened.",
  "headline": "25-35 word punchy headline: Lead with the most newsworthy element. Use active voice and strong verbs. Format like a news headline with impact. NO location.",
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
        "name": "Full accurate organization name (include count if group, e.g., '5 Officers from XYZ Department')",
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
        "name": "Accurate group description (include count, e.g., '12 Students from ABC School')",
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

EXTRACTION REQUIREMENTS:

Extract every fact, date, name, number, quote from sources.

Title must be 30-40 words and list all accused/victim names if 1-2 each, OR state count if 3+ (e.g., "5 Police Officers Accused in Assault of 3 Minors"). Specify incident type clearly.

Headline must be 25-35 words formatted as a compelling news headline. Lead with the most impactful element using active voice and strong verbs. Capture attention like front-page news. NO location information.

Location requires complete address hierarchy from venue to country.

Overview must be 600-800 words in single paragraph format with **bold** used 2-3 times maximum for critical terms only.

Key Points must contain 10-15 NEW facts not already mentioned in overview.

Every accused/victim entry MUST have "name" as the first field with accurate spelling. For groups in accused organizations or victim groups, include the count in the name field (e.g., "5 Officers from City Police" or "12 Students from Springfield High").

Summaries must be exactly 4-6 sentences with NO bold formatting whatsoever.

Details must use "Accused"/"Victim"/"Victims" as labels with values containing party-specific information. Include 5-8 label-value pairs with NEW information not in summary.

Timeline requires one entry per date mentioned in chronological order. Critical dates need 15-25 events, significant dates need 10-15 events, routine dates need 5-8 events.

Use exact numbers, complete names/titles, full statute sections, exact currency symbols (₹, Rs, $), and precise timestamps throughout.

Each fact should appear only once in its most logical location.

Bold formatting only allowed in overview using **text** format, limited to 2-3 instances maximum.

Escape all quotes with backslash.

ONLY include label-value pairs for information that IS available in the sources - skip any fields where information is not mentioned.

SOURCES:
${topSnippets}

ARTICLE:
${articleContent}

Return ONLY JSON starting with { and ending with }.`;
}