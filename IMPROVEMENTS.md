# 100 Improvements — BetterBoss Sidebar Audit

Comprehensive line-by-line code audit. Every item includes the exact file, line numbers, what's wrong, and how to fix it. Organized by category and priority.

---

## 1. Security (1–13)

### 1. API Key Stored as Plaintext in JWT
**Priority: CRITICAL** | `src/lib/auth/auth-options.ts:119,129`

**Problem:** The user's JobTread API key is assigned to `accessToken` at line 119 and written directly into the JWT at line 129 via `token.accessToken = user.accessToken`. JWTs are base64-encoded, not encrypted — anyone who can read the cookie can extract the API key.

**Fix:** Encrypt the API key before storing in the JWT using `aes-256-gcm` with `NEXTAUTH_SECRET` as the key. Decrypt on each API request. Alternatively, store a session reference server-side (e.g., in Redis) and keep the API key out of the token entirely.

---

### 2. Middleware Does Not Protect API Routes
**Priority: CRITICAL** | `src/middleware.ts:10-19`

**Problem:** The middleware matcher only covers page routes (`/dashboard/:path*`, `/jobs/:path*`, etc.). API routes `/api/jobtread`, `/api/ai/chat`, `/api/ai/estimate`, `/api/ai/leads`, and `/api/ai/blueprint-takeoff` are completely unprotected at the edge. While most handlers call `getServerSession` internally, the blueprint-takeoff endpoint does not check auth at all.

**Fix:** Add `/api/jobtread/:path*` and `/api/ai/:path*` to the matcher array. Verify every API route has consistent auth checks.

---

### 3. No Rate Limiting on Any Endpoint
**Priority: CRITICAL** | `src/app/api/**`

**Problem:** Every API endpoint accepts unlimited requests. The chat endpoint fires 4 parallel GraphQL queries per message (`chat/route.ts:267-272`). The blueprint endpoint processes large base64 images. No per-user or per-IP throttling exists anywhere. This enables DoS attacks and AI API bill shock.

**Fix:** Add rate limiting middleware (e.g., `upstash/ratelimit` or `next-rate-limit`) with per-user quotas: 60 req/min for data endpoints, 10 req/min for AI endpoints.

---

### 4. No Security Headers
**Priority: CRITICAL** | `next.config.js:11-30`

**Problem:** The `headers()` function only sets CORS headers for userscript files. The application itself has no Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Strict-Transport-Security headers.

**Fix:** Add a catch-all header config in `next.config.js` for `/:path*` with CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.

---

### 5. Blueprint Endpoint Accepts Unvalidated Image Data
**Priority: CRITICAL** | `src/app/api/ai/blueprint-takeoff/route.ts:20-24`

**Problem:** Base64 image data is destructured from the request body with no validation of size, format, or MIME type. An arbitrarily large payload can cause memory exhaustion and OOM crashes.

**Fix:** Validate `imageData` with Zod: check max length (10MB base64), validate MIME prefix against whitelist (JPEG, PNG, WebP), and reject invalid encodings before processing.

---

### 6. No Input Validation on POST Endpoints
**Priority: HIGH** | `src/app/api/ai/estimate/route.ts:16-18`, `src/app/api/ai/leads/route.ts:17`, `src/app/api/ai/blueprint-takeoff/route.ts:20-32`

**Problem:** Request bodies are destructured without validation. `projectType` accepts any string, `squareFootage` accepts negative/Infinity/NaN, `contactData` structure is assumed. The estimate endpoint at line 16 does `const { projectType, squareFootage, ... } = await request.json()` with no checks.

**Fix:** Add Zod schemas for every POST endpoint. Validate `projectType` against an enum, `squareFootage` as a positive integer, and all required fields as non-empty strings.

---

### 7. JSON.parse on AI Response Without Try-Catch
**Priority: HIGH** | `src/app/api/ai/blueprint-takeoff/route.ts:187-192`

**Problem:** `JSON.parse()` is called on AI-returned content without error handling. When the AI returns malformed JSON (which happens frequently), the entire endpoint crashes with an unhandled exception.

**Fix:** Wrap in try-catch, return a structured error response with the raw AI text for debugging, and retry once with a stricter prompt.

---

### 8. 30-Day Session With No Rotation or Revocation
**Priority: HIGH** | `src/lib/auth/auth-options.ts:150-153`

**Problem:** `maxAge: 30 * 24 * 60 * 60` creates a 30-day session with no token rotation, no revocation mechanism, and no way to invalidate stolen tokens. If a JWT is compromised, the attacker has 30 days of access.

**Fix:** Reduce maxAge to 7 days, implement token rotation via NextAuth's `jwt` callback, and add a server-side session store that supports revocation.

---

### 9. Singleton GraphQL Client Race Condition
**Priority: HIGH** | `src/lib/jobtread/client.ts:399-407`

**Problem:** `getJobTreadClient()` uses a module-level singleton with `as unknown as { accessToken: string }` unsafe cast. In a serverless/concurrent environment, requests from different users can share the same client instance, leaking data across sessions.

**Fix:** Create a new client instance per request. Pass the access token as a parameter rather than relying on singleton state.

---

### 10. Error Messages May Leak Sensitive Information
**Priority: MEDIUM** | `src/lib/jobtread/client.ts:45-46`, `src/app/api/ai/blueprint-takeoff/route.ts:119,150`

**Problem:** Raw error messages from external APIs are returned to clients. JobTread error responses may contain internal API URLs, token fragments, or infrastructure details.

**Fix:** Sanitize all error messages before returning. Return generic user-facing messages and log detailed errors server-side only.

---

### 11. No CSRF Protection on POST Endpoints
**Priority: MEDIUM** | All API POST routes

**Problem:** No explicit CSRF verification beyond what NextAuth provides. The blueprint-takeoff endpoint doesn't even check authentication, making it fully open to cross-site requests.

**Fix:** Ensure all POST endpoints validate the session token. Add `SameSite=Strict` to cookies and verify the `Origin` header on mutations.

---

