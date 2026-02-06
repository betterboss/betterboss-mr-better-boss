# CLAUDE.md

## Project Overview

BetterBoss Sidebar — an AI-powered desktop companion for JobTread, built for construction professionals. Features smart estimating, lead scoring, financial analytics, and an AI assistant.

## Tech Stack

- **Framework:** Next.js 14 (App Router) with React 18, TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4 with custom design system (see `tailwind.config.ts`)
- **State Management:** Zustand 5.0
- **Auth:** NextAuth.js 4.24 (JWT strategy, JobTread API key credentials)
- **API:** GraphQL via graphql-request (JobTread Open API)
- **Deployment:** Vercel (primary), Docker (alternative)

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm start            # Run production server
npm run lint         # ESLint (next lint)
npx tsc --noEmit     # Type check (used in CI)
```

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # Protected routes (dashboard, jobs, estimates, leads, finances, assistant, settings)
│   ├── api/                      # API routes (auth, jobtread proxy, ai endpoints)
│   ├── login/                    # Login page
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # NextAuth SessionProvider
├── components/
│   ├── sidebar/                  # Sidebar navigation components
│   └── ui/                       # Reusable UI components
├── lib/
│   ├── auth/auth-options.ts      # NextAuth config
│   ├── jobtread/client.ts        # GraphQL client with all JobTread API methods
│   ├── hooks/                    # React hooks (useStore, useJobTread)
│   └── utils/cn.ts               # clsx + tailwind-merge utility
├── types/jobtread.ts             # All TypeScript type definitions
├── middleware.ts                 # Route protection middleware
└── styles/globals.css            # Global styles
```

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Key Patterns

- **Route groups:** `(authenticated)` group applies layout + middleware protection to all business routes.
- **API proxy:** `/api/jobtread/` routes proxy requests to the JobTread GraphQL API, adding auth headers.
- **AI endpoints:** `/api/ai/chat`, `/api/ai/estimate`, `/api/ai/leads` handle AI-powered features.
- **Auth flow:** Users authenticate with email + JobTread API key. Key is validated via a `/me` GraphQL query, then stored in the JWT.
- **Dark theme:** The app uses a dark UI by default (dark-950 background with boss-blue and accent-orange brand colors).

## Environment Variables

Required: `NEXTAUTH_SECRET`, `JOBTREAD_API_URL`
Optional: `JOBTREAD_CLIENT_ID`, `JOBTREAD_CLIENT_SECRET`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
See `.env.example` for the full list.

## CI/CD

GitHub Actions runs on push to `main` and `claude/*` branches:
1. `npm ci` → `npx tsc --noEmit` → `npm run build`
2. Vercel deployment (production for `main`, preview for other branches)

## Testing

No test framework is currently configured. There are no test files in the project.

## Common Gotchas

- All protected pages are under `src/app/(authenticated)/` — the route group name doesn't appear in URLs.
- The JobTread GraphQL client (`src/lib/jobtread/client.ts`) contains all API methods — add new queries/mutations there.
- Tailwind uses custom color tokens (`boss-*`, `accent-*`, `dark-*`) defined in `tailwind.config.ts`.
- The sidebar width is fixed at 380px (`w-sidebar` utility).
