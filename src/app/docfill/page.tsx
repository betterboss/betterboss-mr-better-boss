const features = [
  { icon: 'user', title: 'Business Profile', desc: 'Set up once — your company name, phone, email, license & address auto-fill into every document.', accent: 'indigo' },
  { icon: 'copy', title: 'Copy All', desc: 'Copy description, footer, or everything at once. Paste directly into JobTread. No retyping.', accent: 'violet' },
  { icon: 'file', title: 'Multi-Template Library', desc: 'Switch between proposal, contract, change order, and SOW templates instantly. Create unlimited custom templates.', accent: 'indigo' },
  { icon: 'upload', title: 'Snippets & Custom Vars', desc: 'Save reusable text blocks. Add custom variables for project managers, estimators, and more.', accent: 'violet' },
  { icon: 'trend', title: 'Keyboard Shortcuts', desc: 'Ctrl+Shift+B to toggle, Ctrl+Shift+D to copy description, Ctrl+Shift+F for footer. Speed is everything.', accent: 'indigo' },
  { icon: 'home', title: 'Built for Contractors', desc: 'Pre-built templates for proposals, change orders, SOWs, and more. Export/import to share across your team.', accent: 'violet' },
] as const;

const FeatureIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    copy: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    file: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    upload: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    trend: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  };
  return <>{icons[type]}</>;
};