### 12. External Links Missing rel="noopener noreferrer"
**Priority: LOW** | `src/app/login/page.tsx:120`, `src/app/(authenticated)/settings/page.tsx:178-187`

**Problem:** External links to `better-boss.ai`, `mybetterboss.ai`, and `jobtread.com` are missing `rel="noopener noreferrer"`, creating a tabnapping risk where the opened page can redirect the opener.

**Fix:** Add `rel="noopener noreferrer"` to all `target="_blank"` links.

---

### 13. Unsanitized Data in tel: and mailto: Links
**Priority: LOW** | `src/app/(authenticated)/leads/page.tsx:178-187`

**Problem:** `tel:` and `mailto:` links inject contact data directly without encoding: `href={tel:${activeLead.phone}}`. While data comes from JobTread, special characters could cause unexpected behavior.

**Fix:** Use `encodeURIComponent()` for phone numbers and email addresses in URI schemes.

---

## 2. Extension & UserScript (14–23)

### 14. Unencrypted Business Data in chrome.storage.sync
**Priority: CRITICAL** | `extension/options.js:192-201`, `extension/background.js:31-36`

**Problem:** Owner name, email, phone, business address, license number, and website are stored as plaintext in `chrome.storage.sync.set()`. Anyone with extension access, a sync export, or a compromised Chrome profile can read all business PII.

**Fix:** Encrypt the profile object using the Web Crypto API (AES-GCM) with a user-derived key before storing. Decrypt on read.

---

### 15. Unencrypted Business Data in UserScript localStorage
**Priority: CRITICAL** | `public/betterboss-docfill.user.js:37-43`

**Problem:** The userscript stores the same business data via `localStorage.setItem('bb_' + key, JSON.stringify(val))`. Any script on the same origin (`app.jobtread.com`) can read all stored business information.

**Fix:** Use `GM_setValue`/`GM_getValue` exclusively (which are sandboxed from page scripts). Remove the `localStorage` fallback or encrypt it with a user passphrase.

---

### 16. Massive Code Duplication: Extension vs UserScript
**Priority: HIGH** | `extension/content.js` (509 lines) vs `public/betterboss-docfill.user.js` (851 lines)

**Problem:** Template engine, page detection, info extraction, clipboard logic, panel building, and SPA URL watcher are nearly identical in both files. The default legal template is duplicated in 3 files (`content.js:120-215`, `betterboss-docfill.user.js:264-360`, `options.js:22-117`). Any bug fix or feature must be applied in 3 places.

**Fix:** Extract shared logic into a common module (`docfill-core.js`). Build both the extension content script and the userscript from this shared source using a bundler (esbuild/rollup).

---

### 17. Default Template is a $10,000 Legal Contract
**Priority: HIGH** | `extension/options.js:22-117`, `extension/content.js:120-215`, `public/betterboss-docfill.user.js:264-360`

**Problem:** The hardcoded default description template is a specific $10,000 "JobTread Implementation Agreement" with legal terms, financing, indemnification clauses, and Colorado governing law. A user who doesn't customize the template will inadvertently send legally binding contract language to their clients.

**Fix:** Replace the default with a generic, clearly labeled sample template that includes a "CUSTOMIZE THIS BEFORE USE" warning. Move the legal template to a separately selectable "Implementation Agreement" option.

---

### 18. Bookmarklet Loader Has No Integrity Check
**Priority: HIGH** | `public/betterboss-docfill-loader.js:8`

**Problem:** Injects `<script src='https://mybetterboss.ai/betterboss-docfill.user.js?t='+Date.now()>` with no Subresource Integrity (SRI) hash. Cache-busting with `Date.now()` means every load fetches fresh. A MITM attack or domain takeover would serve arbitrary JavaScript.

**Fix:** Add an SRI hash attribute. Pin to a versioned URL instead of cache-busting. Implement a Content-Security-Policy on the loader.

---

### 19. Import Writes Arbitrary Keys to Storage Unvalidated
**Priority: MEDIUM** | `extension/options.js:282-284`

**Problem:** `safeSave(data, ...)` where `data` comes from `JSON.parse(ev.target.result)` of a user-uploaded file. Any keys in the JSON are written to `chrome.storage.sync` without schema validation. A malicious JSON file could overwrite any storage key.

**Fix:** Validate the imported data against an expected schema (only allow `profile`, `descriptionTemplate`, `footerTemplate` keys). Reject unknown keys.

---

### 20. Weak Regex for Email/Phone Extraction
**Priority: MEDIUM** | `extension/content.js:109-112`

**Problem:** Email regex `[\w.+-]+@[\w-]+\.[\w.]+` matches false positives like `version2.0.1` or `file.tar.gz`. Phone regex `\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}` matches random number sequences. Both are used to extract customer info from page text.

**Fix:** Use stricter patterns: require TLD length 2-6 for email, require at least one separator for phone. Add a confidence check or use the structured JobTread data instead of scraping page text.

---

### 21. MutationObserver on Entire Document Body
**Priority: MEDIUM** | `extension/content.js:499-500`, `public/betterboss-docfill.user.js:842-843`

**Problem:** Both files attach `new MutationObserver(debouncedCheck).observe(document.body, { childList: true, subtree: true })`. On a busy SPA like JobTread, this fires on hundreds of DOM mutations per second. While debounced at 500ms, the observer callback itself still runs for every mutation.

**Fix:** Observe a narrower DOM subtree (e.g., the main content container). Use `characterData: false, attributes: false` to reduce noise. Consider URL-based detection instead of DOM watching.

---

### 22. HTML Escaping Only Covers 4 Characters
**Priority: LOW** | `extension/content.js:42-44`, `public/betterboss-docfill.user.js:519-561`

**Problem:** The `esc()` function at `content.js:42-44` only escapes `& " < >`. Single quotes, backticks, and other HTML-significant characters are not escaped. This is used before `innerHTML` insertion.

**Fix:** Use a more comprehensive escaping function or switch to `textContent` / DOM API for inserting user data instead of `innerHTML`.

