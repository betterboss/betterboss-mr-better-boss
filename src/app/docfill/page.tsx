export default function DocFillPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl shrink-0">
            BB
          </div>
          <div>
            <h1 className="text-3xl font-bold">Better Boss <span className="text-orange-500">DocFill</span></h1>
            <p className="text-neutral-500 text-sm mt-1">
              Chrome Extension &middot; Smart document builder for JobTread
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Auto-generate proposals, contracts &amp; SOWs inside JobTread</h2>
          <p className="text-neutral-400 leading-relaxed">
            Stop retyping the same contract language. DocFill lets you set up your business profile once,
            then instantly generates perfectly formatted descriptions and footers for every document.
            Just copy and paste.
          </p>
          <a
            href="/betterboss-docfill-extension.zip"
            download
            className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Extension (.zip)
          </a>
        </section>

        {/* Install Steps */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-orange-500">Install in 60 Seconds</h2>
          <ol className="space-y-4 text-neutral-300">
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <strong className="text-white">Download</strong> the ZIP file above and <strong className="text-white">unzip</strong> it anywhere on your computer.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                Open Chrome and go to <code className="bg-neutral-800 text-orange-400 px-2 py-0.5 rounded text-sm">chrome://extensions</code>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                Turn on <strong className="text-white">Developer mode</strong> (top-right toggle).
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">4</span>
              <div>
                Click <strong className="text-white">&ldquo;Load unpacked&rdquo;</strong> and select the <code className="bg-neutral-800 text-orange-400 px-2 py-0.5 rounded text-sm">extension</code> folder inside the unzipped directory.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">5</span>
              <div>
                The settings page opens automatically &mdash; <strong className="text-white">fill in your business profile</strong> and you&apos;re ready.
              </div>
            </li>
          </ol>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-orange-500">What You Get</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ['Business Profile', 'Set up once — your company name, phone, email, license, and address auto-fill into every document.'],
              ['Copy & Paste', 'Click "Copy Description" or "Copy Footer" and paste directly into JobTread fields. No wrong field injection.'],
              ['Custom Templates', 'Full template editor with variables like {{bizName}}, {{company}}, {{jobNumber}}. Conditional blocks supported.'],
              ['Export / Import', 'Back up your profile and templates. Share across machines or team members with a JSON file.'],
              ['Works Everywhere', 'Auto-detects proposals, contracts, estimates, invoices, change orders, work orders, and more.'],
              ['Built for Contractors', 'Default SOW template covers the full 20-section implementation agreement with financing terms.'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="font-bold text-white mb-1">{title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8 border-t border-neutral-800">
          <p className="text-neutral-500 mb-4">Questions? Need a custom template built for your business?</p>
          <a
            href="https://mybetterboss.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 font-bold hover:text-orange-400 transition-colors"
          >
            Visit mybetterboss.ai &rarr;
          </a>
        </section>
      </main>

      <footer className="border-t border-neutral-800 text-center text-neutral-600 text-xs py-6">
        Better Boss DocFill v1.0 &middot; Built by Better Boss &middot; mybetterboss.ai
      </footer>
    </div>
  );
}
