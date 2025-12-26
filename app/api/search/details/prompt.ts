export function buildAnalysisPrompt(query: string, articleContent: string, topSnippets: string): string {
  return `Extract ALL verified facts: "${query}"

SOURCES:
${topSnippets}

${articleContent}

JSON OUTPUT:
{
  "location": "City, State/Country - specific venue/address",
  "details": {
    "headline": "15-25 word factual lead",
    "overview": "400-500 word comprehensive narrative with **important terms** highlighted. Cover complete story: full context, all parties with roles, circumstances, immediate consequences, current status, broader impact. Highlight 2-3 words at once: **term here**. Examples: **15 criminal charges**, **Senior Inspector Patil**, **Rs 2,00,000 compensation**.",
    "keyPoints": [
      {"label": "Choose concise 1-3 word label", "value": "Complete detailed information"},
      "Continue with 8-15 points covering ALL aspects not in overview"
    ]
  },
  "accused": [
    {
      "summary": "2-3 sentences maximum: full identification (name, age, occupation, affiliation, location), role in event, specific actions attributed. Dense and comprehensive.",
      "details": [
        {"label": "Choose appropriate label", "value": "Exhaustive information with specifics"},
        "4-10 label-value pairs covering ALL facts about this person not in summary"
      ]
    }
  ],
  "victims": [
    {
      "summary": "2-3 sentences maximum: full identification (name if public, age, gender, occupation, location), relationship to accused/event, harm suffered. Dense and comprehensive.",
      "details": [
        {"label": "Choose appropriate label", "value": "Exhaustive information with specifics"},
        "4-10 label-value pairs covering ALL facts about this person not in summary"
      ]
    }
  ],
  "timeline": [
    {
      "date": "Month Day, Year",
      "summary": "12-20 words describing date significance",
      "events": [
        {"time": "Exact time or period", "description": "60-100 words: who, what actions, where, evidence, legal filings, witness statements, forensics, medical details, amounts, responses"},
        "6-15 events per date (10-15 for critical dates: incident/arrest/trial/verdict/sentencing; 6-10 for regular)"
      ]
    }
  ]
}

CRITICAL RULES:

EXTRACT ONLY FROM SOURCES: Never invent, assume, or fabricate. If information not explicitly in sources, DO NOT include.

OVERVIEW: 400-500 word flowing narrative. Use **bold** for important terms (2-3 words): names, charges, amounts, dates, locations. Tell complete story chronologically.

KEY POINTS: 8-15 label-value pairs. Each reveals DIFFERENT information not in overview. Choose natural, descriptive labels (1-3 words) that fit the content. Values must be comprehensive with full context, specifics, evidence. Cover different dimensions: legal, financial, organizational, personal, investigative, medical, social impact.

PARTIES: Create separate object for EACH accused/victim. Include individuals, companies, organizations, groups, crowds, communities, or property as applicable.

SUMMARIES: Exactly 2-3 sentences. Pack maximum information: who they are, background, their role, their actions, impact on them or by them.

DETAILS: 4-10 label-value pairs per party adding NEW facts not in summary. Choose intelligent labels that describe the content (not generic). Values exhaustive with: exact numbers, full names/titles/ranks/badges, statute codes/sections, amounts with currency, precise dates/times, complete addresses, medical procedures/diagnoses/facilities, case numbers/dockets, direct quotes, forensic findings, witness accounts.

TIMELINE: Create entry for EVERY date mentioned. 6-15 events per date depending on significance. Each event: specific time (or period) + 60-100 word description with full details of what happened, who was involved, where, evidence collected, statements made, procedures done, amounts involved.

PRECISION: Use exact numbers with full precision. Complete legal names. Official titles and ranks. Statute sections. Medical terminology. Case numbers. Addresses. Currency symbols.

COMPREHENSIVENESS: Extract EVERY name, company, organization, group, location, amount, date, time, charge, statute, piece of evidence, injury, medical term, treatment, legal proceeding, witness statement, official statement, forensic finding, sentence, bail amount, fine, organizational response, community impact mentioned in sources. Process chronologically: analyze oldest sources first for background context, then layer developments from newer sources.

NO REPETITION: Each fact appears ONCE in the most logical section. If mentioned in overview, don't repeat in keyPoints. If in summary, don't repeat in details. If in one detail, don't include in another.

INTELLIGENCE: Choose labels that accurately describe the specific information. Don't use same label twice within a section. Make labels meaningful and contextual to the content.

OUTPUT: Valid JSON only. Proper string escaping for quotes. No markdown formatting in output. No preamble or explanation.`;
}