---

### 23. No Extension Versioning or Release Workflow
**Priority: LOW** | `extension/manifest.json:5`, `.github/workflows/`

**Problem:** Extension version is `1.0.0` with no CI/CD workflow for building, versioning, or releasing the extension to the Chrome Web Store. Updates require manual packaging.

**Fix:** Add a GitHub Actions workflow that bumps version, builds the extension, creates a ZIP artifact, and optionally publishes to Chrome Web Store via the API.

---

## 3. Performance (24–35)

### 24. Chat API Fires 4 GraphQL Queries Per Message With No Caching
**Priority: CRITICAL** | `src/app/api/ai/chat/route.ts:267-272`

**Problem:** Every single chat message triggers 4 parallel GraphQL queries (jobs, invoices, tasks, contacts) with `first: 100` each. This data barely changes between messages but is refetched every time. At 10 messages, that's 40 API calls.

**Fix:** Cache fetched data server-side with a 5-minute TTL per user. Use Redis or an in-memory LRU cache keyed by `userId + dataType`. Only refetch on explicit "refresh" requests.

---

### 25. Missing useMemo on All Derived State
**Priority: HIGH** | `src/app/(authenticated)/jobs/page.tsx:36-49`, `src/app/(authenticated)/leads/page.tsx:48-64`, `src/app/(authenticated)/finances/page.tsx:45-52`, `src/app/(authenticated)/dashboard/page.tsx:23-27`

**Problem:** `filteredJobs`, `statusCounts`, `leadsWithScores`, `filteredLeads`, `jobProfit`, `activeJobs`, `totalRevenue`, `totalCost`, and `avgMargin` are recalculated on every render without memoization. Any state change (search input, selection) recomputes everything.

**Fix:** Wrap all derived computations in `useMemo` with appropriate dependency arrays.

---

### 26. Command Palette Recreated on Every Render
**Priority: HIGH** | `src/components/sidebar/CommandPalette.tsx:36-64`

**Problem:** The `commands` array, `filtered` results, and `grouped` object are recreated on every render. The static `commands` array should be defined outside the component entirely.

**Fix:** Move `commands` to module scope. Wrap `filtered` and `grouped` in `useMemo` with `[search, commands]` dependencies.

---

### 27. Dashboard Fires 4 Separate Hooks Instead of One Batched Query
**Priority: HIGH** | `src/app/(authenticated)/dashboard/page.tsx:12-15`

**Problem:** `useJobs()`, `useInvoices()`, `useContacts()`, and `useTasks()` each make separate `/api/jobtread` requests. That's 4 HTTP roundtrips to load one page, each going through the proxy to the GraphQL API.

**Fix:** Create a `useDashboardData()` hook that sends a single GraphQL request with all four queries combined. Alternatively use GraphQL fragments in one request.

---

### 28. No Debouncing on Search Inputs
**Priority: HIGH** | `src/components/sidebar/SidebarHeader.tsx:29-30`, `src/app/(authenticated)/jobs/page.tsx:74-75`, `src/app/(authenticated)/leads/page.tsx:113-114`

**Problem:** Search inputs call `setSearch(e.target.value)` on every keystroke, triggering expensive re-renders and list filtering for each character typed.

**Fix:** Add a 300ms debounce using `useDeferredValue` (React 18) or a `useDebounce` hook.

---

### 29. State Update During Render in useJobTread
**Priority: HIGH** | `src/lib/hooks/useJobTread.ts:33-34`

**Problem:** `if (currentVarsKey !== varsKey) setVarsKey(currentVarsKey)` calls `setState` during render. In React 18 strict mode this causes double renders. The `eslint-disable-next-line` at line 75 hides the dependency array issues with `options?.skip` and `transform`.

**Fix:** Move the `varsKey` comparison into a `useEffect`. Stabilize the `options` object with `useMemo` at the call site, or extract `skip` and `transform` into separate parameters.

---

### 30. All Data Fetched Client-Side, No SSR or ISR
**Priority: MEDIUM** | All `(authenticated)` pages

**Problem:** Every page uses `'use client'` with `useEffect`-based data fetching. No server-side rendering, incremental static regeneration, or React Server Components are used. Initial page load always shows a loading spinner.

**Fix:** Convert data-fetching pages to Server Components where possible, using `getServerSession` for auth and direct API calls. Use Suspense boundaries for progressive loading.

---

### 31. No Virtual Scrolling for Long Lists
**Priority: MEDIUM** | `src/app/(authenticated)/jobs/page.tsx:135-175`, `src/app/(authenticated)/leads/page.tsx:206-260`

**Problem:** All jobs and leads render at once. With 500+ items, DOM size becomes massive and scroll performance degrades significantly.

**Fix:** Use `@tanstack/react-virtual` or `react-window` for virtualized list rendering.

---

### 32. Takeoff Result Recalculated Every Render
**Priority: MEDIUM** | `src/app/(authenticated)/takeoff/page.tsx:266-285`

**Problem:** `getTradeGroups()` recomputes the entire trade map, and selected totals/costs are recalculated on every render without memoization. The takeoff page has 15 state variables — any change triggers full recomputation.

**Fix:** Wrap `getTradeGroups()` and total calculations in `useMemo`.

---

### 33. Hard-Coded `first: 100` Limits Without Pagination
**Priority: MEDIUM** | `src/app/api/ai/chat/route.ts:268,271`, `src/lib/hooks/useJobTread.ts:172,201`

**Problem:** All data queries use `first: 100` with no cursor-based pagination. Users with 100+ jobs, invoices, or contacts get silently truncated data. The dashboard, chat, and all list pages show incomplete information.

**Fix:** Implement cursor-based pagination: fetch pages until `hasNextPage` is false, or add "Load More" UI with cursor tracking.

---

### 34. No DNS Prefetch or Preconnect for External APIs
**Priority: LOW** | `src/app/layout.tsx`

**Problem:** No `<link rel="dns-prefetch">` or `<link rel="preconnect">` for `api.jobtread.com`. The first API call pays full DNS + TLS latency.

