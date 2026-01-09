'use client';

import Link from 'next/link';

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black bg-white sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    if (window.history.length > 1 && document.referrer.includes(window.location.hostname)) {
                      window.history.back();
                    } else {
                      window.location.href = '/';
                    }
                  }
                }}
                className="text-black hover:opacity-70 transition-opacity flex items-center cursor-pointer"
                title="Go back"
                aria-label="Go back"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <Link
                href="/"
                className="text-xl font-black tracking-tight uppercase text-black hover:opacity-80 transition-opacity" 
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                title="DEADLINE - Museum of Temporary Truths"
                aria-label="DEADLINE - Museum of Temporary Truths Homepage"
              >
                DEADLINE
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          POLICIES
        </h1>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Data Privacy
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                DEADLINE operates without collecting or storing personal user data. We maintain no login system, user accounts, or registration mechanisms. Privacy protection is embedded in our platform architecture by design.
              </p>
              <p>
                We utilize Vercel Analytics to monitor platform usage patterns. This service collects anonymized usage statistics that inform platform improvements. No personally identifiable information is captured or retained through this analytics implementation.
              </p>
              <p>
                Our platform operates without cookies, tracking pixels, or auxiliary data collection systems beyond the anonymous analytics provided by Vercel infrastructure.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              News Documentation Methodology
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                DEADLINE functions as a systematic news archival and documentation infrastructure. We aggregate information from verified sources, conducting comprehensive analysis to maintain structured records accessible to the public.
              </p>
              <p>
                Our documentation methodology encompasses information gathering from diverse news organizations, official governmental reports, public records, and verified sources. We implement cross-referencing protocols across multiple sources to ensure documentation accuracy and completeness.
              </p>
              <p>
                Each documented event maintains complete citations with direct links to source materials, enabling independent verification and primary source access for all users.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Information Sources
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                Our information acquisition spans multiple categories of verified sources:
              </p>
              <ul className="list-none space-y-1.5 pl-0">
                <li>• National and regional news publications</li>
                <li>• International news agencies and wire services</li>
                <li>• Government reports and official statements</li>
                <li>• Court documents and legal proceedings</li>
                <li>• Academic research publications and studies</li>
                <li>• Human rights organizations and NGO documentation</li>
                <li>• Local journalism and community news outlets</li>
                <li>• Official press releases and institutional communications</li>
                <li>• Public records and freedom of information disclosures</li>
              </ul>
              <p>
                All sources receive proper citation and linking within documented events. We maintain rigorous standards for source credibility and verifiability while ensuring complete transparency regarding information origins.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Disclaimer
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                DEADLINE presents aggregated information derived from various sources. We assume no responsibility for the accuracy, completeness, or reliability of original source materials.
              </p>
              <p>
                This platform operates as a documentation and archival system. Information presented serves informational and archival purposes exclusively, compiled from publicly accessible sources.
              </p>
              <p>
                Users bear responsibility for independent verification of information and consultation of original sources before making decisions based on presented content.
              </p>
              <p>
                DEADLINE maintains strict neutrality. We neither endorse nor oppose individuals, organizations, or viewpoints referenced in documented events. Our documentation process remains impartial and objective.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Updates and Corrections
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                We maintain comprehensive update logs for each documented event. Upon receiving new information or identifying necessary corrections, we implement documentation updates with clear timestamp markers.
              </p>
              <p>
                Update logs document the modification date, change nature, and information sources. This protocol ensures documentation transparency and enables users to track information evolution across time.
              </p>
              <p>
                Concerns regarding documentation accuracy or completeness should be directed to our report page, accompanied by supporting evidence and source citations.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Content Usage
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                Documentation and compilations on DEADLINE serve educational, research, and informational objectives. Users are encouraged to cite original sources when referencing platform information.
              </p>
              <p>
                While we organize and structure publicly available information, underlying content remains subject to original publishers' copyrights and terms of use.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-black mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Contact
            </h2>
            <div className="space-y-3 text-black font-mono text-sm leading-relaxed text-justify">
              <p>
                Questions, concerns, or submissions regarding policies, documentation processes, or specific events may be directed to our report page or through channels listed on our about page.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-black bg-white mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight mb-4 text-black" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>DEADLINE</h2>
            <p className="text-sm font-normal text-black tracking-wide font-mono mb-6">
              Museum of Temporary Truths
            </p>
            <nav className="flex justify-center gap-8 text-sm font-mono mb-8" aria-label="Footer navigation">
              <a href="/about" className="text-black hover:underline" title="About DEADLINE - Our Mission">About</a>
              <a href="/report" className="text-black hover:underline" title="Report a Story">Report</a>
              <a href="/policies" className="text-black hover:underline" title="Our Policies">Policies</a>
              <a href="/donate" className="text-black hover:underline" title="Support Our Work">Donate</a>
            </nav>
            <p className="text-xs text-gray-600 font-mono">
              © {new Date().getFullYear()} DEADLINE. Documenting lives that matter.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}