export default function DocFillPage() {

  return (
    <div className="min-h-screen text-[#c8cdd8] font-sans" style={{ background: '#06060f' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-100" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', animation: 'float-orb 12s ease-in-out infinite' }} />
        <div className="absolute -top-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-100" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', animation: 'float-orb 15s ease-in-out infinite reverse' }} />
      </div>

      <style>{`
        @keyframes float-orb { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.95); } }
        @keyframes shimmer-text { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes glow-box { 0%,100% { box-shadow: 0 0 20px rgba(99,102,241,0.12), 0 0 60px rgba(99,102,241,0.04); } 50% { box-shadow: 0 0 30px rgba(99,102,241,0.25), 0 0 80px rgba(99,102,241,0.08); } }
        @keyframes float-up { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes count-pop { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* Header */}
      <header className="relative z-10 pt-16 pb-10">
        <div className="max-w-[920px] mx-auto px-7 flex items-center gap-6">
          <div className="relative shrink-0">
            <div
              className="w-[76px] h-[76px] rounded-[20px] flex items-center justify-center text-white font-black text-[28px] tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 40px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                animation: 'float-up 5s ease-in-out infinite',
              }}
            >
              BB
            </div>
            <div
              className="absolute -inset-[5px] rounded-[24px] pointer-events-none"
              style={{ border: '2px solid rgba(99,102,241,0.25)', animation: 'pulse-ring 3s ease-out infinite' }}
            />
          </div>
          <div>
            <h1 className="text-[40px] font-black text-white leading-none tracking-[-0.03em]">
              Better Boss{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa, #c4b5fd, #818cf8)',
                  backgroundSize: '300% auto',
                  animation: 'shimmer-text 4s linear infinite',
                }}
              >
                DocFill
              </span>
            </h1>
            <p className="text-[#6b7280] text-[15px] mt-2 font-medium">
              <span className="text-[#a78bfa] mr-1">&#9889;</span>
              Smart document automation for JobTread &mdash; Better Starts Now
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[920px] mx-auto px-7 pb-16">
        {/* Headline */}
        <section className="text-center mb-16">
          <h2 className="text-[36px] font-extrabold text-white leading-[1.2] tracking-[-0.02em] max-w-[700px] mx-auto mb-5">
            Auto-generate proposals, contracts &amp; SOWs{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #818cf8, #a78bfa)' }}>
              inside JobTread
            </span>
          </h2>
          <p className="text-[18px] text-[#8891a5] leading-relaxed max-w-[620px] mx-auto">
            Stop retyping the same contract language. Set up your business profile once, then instantly generate perfectly formatted documents. One click. Done.
          </p>
        </section>

        {/* Stats */}
        <section className="flex justify-center gap-14 py-10 mb-16 relative" style={{ borderTop: '1px solid rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'linear-gradient(180deg, rgba(99,102,241,0.02) 0%, transparent 100%)' }}>
          <div className="absolute top-[-1px] left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
          {[
            { num: '4 min', label: 'Per Document' },
            { num: '600+', label: 'Hours Saved / Year' },
            { num: '100%', label: 'Free to Use' },
          ].map((s, i) => (
            <div key={s.label} className="text-center" style={{ animation: `count-pop 0.5s ease-out ${0.3 + i * 0.15}s both` }}>
              <div className="text-[40px] font-black leading-none bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #6366f1)' }}>
                {s.num}
              </div>
              <div className="text-[12px] text-[#6b7280] font-bold uppercase tracking-[0.1em] mt-1.5">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Demo */}
        <section className="mb-16">
          <div className="rounded-[24px] p-[3px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1), rgba(99,102,241,0.05))', animation: 'glow-box 5s ease-in-out infinite' }}>
            <div className="rounded-[22px] py-12 px-10 text-center" style={{ background: 'linear-gradient(180deg, #0d0d1a 0%, #0a0a14 100%)' }}>
              <div className="flex justify-center items-center gap-9 flex-wrap">
                {/* JobTread screen */}
                <div className="w-[260px] h-[170px] rounded-[14px] flex flex-col items-center justify-center gap-1.5 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="absolute top-0 inset-x-0 h-[30px]" style={{ background: 'rgba(20,20,40,0.8)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    <div className="absolute top-[9px] left-3 flex gap-[5px]">
                      <span className="w-[7px] h-[7px] rounded-full bg-red-500" />
                      <span className="w-[7px] h-[7px] rounded-full bg-amber-500" />
                      <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="text-[15px] font-bold text-[#818cf8] mt-3.5">JobTread</div>
                  <div className="flex flex-col gap-[5px] mt-2.5 w-[55%]">
                    <div className="h-[5px] rounded-full w-[90%]" style={{ background: 'rgba(99,102,241,0.15)' }} />
                    <div className="h-[5px] rounded-full w-[65%]" style={{ background: 'rgba(99,102,241,0.1)' }} />
                    <div className="h-[5px] rounded-full w-[80%]" style={{ background: 'rgba(99,102,241,0.08)' }} />
                  </div>
                  <div className="text-[10px] font-bold text-[#4b5563] uppercase tracking-[0.1em] mt-2.5">Your Job</div>
                </div>

                {/* Arrow */}
                <div className="text-[32px] text-[#6366f1]" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.4))' }}>&#10230;</div>

                {/* DocFill screen */}
                <div className="w-[260px] h-[170px] rounded-[14px] flex flex-col items-center justify-center gap-1 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="absolute top-0 inset-x-0 h-[30px]" style={{ background: 'rgba(20,20,40,0.8)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    <div className="absolute top-[9px] left-3 flex gap-[5px]">
                      <span className="w-[7px] h-[7px] rounded-full bg-red-500" />
                      <span className="w-[7px] h-[7px] rounded-full bg-amber-500" />
                      <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="text-[28px] font-black mt-3.5 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>BB</div>
                  <div className="text-[11px] text-[#6b7280] tracking-[0.05em]">DocFill</div>
                  <div className="text-[11px] text-emerald-500 font-bold mt-2 tracking-[0.03em]">&#10003; Auto-Generated</div>
                  <div className="text-[10px] font-bold text-[#4b5563] uppercase tracking-[0.1em] mt-2">Your Document</div>
                </div>
              </div>
              <p className="text-[15px] text-[#6b7280] mt-7">DocFill reads your job data and <strong className="text-[#c8cdd8]">auto-generates</strong> professional proposals, contracts &amp; SOWs.</p>
            </div>
          </div>
        </section>

        {/* Install */}
        <section className="mb-16">
          <p className="text-center text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#818cf8] mb-6">
            &#9889; Get Started in 30 Seconds
          </p>

          <div className="rounded-[22px] p-9 text-center" style={{ background: 'linear-gradient(180deg, rgba(17,17,35,0.7), rgba(10,10,20,0.85))', border: '1px solid rgba(99,102,241,0.12)', animation: 'glow-box 5s ease-in-out infinite' }}>
            <p className="text-[22px] font-extrabold text-white mb-2">Drag this button to your bookmarks bar:</p>
            <p className="text-[14px] text-[#8891a5] mb-7">No installs. No extensions. Just drag &amp; drop.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href={"javascript:void((function(){if(window.__bbDocFillToggle){window.__bbDocFillToggle();return}window.__bbDocFillBookmarklet=true;var s=document.createElement('script');s.src='https://better-boss.ai/betterboss-docfill.user.js?t='+Date.now();document.head.appendChild(s)})())"}
              className="inline-flex items-center gap-3 text-white font-extrabold px-11 py-5 rounded-[16px] text-[20px] transition-all hover:-translate-y-0.5 hover:scale-[1.02] select-none"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.35), 0 0 0 1px rgba(99,102,241,0.1)',
                letterSpacing: '-0.01em',
                cursor: 'grab',
              }}
              draggable
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              BB DocFill
            </a>
            <div className="flex items-center justify-center gap-2 text-[14px] text-[#818cf8] font-semibold mt-4">
              <span className="text-[20px]" style={{ animation: 'float-up 1.2s ease-in-out infinite alternate' }}>&#8593;</span>
              Drag it up to your bookmarks bar
            </div>
          </div>

          <p className="text-center text-[#6b7280] text-[14px] mt-6">
            Then open any job in{' '}
            <a href="https://app.jobtread.com" target="_blank" rel="noopener noreferrer" className="text-[#818cf8] font-semibold hover:text-[#a78bfa]">JobTread</a>
            {' '}and click <strong className="text-white">BB DocFill</strong> in your bookmarks bar. That&apos;s it!
          </p>
        </section>

        {/* Chrome Extension Download */}
        <section className="mb-16">
          <p className="text-center text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#a78bfa] mb-6">
            Chrome Extension
          </p>
          <div className="rounded-[22px] p-9" style={{ background: 'linear-gradient(180deg, rgba(17,17,35,0.5), rgba(10,10,20,0.7))', border: '1px solid rgba(99,102,241,0.08)' }}>
            <div className="flex items-start gap-8 flex-wrap justify-center">
              <div className="flex-1 min-w-[260px]">
                <h3 className="text-[20px] font-extrabold text-white mb-3">Self-Hosted Extension</h3>
                <p className="text-[14px] text-[#8891a5] leading-relaxed mb-5">
                  Full Chrome extension with multi-template engine, snippets, keyboard shortcuts, and cloud sync.
                  Hosted on <strong className="text-white">better-boss.ai</strong> &mdash; no Chrome Web Store needed.
                </p>
                <ol className="text-[13px] text-[#8891a5] leading-relaxed space-y-2 mb-6">
                  <li><span className="text-[#818cf8] font-bold">1.</span> Download the extension zip below</li>
                  <li><span className="text-[#818cf8] font-bold">2.</span> Open <code className="bg-[rgba(99,102,241,0.08)] px-1.5 py-0.5 rounded text-[#818cf8] text-[12px]">chrome://extensions</code> in your browser</li>
                  <li><span className="text-[#818cf8] font-bold">3.</span> Enable <strong className="text-white">Developer Mode</strong> (top right toggle)</li>
                  <li><span className="text-[#818cf8] font-bold">4.</span> Drag the .zip file onto the page &mdash; or click <strong className="text-white">Load unpacked</strong> and select the extracted folder</li>
                </ol>
                <a
                  href="/betterboss-docfill-extension.zip"
                  download="better-boss-docfill-extension.zip"
                  className="inline-flex items-center gap-2.5 text-white font-extrabold text-[16px] px-8 py-4 rounded-[12px] transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Extension v2.0
                </a>
              </div>
              <div className="w-[200px] text-center shrink-0">
                <div className="w-[100px] h-[100px] rounded-[24px] flex items-center justify-center text-white font-black text-[36px] mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
                  BB
                </div>
                <p className="text-[12px] text-[#6b7280] font-bold uppercase tracking-[0.08em]">v2.0.0</p>
                <div className="mt-3 space-y-1 text-[11px] text-[#52525b]">
                  <p>Multi-templates</p>
                  <p>Snippets</p>
                  <p>Cloud Sync</p>
                  <p>Keyboard Shortcuts</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <div className="text-center mb-9">
            <h2 className="text-[30px] font-extrabold text-white tracking-[-0.02em]">
              How It <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #818cf8, #a78bfa)' }}>Works</span>
            </h2>
            <p className="text-[15px] text-[#6b7280] mt-2">From job page to finished document in 3 steps</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Open a Job', desc: 'Navigate to any job, proposal, or contract in JobTread.' },
              { n: '2', title: 'Click BB DocFill', desc: 'Click the BB DocFill bookmark in your bookmarks bar. The panel appears instantly.' },
              { n: '3', title: 'Copy & Paste', desc: 'DocFill auto-generates your document. Click "Copy" and paste into JobTread. Done.' },
            ].map(step => (
              <div
                key={step.n}
                className="rounded-[18px] p-7 text-center transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, rgba(17,17,35,0.6), rgba(10,10,20,0.8))', border: '1px solid rgba(99,102,241,0.08)' }}
              >
                <div className="w-[44px] h-[44px] rounded-xl flex items-center justify-center text-white font-extrabold text-[17px] mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 6px 20px rgba(99,102,241,0.3)' }}>
                  {step.n}
                </div>
                <h4 className="text-[15px] font-bold text-white mb-2">{step.title}</h4>
                <p className="text-[13px] text-[#8891a5] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <div className="text-center mb-9">
            <h2 className="text-[30px] font-extrabold text-white tracking-[-0.02em]">
              What You <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #818cf8, #a78bfa)' }}>Get</span>
            </h2>
            <p className="text-[15px] text-[#6b7280] mt-2">Everything you need to automate your JobTread documents</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <div
                key={f.title}
                className="rounded-[18px] p-[30px] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                style={{ background: 'linear-gradient(180deg, rgba(17,17,35,0.5), rgba(10,10,20,0.7))', border: '1px solid rgba(99,102,241,0.08)' }}
              >
                <div
                  className="w-[46px] h-[46px] rounded-xl flex items-center justify-center mb-[18px]"
                  style={{
                    background: f.accent === 'indigo'
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))'
                      : 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(167,139,250,0.04))',
                    color: f.accent === 'indigo' ? '#818cf8' : '#a78bfa',
                    border: f.accent === 'indigo' ? '1px solid rgba(99,102,241,0.08)' : '1px solid rgba(167,139,250,0.08)',
                  }}
                >
                  <FeatureIcon type={f.icon} />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#8891a5] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="mb-16">
          <div className="rounded-[24px] py-11 px-10 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(17,17,35,0.5), rgba(10,10,20,0.7))', border: '1px solid rgba(99,102,241,0.1)' }}>
            <div className="absolute inset-0 rounded-[24px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.04) 0%, transparent 60%)' }} />
            <div className="text-[20px] font-medium text-[#e0e2ea] leading-relaxed italic max-w-[560px] mx-auto mb-6 relative">
              <span className="block not-italic font-black text-[56px] leading-[0.4] mb-4 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>&ldquo;</span>
              DocFill literally cut my proposal time from 30 minutes down to 4. I just open the job, click the button, and paste. Game changer.
            </div>
            <div className="text-[15px] font-bold text-white relative">Better Boss Client</div>
            <div className="text-[13px] text-[#6b7280] mt-1 relative">Roofing Contractor &middot; Denver, CO</div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-16">
          <div className="rounded-[28px] py-16 px-10 text-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(17,17,35,0.7), rgba(10,10,20,0.9))', border: '1px solid rgba(99,102,241,0.1)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 130%, rgba(99,102,241,0.06) 0%, transparent 50%)' }} />
            <div className="absolute top-0 left-[10%] right-[10%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
            <h2 className="text-[32px] font-extrabold text-white mb-3 relative tracking-[-0.02em]">Ready to Work Smarter?</h2>
            <p className="text-[17px] text-[#8891a5] mb-8 relative">Need a custom template or want the full Better Boss experience?</p>
            <a
              href="https://better-boss.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-white font-extrabold text-[18px] px-10 py-[18px] rounded-[16px] transition-all hover:-translate-y-0.5 relative"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 8px 32px rgba(99,102,241,0.35)', letterSpacing: '-0.01em' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Visit Better-Boss.ai
            </a>
            <p className="text-[14px] text-[#6b7280] mt-6 relative">
              Questions? Call <a href="tel:7206369500" className="text-[#818cf8] font-semibold hover:text-[#a78bfa]">(720) 636-9500</a> or{' '}
              <a href="https://better-boss.ai" target="_blank" rel="noopener noreferrer" className="text-[#818cf8] font-semibold hover:text-[#a78bfa]">Book a Free Growth Audit</a>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-9" style={{ borderTop: '1px solid rgba(99,102,241,0.06)' }}>
        <p className="text-[12px] text-[#374151]">
          Better Boss DocFill v2.0 &middot; Built by{' '}
          <a href="https://better-boss.ai" target="_blank" rel="noopener noreferrer" className="text-[#4b5563] hover:text-[#818cf8] transition-colors">Better Boss</a>
          {' '}&middot;{' '}
          <a href="https://better-boss.ai" target="_blank" rel="noopener noreferrer" className="text-[#4b5563] hover:text-[#818cf8] transition-colors">better-boss.ai</a>
        </p>
        <p className="text-[11px] text-[#4b5563] font-semibold uppercase tracking-[0.1em] mt-2">
          America&apos;s #1 AI Automation for Contractors &#9889;
        </p>
      </footer>
    </div>
  );
}
