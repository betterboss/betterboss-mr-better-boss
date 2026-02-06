# BetterBoss Sidebar

**AI-Powered JobTread Companion for Construction Pros**

Built by [Better Boss](https://better-boss.ai) — America's #1 AI Automation for Contractors

---

## What Is This?

BetterBoss Sidebar is a desktop sidebar application that supercharges [JobTread](https://www.jobtread.com) with AI-powered intelligence. It sits alongside your workflow and provides instant access to smart estimating, lead scoring, financial analytics, and an AI assistant — all connected to your live JobTread data.

## Why Each Feature Exists

### Command Center (Dashboard)
**Problem:** Contractors open 5+ tabs and reports to understand their business health.
**Solution:** A single real-time dashboard showing active jobs, revenue, profit margins, AI insights, and recent activity. Gives you the pulse of your business in 3 seconds.

### Smart Estimator
**Problem:** Creating accurate estimates takes 3+ hours. Slow proposals lose deals.
**Solution:** AI generates precise, line-item estimates in under 4 minutes using your cost catalog and market data. Includes market price comparison so you price competitively without leaving money on the table. BetterBossOS clients report 23% higher close rates.

### Lead Autopilot
**Problem:** Contractors waste time on low-quality leads while hot leads go cold. No systematic way to prioritize who to call first.
**Solution:** AI scores every lead (0-100) based on project value, source quality, engagement signals, and historical conversion patterns. Provides specific recommended actions: "Call within 5 minutes — referral leads convert 3x higher."

### Job Pulse
**Problem:** No real-time visibility into job progress, budget health, or task status without logging into JobTread and clicking through multiple screens.
**Solution:** All active jobs at a glance with live progress bars, budget vs actual tracking, margin alerts, and overdue task warnings. Click to expand any job for detailed status.

### Cash Flow Radar
**Problem:** 82% of construction business failures cite cash flow as the primary cause. Contractors don't see cash crunches coming until it's too late.
**Solution:** AI-powered 4-week cash flow forecasting with automatic alerts. Shows cash position, receivables, payables, overdue invoices, and job profitability side-by-side. Proactive warnings like "Cash flow dip projected next week — accelerate $18,700 in overdue receivables."

### AI Assistant
**Problem:** Business data is buried across JobTread tabs, spreadsheets, and reports. Getting answers requires manual work.
**Solution:** Natural language AI assistant connected to your live JobTread data. Ask anything: "Which leads should I call today?" "Draft a follow-up email for Thompson." "What's my cash flow forecast?" Gets intelligent, data-backed answers instantly.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS with custom design system
- **Auth:** NextAuth.js with JobTread API key authentication
- **State:** Zustand for global state management
- **API:** GraphQL client for JobTread Open API
- **AI:** Pluggable AI backend (OpenAI / Anthropic)
- **Deployment:** Docker, Vercel, or any Node.js host

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- `JOBTREAD_API_URL` — Your JobTread API endpoint
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` — For AI features

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Login

Enter your email and JobTread API key. Find your API key in JobTread Settings > API.

## Deployment

### Docker

```bash
docker-compose up -d
```

### Vercel

```bash
npx vercel
```

### Manual

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/      # Protected routes
│   │   ├── dashboard/        # Command Center
│   │   ├── jobs/             # Job Pulse
│   │   ├── estimates/        # Smart Estimator
│   │   ├── leads/            # Lead Autopilot
│   │   ├── finances/         # Cash Flow Radar
│   │   ├── assistant/        # AI Assistant
│   │   └── settings/         # Configuration
│   ├── api/
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── jobtread/         # JobTread API proxy
│   │   └── ai/               # AI endpoints (chat, estimate, leads)
│   └── login/                # Login page
├── components/
│   └── sidebar/              # Sidebar layout, nav, header, command palette
├── lib/
│   ├── auth/                 # Auth configuration
│   ├── jobtread/             # JobTread GraphQL client
│   ├── hooks/                # Zustand store & custom hooks
│   └── utils/                # Utilities (cn, formatters)
├── types/                    # TypeScript type definitions
└── styles/                   # Global CSS & Tailwind config
```

## JobTread API Integration

This sidebar connects to JobTread's Open API (GraphQL) to read and write:
- Jobs, tasks, daily logs
- Contacts (customers, vendors, subcontractors, leads)
- Estimates and line items
- Invoices and purchase orders
- Cost catalog items
- Dashboard metrics

See `src/lib/jobtread/client.ts` for the complete API client.

## BetterBoss Results

Within the first 90 days, BetterBoss clients typically achieve:
- **52+ days reclaimed** annually from automated admin tasks
- **23% higher close rates** with AI lead scoring
- **3.8 minute estimates** vs industry average of 3+ hours
- **5% profit increase** through optimized pricing

## Links

- [Better Boss](https://better-boss.ai) — Main website
- [BetterBoss Resources](https://mybetterboss.ai) — Blog & tools
- [JobTread](https://www.jobtread.com) — Construction management platform
- [JobTread Open API](https://www.jobtread.com/integrations/open-api) — API documentation
- [JobTread + Better Boss](https://www.jobtread.com/partners/better-boss) — Partnership page
