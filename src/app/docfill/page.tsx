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
              Smart document builder for JobTread
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
        </section>

        {/* Install — Primary: Tampermonkey */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-orange-500">Install in 2 Steps</h2>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5">
            <div className="flex gap-4">
              <span className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 font-bold text-lg flex items-center justify-center shrink-0">1</span>
              <div className="space-y-2">
                <p className="text-white font-semibold text-base">Install Tampermonkey (free, one time)</p>
                <p className="text-neutral-400 text-sm">Tampermonkey is a trusted browser extension used by millions. It lets you run scripts like DocFill.</p>
                <a
                  href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:border-orange-500 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Get Tampermonkey (Chrome Web Store)
                </a>
              </div>
            </div>

            <div className="border-t border-neutral-800" />

            <div className="flex gap-4">
              <span className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 font-bold text-lg flex items-center justify-center shrink-0">2</span>
              <div className="space-y-2">
                <p className="text-white font-semibold text-base">Click to install DocFill</p>
                <p className="text-neutral-400 text-sm">
                  Tampermonkey will pop up asking to confirm. Click &ldquo;Install&rdquo; and you&apos;re done.
                  Updates happen automatically.
                </p>
                <a
                  href="/betterboss-docfill.user.js"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/20"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Install Better Boss DocFill
                </a>
              </div>
            </div>
          </div>

          <p className="text-neutral-500 text-sm text-center">
            That&apos;s it. Open any job or document in <a href="https://app.jobtread.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">JobTread</a> and look for the orange <strong className="text-white">BB</strong> button.
          </p>
        </section>

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-orange-500">How It Works</h2>
          <ol className="space-y-4 text-neutral-300">
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                Navigate to any <strong className="text-white">job, proposal, contract, or document</strong> in JobTread.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                Click the orange <strong className="text-white">BB</strong> button in the bottom-right corner.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                Fill in client details (or let DocFill auto-detect them). Your business profile fills in automatically.
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center shrink-0">4</span>
              <div>
                Click <strong className="text-white">&ldquo;Copy Description&rdquo;</strong> or <strong className="text-white">&ldquo;Copy Footer&rdquo;</strong> and paste into JobTread. Done.
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
              ['Auto-Updates', 'Updates deploy instantly to everyone — no reinstalls, no Chrome Web Store review delays.'],
              ['Built for Contractors', 'Default SOW template covers the full 20-section implementation agreement with financing terms.'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="font-bold text-white mb-1">{title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Manual fallback */}
        <section className="space-y-3">
          <details className="group">
            <summary className="text-neutral-500 text-sm cursor-pointer hover:text-neutral-400 transition-colors">
              Prefer a standalone Chrome extension? (Advanced)
            </summary>
            <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3 text-sm text-neutral-400">
              <p>You can also install DocFill as a standalone Chrome extension:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Download the <a href="/betterboss-docfill-extension.zip" download className="text-orange-500 hover:text-orange-400">extension ZIP</a> and unzip it</li>
                <li>Go to <code className="bg-neutral-800 text-orange-400 px-1.5 py-0.5 rounded text-xs">chrome://extensions</code></li>
                <li>Enable <strong className="text-white">Developer mode</strong> (top-right toggle)</li>
                <li>Click <strong className="text-white">&ldquo;Load unpacked&rdquo;</strong> and select the unzipped folder</li>
              </ol>
              <p className="text-neutral-500 text-xs">Note: The standalone extension doesn&apos;t auto-update. You&apos;ll need to re-download for new versions.</p>
            </div>
          </details>
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