**Fix:** Add `<link rel="preconnect" href="https://api.jobtread.com" crossOrigin="anonymous" />` to the root layout.

---

### 35. No Bundle Analysis Tooling
**Priority: LOW** | `package.json`

**Problem:** No way to analyze bundle size or detect bloat. No `@next/bundle-analyzer` configured. Performance regressions go undetected.

**Fix:** Add `@next/bundle-analyzer` and an `"analyze"` npm script. Set performance budgets in CI.

---

## 4. Accessibility (36–48)

### 36. Icon-Only Buttons Lack aria-label
**Priority: CRITICAL** | `src/components/sidebar/SidebarHeader.tsx:45-52,56-63`, `src/app/(authenticated)/assistant/page.tsx:227`, `src/components/sidebar/SidebarNav.tsx:143-148`

**Problem:** The notification bell, user menu, send message, and sidebar collapse buttons are icon-only with no `aria-label`. Screen readers announce them as empty buttons.

**Fix:** Add descriptive `aria-label` to every icon-only button: "Notifications", "User menu", "Send message", "Collapse sidebar".

---

### 37. Clickable List Items Use div+onClick Instead of Buttons
**Priority: CRITICAL** | `src/app/(authenticated)/jobs/page.tsx:142`, `src/app/(authenticated)/leads/page.tsx:206`, `src/app/(authenticated)/estimates/page.tsx:179`

**Problem:** Job items, lead cards, and estimate items use `<div onClick={...}>` — not focusable, not keyboard-accessible, not announced as interactive. Users who rely on keyboard or screen readers cannot interact with these lists.

