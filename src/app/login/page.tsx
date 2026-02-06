'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('jobtread-credentials', {
        email,
        apiKey,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Please check your API key and try again.');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 bg-grid-pattern">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-boss-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-boss-500 to-boss-600 shadow-lg shadow-boss-500/30 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Better<span className="text-gradient">Boss</span> Sidebar
          </h1>
          <p className="text-dark-400 text-sm">
            AI-Powered JobTread Companion
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-6 glow-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-dark-300 mb-1.5">
                JobTread API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field"
                placeholder="Enter your JobTread API key"
                required
              />
              <p className="mt-1.5 text-xs text-dark-500">
                Find your API key in JobTread &rarr; Settings &rarr; API
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect to JobTread
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-dark-800/60 text-dark-500">Powered by BetterBossOS</span>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: '⚡', label: '4-Min AI Estimates', desc: 'Generate precise proposals instantly' },
              { icon: '📊', label: 'Real-Time Job Pulse', desc: 'Live budget & schedule tracking' },
              { icon: '🤖', label: 'AI Lead Scoring', desc: 'Prioritize high-value opportunities' },
              { icon: '💰', label: 'Cash Flow Radar', desc: 'Financial intelligence at a glance' },
            ].map((feature) => (
              <div key={feature.label} className="flex items-start gap-3 text-sm">
                <span className="text-base mt-0.5">{feature.icon}</span>
                <div>
                  <p className="font-medium text-dark-200">{feature.label}</p>
                  <p className="text-dark-500 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-dark-600 mt-6">
          Built by{' '}
          <a
            href="https://better-boss.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-boss-500 hover:text-boss-400 transition-colors"
          >
            Better Boss
          </a>
          {' '}&middot; America&apos;s #1 AI Automation for Contractors
        </p>
      </div>
    </div>
  );
}