**Fix:** Replace with `<button>` elements or add `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers for Enter/Space.

---

### 38. No aria-current="page" on Active Nav Items
**Priority: HIGH** | `src/components/sidebar/SidebarNav.tsx:113-138`

**Problem:** Active navigation items are visually highlighted (blue background) but not programmatically identified. Screen readers don't announce which page the user is on.

**Fix:** Add `aria-current="page"` to the active `<Link>` element.

---

### 39. Command Palette Missing Dialog Semantics
**Priority: HIGH** | `src/components/sidebar/CommandPalette.tsx:93-159`

**Problem:** The modal overlay lacks `role="dialog"`, `aria-modal="true"`, and `aria-label`. There is no focus trap — Tab can move focus behind the overlay. Focus is not returned to the trigger on close.

**Fix:** Add proper dialog ARIA attributes, implement focus trapping (e.g., `focus-trap-react`), and return focus to the Cmd+K trigger on dismiss.

---

### 40. Search Inputs Rely on Placeholder Instead of Labels
**Priority: HIGH** | `src/app/(authenticated)/jobs/page.tsx:74`, `src/app/(authenticated)/leads/page.tsx:113`, `src/components/sidebar/CommandPalette.tsx:100-112`

**Problem:** Search inputs use `placeholder` as the only label. Placeholders disappear on focus and are not reliably announced by all screen readers.

**Fix:** Add `aria-label="Search jobs"`, `aria-label="Search leads"`, etc. to each input. Or use visually hidden `<label>` elements.

---

### 41. Chat Messages Lack Semantic Structure
**Priority: MEDIUM** | `src/app/(authenticated)/assistant/page.tsx:159-192`

**Problem:** Chat messages are plain `<div>` elements with no semantic role. The message list should be a `role="log"` region with `aria-live="polite"` so new messages are announced.

**Fix:** Add `role="log"` and `aria-live="polite"` to the messages container. Use `<article>` for individual messages.

---

### 42. Loading Spinner Has No Accessible Label
**Priority: MEDIUM** | `src/components/ui/DataState.tsx:6-11`

**Problem:** The `LoadingState` component shows a spinning icon with text, but the spinner itself has no `role="status"` or `aria-label`. Screen readers don't announce loading state.

**Fix:** Add `role="status"` and `aria-live="polite"` to the loading container.

---

### 43. No Skip Navigation Link
**Priority: MEDIUM** | `src/app/layout.tsx`

**Problem:** No "Skip to main content" link. Keyboard users must tab through the entire sidebar navigation on every page load.

**Fix:** Add a visually hidden skip link as the first focusable element: `<a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>`.

---

### 44. Progress Bars Are Visual Only
**Priority: MEDIUM** | `src/app/(authenticated)/finances/page.tsx:217-221`

**Problem:** Revenue/cost progress bars use `<div>` with percentage widths but no ARIA attributes. Screen readers cannot perceive the progress value.

**Fix:** Add `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label`.

---

### 45. Error States Not Announced
**Priority: MEDIUM** | `src/components/ui/DataState.tsx:14-35`

**Problem:** Error messages appear visually but are not announced to screen readers. The `ErrorState` component has no `role="alert"`.

**Fix:** Add `role="alert"` to the error container so it's immediately announced when it appears.

---

### 46. Status Filter Buttons Lack Tab Semantics
**Priority: LOW** | `src/app/(authenticated)/jobs/page.tsx:79-91`

**Problem:** Status filter buttons (All, Active, Completed) act as tabs but lack `role="tablist"`, `role="tab"`, and `aria-selected` attributes.

**Fix:** Add proper ARIA tab semantics or use a `<fieldset>` with radio buttons for filter selection.

---

### 47. Lead Score Badge Is Visual Only
**Priority: LOW** | `src/app/(authenticated)/leads/page.tsx:228-233`

**Problem:** The lead score badge shows a number and color but has no screen reader context. Users don't know what "85" means or that green indicates a hot lead.

**Fix:** Add `aria-label="Lead score: 85 out of 100, hot lead"` based on the score threshold.

---

### 48. Takeoff Checkboxes Lack Labels
**Priority: LOW** | `src/app/(authenticated)/takeoff/page.tsx:640-647,682-686`

**Problem:** Trade group and line item checkboxes have no associated `<label>` or `aria-label`. Screen readers announce them as unnamed checkboxes.

**Fix:** Add `aria-label` with the trade group or line item name.

---

## 5. UX & Features (49–66)

### 49. "AI" Chat Is Keyword Matching, Not Actual AI
**Priority: CRITICAL** | `src/app/api/ai/chat/route.ts:75-250`

**Problem:** Despite being presented as "AI Assistant" with an AI bot icon, the `buildResponse` function is entirely keyword-based string matching with 5 branches: health/overview, cash/forecast, lead/contact, job/project, estimate/pricing. No LLM is called. The welcome message promises capabilities like "generate follow-up emails" and "review estimates" that don't exist. This is misleading.

**Fix:** Integrate an actual LLM (OpenAI or Anthropic — keys are already in `.env.example`). Pass the fetched JobTread data as context to the LLM and return real AI-generated responses. Or honestly label the feature as "Smart Reports" rather than "AI Assistant".

---

### 50. Lead Scoring Labeled as "AI" but Is a Simple Heuristic
**Priority: HIGH** | `src/app/(authenticated)/leads/page.tsx:17-33`

**Problem:** `computeLeadScore()` adds fixed points: +10 for email, +10 for phone, +10 for company, +5 for source, +5 for notes, +5/10/15 for recency. The UI presents this as "AI Lead Scoring" with lightning bolt icons. The server-side endpoint at `/api/ai/leads` has a slightly more sophisticated version but is never called.

**Fix:** Either call the actual `/api/ai/leads` endpoint (which uses an LLM), or rename the UI to "Lead Score" without the "AI" label.

---

### 51. No Toast Notification System
**Priority: HIGH** | Global

**Problem:** No user feedback for copy-to-clipboard, successful API calls, form saves, or errors. Actions happen silently. Users don't know if their click registered.

**Fix:** Add `sonner` or `react-hot-toast`. Show success/error toasts for all user actions: "Copied to clipboard", "Estimate generated", "Push to JobTread successful", "Session expired".

---

### 52. No Confirmation Dialogs for Destructive Actions
**Priority: HIGH** | `src/app/(authenticated)/assistant/page.tsx:130-133`

**Problem:** Clearing chat history (the trash icon) happens immediately with no confirmation. Sign out has no "Are you sure?" prompt. Removing takeoff selections is instant and irreversible.

**Fix:** Add a confirmation modal or dialog for all destructive actions.

---

### 53. Settings Inputs Never Persist
**Priority: HIGH** | `src/app/(authenticated)/settings/page.tsx:27-34,149-154`

**Problem:** Notification toggles at lines 27-34 are `useState` only — lost on page refresh. The Markup %, Tax Rate %, and AI Confidence Threshold inputs use `defaultValue` (uncontrolled) with no `onChange` handler and no save mechanism. Changes are silently discarded.

**Fix:** Persist settings to `localStorage` or a backend store. Use controlled inputs with `value`/`onChange`. Add a visible "Save" button or auto-save with debounce.

---

### 54. Chat History Lost on Page Refresh
**Priority: HIGH** | `src/app/(authenticated)/assistant/page.tsx:43`

**Problem:** `useState<ChatMessage[]>([welcomeMessage])` — all chat messages are ephemeral. Navigating away or refreshing destroys the entire conversation.

**Fix:** Persist messages to `localStorage` (for quick implementation) or a backend store. Load on mount, save on each new message.

---

### 55. Generated Estimates Cannot Be Edited or Pushed to JobTread
**Priority: HIGH** | `src/app/(authenticated)/estimates/page.tsx:161-163`

**Problem:** The UI says "Copy these line items into JobTread to create your estimate" — there is no push-to-JobTread integration like the takeoff page has. Users must manually copy line items one by one. Estimates also can't be modified in-app before copying.

**Fix:** Add inline editing of generated estimates. Add a "Push to JobTread" button using the same GraphQL mutation pattern as the takeoff page.

---

### 56. No Mobile-Responsive Layout
**Priority: HIGH** | `src/components/sidebar/SidebarNav.tsx:84-89`

**Problem:** The sidebar has a fixed 380px width (`w-sidebar`). On mobile screens, it overflows. No hamburger menu, no responsive breakpoint, no drawer behavior. The app is unusable on phones.

**Fix:** Add a responsive breakpoint. Convert sidebar to a hamburger-triggered drawer on `md:` and below. Use `lg:w-sidebar` for desktop.

---

### 57. Skeleton Loading Instead of Full-Page Spinners
**Priority: MEDIUM** | `src/components/ui/DataState.tsx:5-12`

**Problem:** All pages use a full-page spinning loader while data fetches. This causes layout shift when content appears and provides poor perceived performance.

**Fix:** Create skeleton components matching each page's layout. Show skeleton UI during loading, then fade in real data.

---

### 58. Empty States Lack Actionable CTAs
**Priority: MEDIUM** | All data pages

**Problem:** When a user has no jobs, leads, or invoices, the app shows generic "No items found" messages. First-time users have no guidance on what to do.

**Fix:** Add onboarding-style empty states: "No jobs yet — jobs from your JobTread account will appear here once connected" with a link to JobTread.

---

### 59. Hardcoded Tax Rate Used Everywhere
**Priority: MEDIUM** | `src/app/api/ai/estimate/route.ts:24`, `src/app/api/ai/blueprint-takeoff/route.ts:252,388`

**Problem:** Tax rate is hardcoded to 8.25% in all estimation logic. Different states/counties have different rates. The settings page has a tax rate input but it never connects to the API.

**Fix:** Accept `taxRate` as a parameter from the client (sourced from user settings). Fall back to 8.25% only if not provided.

---

### 60. Schedule Quick Action Button Does Nothing
**Priority: MEDIUM** | `src/app/(authenticated)/leads/page.tsx:189-192`

**Problem:** The "Schedule" button in the lead detail panel has no `onClick` handler. It renders but clicking it does nothing.

**Fix:** Either implement the scheduling feature (calendar integration or JobTread task creation) or remove the button.

---

### 61. No Data Export Capability
**Priority: MEDIUM** | All data pages

**Problem:** No way to export jobs, leads, invoices, or estimates to CSV or PDF. Construction professionals frequently need printable reports for clients, accountants, and permits.

**Fix:** Add "Export CSV" and "Export PDF" buttons to data pages using `papaparse` for CSV and `jspdf` or server-side rendering for PDF.

---

### 62. Error States Show Generic Messages
**Priority: MEDIUM** | `src/components/ui/DataState.tsx:14-35`

**Problem:** All errors show the same retry UI. Users can't distinguish between network errors, expired sessions, rate limits, or server issues. No contextual guidance.

**Fix:** Parse error types and show specific messages: "Your session expired — please log in again", "Network error — check your connection", "Too many requests — wait a moment".

---

### 63. Command Palette Keyboard Navigation Doesn't Wrap
**Priority: LOW** | `src/components/sidebar/CommandPalette.tsx:70-88`

**Problem:** Arrow down on the last item doesn't wrap to the first. Arrow up on the first item doesn't wrap to the last. Standard keyboard navigation pattern is broken.

**Fix:** Implement wrap-around: `setSelectedIndex((prev) => (prev + 1) % total)` for down, `(prev - 1 + total) % total` for up.

---

### 64. No "Show Password" Toggle on Login API Key Input
**Priority: LOW** | `src/app/login/page.tsx:67-86`

**Problem:** The API key input is `type="password"` with no visibility toggle. Users can't verify what they pasted, leading to failed login attempts.

**Fix:** Add an eye icon toggle button that switches between `type="password"` and `type="text"`.

---

### 65. Takeoff Selections Lost on Navigation
**Priority: MEDIUM** | `src/app/(authenticated)/takeoff/page.tsx:160-168`

**Problem:** Selected line items and trade groups are stored in component state only. Navigating to another page and back resets all selections. Multi-step analysis work is lost.

**Fix:** Persist selections to `localStorage` or a Zustand store (already in dependencies but not used).

---

### 66. Dashboard Shows Full-Page Block While Loading
**Priority: LOW** | `src/app/(authenticated)/dashboard/page.tsx:19`

**Problem:** A single `isLoading` boolean blocks the entire dashboard while all 4 data sources load. If jobs load fast but tasks are slow, the user sees nothing.

**Fix:** Show each section independently with its own loading state using Suspense boundaries or per-section loading flags.

---

## 6. Code Quality (67–80)

### 67. Takeoff Page Is 852 Lines in One Component
**Priority: HIGH** | `src/app/(authenticated)/takeoff/page.tsx`

**Problem:** Single component with 15 state variables, 4 wizard steps (upload, analysis, review, push), file handling, API calls, GraphQL mutations, and full review UI — all in one file. Impossible to test, review, or maintain.

**Fix:** Split into `TakeoffUpload`, `TakeoffAnalysis`, `TakeoffReview`, `TakeoffPush` components. Extract state management into a custom hook or Zustand store.

---

### 68. Magic Numbers Throughout the Codebase
**Priority: HIGH** | Multiple files

**Problem:** Hardcoded numbers with no explanation: lead score thresholds `80`, `60`, `50` (`leads/page.tsx:12-14,19`), file size limit `20 * 1024 * 1024` (duplicated), confidence thresholds `0.8`, `0.6`, default markup `45`, tax rate `8.25`, profit margin thresholds `25`, `15` (`finances/page.tsx`), time constants `31536000`, `2592000` (`cn.ts:29-49`).

**Fix:** Create a `src/lib/constants.ts` with named exports: `LEAD_SCORE_HOT = 80`, `MAX_UPLOAD_SIZE_BYTES = 20_971_520`, `DEFAULT_TAX_RATE = 0.0825`, etc.

---

### 69. No Error Boundaries
**Priority: HIGH** | `src/app/(authenticated)/layout.tsx`

**Problem:** No React error boundary wrapping any page or component. If any API hook throws, a calculation errors, or a render fails, the entire app crashes to a white screen.

**Fix:** Add `error.tsx` files in route segments (Next.js convention) and/or a `<ErrorBoundary>` component wrapping the authenticated layout.

---

### 70. Chat API buildResponse Has 5 Duplicate Template Branches
**Priority: MEDIUM** | `src/app/api/ai/chat/route.ts:101-250`

**Problem:** Each branch (health, cash, leads, jobs, estimates) independently computes `activeJobs`, `totalRevenue`, `overdueInvoices`, etc. with similar reduce/filter logic. Lots of duplicated computation and string building.

**Fix:** Compute all derived values once before the branches. Use a response builder or strategy pattern with template functions.

---

### 71. Lead Scoring Logic Embedded in Component
**Priority: MEDIUM** | `src/app/(authenticated)/leads/page.tsx:17-33`

**Problem:** `computeLeadScore()` is defined inside the leads page component file. Not reusable, not testable in isolation, and duplicates logic from `/api/ai/leads`.

**Fix:** Move to `src/lib/utils/lead-scoring.ts`. Share between the client component and the API endpoint.

---

### 72. formatCurrency Lives in cn.ts
**Priority: MEDIUM** | `src/lib/utils/cn.ts`

**Problem:** `cn.ts` contains `formatCurrency`, `formatPercent`, `formatNumber`, and `timeAgo` alongside the `cn()` classname utility. These are unrelated concerns sharing one file.

**Fix:** Move formatting functions to `src/lib/utils/formatters.ts`. Keep `cn.ts` focused on classname merging.

---

### 73. timeAgo Doesn't Handle Future Dates
**Priority: LOW** | `src/lib/utils/cn.ts:29-49`

**Problem:** `timeAgo()` function doesn't handle dates in the future. If `Date.now() - date < 0`, it falls through all conditions and returns "just now" incorrectly.

**Fix:** Add a guard: `if (seconds < 0) return 'in the future'` or `return 'just now'` with a comment.

---

### 74. Date.now().toString() Used for Message IDs
**Priority: LOW** | `src/app/(authenticated)/assistant/page.tsx:74`

**Problem:** `id: Date.now().toString()` for chat message IDs is not unique if two messages are created in the same millisecond (e.g., user message + assistant response).

**Fix:** Use `crypto.randomUUID()` which is available in all modern browsers and Node.js.

---

### 75. Command Palette flatIndex Mutated During Render
**Priority: LOW** | `src/components/sidebar/CommandPalette.tsx:90-124`

**Problem:** `let flatIndex = -1` is declared at line 90 and mutated via `flatIndex++` at line 122 during `items.map()`. This works but violates React's pure render principle and breaks under concurrent features.

**Fix:** Pre-compute the flat index mapping in `useMemo` and look up indices during render.

---

### 76. Commands Hardcoded Instead of Generated from Routes
**Priority: LOW** | `src/components/sidebar/CommandPalette.tsx:36-52`

**Problem:** The command list is a hardcoded array that must be manually kept in sync with the route structure and `SidebarNav` items. Adding a new page requires updating 3 places.

**Fix:** Create a shared route config (e.g., `src/lib/routes.ts`) used by both `SidebarNav` and `CommandPalette`.

---

### 77. SidebarLayout Has Dead Conditional
**Priority: LOW** | `src/components/sidebar/SidebarLayout.tsx:18-20`

**Problem:** `isCollapsed ? 'ml-0' : 'ml-0'` — the ternary always returns the same value.

**Fix:** Remove the ternary and use `'ml-0'` directly, or implement the intended collapsed margin.

---

### 78. No Structured Logging
**Priority: MEDIUM** | All API endpoints

**Problem:** Only `console.error` is used for logging. No correlation IDs, no log levels, no structured output. Production debugging requires searching through unstructured text.

**Fix:** Add Pino or Winston with JSON structured logging. Include request ID, user ID, and timestamp in every log entry.

---

### 79. No Runtime Type Validation on GraphQL Responses
**Priority: MEDIUM** | `src/lib/jobtread/client.ts:35-60`

**Problem:** GraphQL responses are cast with `as T` type assertions that provide zero runtime safety. If the API returns an unexpected shape, bugs surface downstream in components.

**Fix:** Add Zod schemas for GraphQL response validation. Parse and validate before returning from the client.

---

### 80. Zustand Installed but Not Used
**Priority: LOW** | `package.json`

**Problem:** Zustand 5.0 is listed as a dependency and `src/lib/hooks/useStore.ts` exists, but the app uses only `useState` for all state management. Takeoff selections, settings, chat history, and sidebar state would all benefit from a shared store.

**Fix:** Either use Zustand for cross-page state (settings, chat history, takeoff) or remove the dependency to reduce bundle size.

---

## 7. Testing & CI/CD (81–88)

### 81. Zero Test Coverage
**Priority: CRITICAL** | `package.json`

**Problem:** No test framework configured. No test files exist. No unit tests, no integration tests, no E2E tests. The CLAUDE.md explicitly states "No test framework is currently configured."

**Fix:** Add Vitest + `@testing-library/react` for unit/component tests. Add Playwright for E2E. Start with critical paths: auth flow, estimate generation, push-to-JobTread.

---

### 82. CI Pipeline Missing Lint Step
**Priority: HIGH** | `.github/workflows/blank.yml`

**Problem:** The CI workflow runs `tsc --noEmit` and `npm run build` but not `npm run lint`. Code style violations can be merged without detection.

**Fix:** Add `- name: Lint` / `run: npm run lint` step between type-check and build.

---

### 83. Deploy Workflow Runs Build Twice
**Priority: HIGH** | `.github/workflows/deploy-vercel.yml`

**Problem:** The workflow runs `npm run build` first, then `vercel build --prod`. That's two complete Next.js builds per deployment — doubling CI time and cost.

**Fix:** Remove the `npm run build` step. Let `vercel build` handle it, or use build artifacts from the first build.

---

### 84. Deploy Workflow Missing Type-Check
**Priority: HIGH** | `.github/workflows/deploy-vercel.yml`

**Problem:** No `tsc --noEmit` in the deploy workflow. TypeScript errors could reach production even though the CI workflow checks them — the deploy workflow runs independently.

**Fix:** Add type-check step before build in the deploy workflow.

---

### 85. CI Workflow Named "blank.yml"
**Priority: LOW** | `.github/workflows/blank.yml`

**Problem:** The main CI workflow file is named `blank.yml` — an autogenerated GitHub placeholder name. Unprofessional and confusing.

**Fix:** Rename to `ci.yml` with a proper workflow name.

---

### 86. Hardcoded Test Secret in CI
**Priority: MEDIUM** | `.github/workflows/blank.yml:31-32`

**Problem:** `NEXTAUTH_SECRET: test-secret-for-ci-builds-only` is hardcoded. While not a security risk (it's for CI only), it should use GitHub secrets for consistency and to avoid accidental use in production.

**Fix:** Use `${{ secrets.NEXTAUTH_SECRET || 'ci-placeholder' }}` to prefer real secrets when available.

---

### 87. No Dependency Security Auditing
**Priority: MEDIUM** | `.github/workflows/blank.yml`

**Problem:** No `npm audit` step in CI. Vulnerable dependencies can be merged and deployed without detection.

**Fix:** Add `- name: Security audit` / `run: npm audit --audit-level=moderate` to CI.

---

### 88. No Dependabot Configuration
**Priority: LOW** | `.github/dependabot.yml` (missing)

**Problem:** No automated dependency update mechanism. Outdated and vulnerable packages accumulate silently.

**Fix:** Add `.github/dependabot.yml` for weekly npm dependency updates and GitHub Actions version updates.

---

## 8. Infrastructure & Configuration (89–100)

### 89. No Error Tracking (Sentry/LogRocket)
**Priority: HIGH** | `package.json`

**Problem:** No production error monitoring. Runtime exceptions, unhandled promise rejections, and client-side crashes are invisible to the team. Users encounter errors with no way to report them.

**Fix:** Add `@sentry/nextjs`. Configure error boundary integration, source maps upload, and performance monitoring.

---

### 90. No Environment Variable Validation
**Priority: HIGH** | (missing `src/lib/env.ts`)

**Problem:** Environment variables are accessed via `process.env.X` throughout the codebase with no validation. Missing or misconfigured variables produce cryptic runtime errors instead of clear startup failures.

**Fix:** Create `src/lib/env.ts` using `@t3-oss/env-nextjs` or Zod to validate all env vars at build time. Export typed, validated values.

---

### 91. Missing .dockerignore
**Priority: MEDIUM** | `.dockerignore` (missing)

**Problem:** No `.dockerignore` exists. `COPY . .` in the Dockerfile includes `.git/`, `node_modules/`, `.env` files, and development artifacts — bloating the image and potentially leaking secrets.

**Fix:** Create `.dockerignore` with: `.git`, `.github`, `.next`, `node_modules`, `.env*.local`, `coverage`, `*.md`.

---

### 92. Docker Health Check Uses wget (Not Installed)
**Priority: MEDIUM** | `docker-compose.yml`

**Problem:** Health check runs `wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/session` but the Node.js Alpine base image doesn't include `wget`. The health check silently fails.

**Fix:** Replace with a Node.js-based health check: `test: ["CMD", "node", "-e", "fetch('http://localhost:3000/api/auth/session').then(r => process.exit(r.ok ? 0 : 1))"]` or install curl in the Dockerfile.

---

### 93. Dockerfile Missing HEALTHCHECK Instruction
**Priority: MEDIUM** | `Dockerfile`

**Problem:** No `HEALTHCHECK` in the Dockerfile. Orchestrators like Kubernetes or Docker Swarm can't auto-restart unhealthy containers.

**Fix:** Add `HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD node -e "fetch('http://localhost:3000/api/auth/session').then(r => process.exit(r.ok ? 0 : 1))"`.

---

### 94. Missing SEO Meta Tags
**Priority: MEDIUM** | `src/app/layout.tsx`

**Problem:** No `og:image`, `og:url`, `og:type`, `twitter:card`, `robots`, or `theme-color` meta tags. Social sharing shows no preview. Search engines get minimal information.

**Fix:** Add comprehensive OpenGraph and Twitter Card metadata to the `metadata` export in `layout.tsx`.

---

### 95. No Favicon or Web App Manifest
**Priority: MEDIUM** | `src/app/layout.tsx`, `public/` (missing icons)

**Problem:** No favicon, apple-touch-icon, or `manifest.json`. The app can't be bookmarked properly, has no PWA support, and shows a generic browser icon.

**Fix:** Create favicon set (16x16, 32x32, 180x180, 192x192, 512x512) and a `manifest.json` with app name, theme color, and icons.

---

### 96. Vercel Function Timeout Too Low for AI Endpoints
**Priority: MEDIUM** | `vercel.json`

**Problem:** Default Vercel function timeout is 60 seconds. Blueprint analysis with large images can exceed this, causing silent failures. No `maxDuration` override configured.

**Fix:** Add `"functions": { "src/app/api/ai/**/*.ts": { "maxDuration": 300 } }` to `vercel.json`.

---

### 97. Single-Region Deployment
**Priority: LOW** | `vercel.json`

**Problem:** Region hardcoded to `iad1` (Northern Virginia) only. Users outside the eastern US experience higher latency.

**Fix:** Remove the `regions` restriction to use Vercel's global edge network, or add `["iad1", "sfo1", "lhr1"]` for multi-region.

---

### 98. Tailwind Content Paths Include Unused src/pages
**Priority: LOW** | `tailwind.config.ts`

**Problem:** Content paths include `./src/pages/**/*.{js,ts,jsx,tsx,mdx}` but the app uses App Router (`src/app/`), not Pages Router. Unnecessary directory scanning.

**Fix:** Remove the `./src/pages/` path from the content array.

---

### 99. No Pre-Commit Hooks
**Priority: LOW** | (missing `.husky/`)

**Problem:** No automated quality checks before commit. Developers can commit code that fails linting, type-checking, or formatting without any warning.

**Fix:** Add Husky + lint-staged. Run `eslint --fix`, `prettier --write`, and `tsc --noEmit` on staged files.

---

### 100. Tailwind Plugins Array Empty
**Priority: LOW** | `tailwind.config.ts`

**Problem:** `plugins: []` is empty. `@tailwindcss/forms` would improve form element consistency. `@tailwindcss/typography` would enable rich prose styling for AI-generated chat responses and estimate descriptions.

**Fix:** Add `@tailwindcss/forms` and `@tailwindcss/typography` plugins.

---

## Summary

| Priority | Count | Focus Areas |
|----------|-------|-------------|
| CRITICAL | 9 | JWT plaintext key, rate limiting, security headers, image validation, accessibility, keyword-matching chat, zero tests |
| HIGH | 33 | Session rotation, extension encryption, code duplication, performance, error boundaries, settings persistence |
| MEDIUM | 36 | Responsiveness, accessibility polish, structured logging, Docker fixes, SEO, data export |
| LOW | 22 | Bundle analysis, DNS prefetch, CI naming, Tailwind cleanup, pre-commit hooks |

## Implementation Phases

**Phase 1 — Security & Auth (Week 1–2):** Items 1–15, 49–50, 81
Encrypt JWT payload, protect API routes, add rate limiting, encrypt extension storage, set up test framework.

**Phase 2 — Performance & Core Features (Week 3–4):** Items 24–35, 51–56, 67–69
Add caching, memoization, debouncing. Integrate real AI. Add toast notifications, settings persistence, chat persistence.

**Phase 3 — Accessibility & UX Polish (Week 5–6):** Items 36–48, 57–66
ARIA labels, keyboard navigation, focus management, skeleton loading, responsive layout, data export.

**Phase 4 — Code Quality & Infrastructure (Week 7–8):** Items 16–23, 70–80, 82–100
Extract shared extension code, refactor components, add structured logging, fix CI/CD, Docker, SEO.
