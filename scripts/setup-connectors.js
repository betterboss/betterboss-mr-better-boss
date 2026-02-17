#!/usr/bin/env node
// =============================================================================
// BetterBoss — One-Command Connector Setup
// Registers webhook connectors with JobTread and GoHighLevel.
//
// Usage:
//   node scripts/setup-connectors.js
//   npm run setup                          (same thing)
//   APP_URL=https://your.vercel.app npm run setup   (override base URL)
// =============================================================================

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ---- Load .env.local ----
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (match) env[match[1]] = match[2];
    }
  }
  return env;
}

const fileEnv = loadEnv();

const GHL_API_KEY = process.env.GHL_API_KEY || fileEnv.GHL_API_KEY || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || fileEnv.GHL_LOCATION_ID || '';
const JT_TOKEN = process.env.JOBTREAD_SERVICE_TOKEN || fileEnv.JOBTREAD_SERVICE_TOKEN || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || fileEnv.WEBHOOK_SECRET || '';
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || fileEnv.NEXT_PUBLIC_APP_URL || '';

// ---- Helpers ----
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function ok(msg) { console.log(`  ${GREEN}✓${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}✗${RESET} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}!${RESET} ${msg}`); }
function info(msg) { console.log(`  ${DIM}${msg}${RESET}`); }

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}

// ---- Validate credentials ----
async function validateCredentials() {
  console.log(`\n${BOLD}${CYAN}BetterBoss Connector Setup${RESET}\n`);

  const errors = [];
  if (!GHL_API_KEY) errors.push('GHL_API_KEY');
  if (!GHL_LOCATION_ID) errors.push('GHL_LOCATION_ID');
  if (!JT_TOKEN) errors.push('JOBTREAD_SERVICE_TOKEN');
  if (!WEBHOOK_SECRET) errors.push('WEBHOOK_SECRET');

  if (errors.length > 0) {
    fail(`Missing credentials: ${errors.join(', ')}`);
    info('Set them in .env.local or pass as environment variables.');
    process.exit(1);
  }

  if (!APP_URL || APP_URL.includes('localhost')) {
    fail(`APP_URL is "${APP_URL || '(empty)'}" — must be a public URL for webhooks to work.`);
    info('Set APP_URL or NEXT_PUBLIC_APP_URL to your Vercel/production URL:');
    info('  APP_URL=https://your-app.vercel.app npm run setup');
    process.exit(1);
  }

  ok(`Credentials loaded`);
  info(`GHL API Key:     ${GHL_API_KEY.slice(0, 8)}...`);
  info(`GHL Location:    ${GHL_LOCATION_ID}`);
  info(`JT Token:        ${JT_TOKEN.slice(0, 8)}...`);
  info(`Webhook Secret:  ${WEBHOOK_SECRET.slice(0, 8)}...`);
  info(`App URL:         ${APP_URL}`);
}

// ---- Step 1: Validate JT Connection ----
async function validateJobTread() {
  console.log(`\n${BOLD}Step 1: JobTread Connection${RESET}`);

  const { ok: isOk, json } = await fetchJSON('https://api.jobtread.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${JT_TOKEN}` },
    body: JSON.stringify({ query: '{ me { id firstName lastName email organization { name } } }' }),
  });

  if (!isOk || json?.errors) {
    fail(`JobTread API failed: ${json?.errors?.[0]?.message || 'Unknown error'}`);
    return false;
  }

  const me = json.data?.me;
  if (me) {
    ok(`Connected as ${me.firstName} ${me.lastName} (${me.email})`);
    if (me.organization?.name) info(`Organization: ${me.organization.name}`);
  } else {
    fail('Could not read user info from JobTread');
    return false;
  }
  return true;
}

// ---- Step 2: Validate GHL Connection ----
async function validateGHL() {
  console.log(`\n${BOLD}Step 2: GoHighLevel Connection${RESET}`);

  const { ok: isOk, json, status } = await fetchJSON(
    `https://rest.gohighlevel.com/v1/contacts/?locationId=${GHL_LOCATION_ID}&limit=1`,
    { headers: { Authorization: `Bearer ${GHL_API_KEY}` } }
  );

  if (!isOk) {
    fail(`GHL API returned ${status}`);
    if (status === 401) info('Check your GHL API key — it may be expired or invalid.');
    return false;
  }

  const total = json?.meta?.total || json?.contacts?.length || 0;
  ok(`Connected — ${total} contacts in location`);
  return true;
}

// ---- Step 3: Register GHL Webhook (GHL → JT) ----
async function registerGHLWebhook() {
  console.log(`\n${BOLD}Step 3: Register GHL → JT Webhook${RESET}`);

  const webhookUrl = `${APP_URL}/api/webhooks/ghl?secret=${WEBHOOK_SECRET}`;
  info(`URL: ${webhookUrl}`);

  // Check existing webhooks first
  const { json: existing } = await fetchJSON(
    `https://rest.gohighlevel.com/v1/hooks/?locationId=${GHL_LOCATION_ID}`,
    { headers: { Authorization: `Bearer ${GHL_API_KEY}` } }
  );

  const hooks = existing?.hooks || [];
  const alreadyRegistered = hooks.find((h) => h.url === webhookUrl || (h.targetUrl === webhookUrl));

  if (alreadyRegistered) {
    ok(`Already registered (ID: ${alreadyRegistered.id || alreadyRegistered._id})`);
    return true;
  }

  // Register new webhook
  const { ok: isOk, json, status, text } = await fetchJSON(
    'https://rest.gohighlevel.com/v1/hooks/',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
      body: JSON.stringify({
        url: webhookUrl,
        locationId: GHL_LOCATION_ID,
        events: ['ContactCreate', 'ContactUpdate'],
      }),
    }
  );

  if (isOk && json) {
    ok(`Registered! (ID: ${json.id || json._id || 'ok'})`);
    return true;
  }

  // GHL v1 might not support /hooks/ for all API key types
  warn(`GHL webhook registration returned ${status}`);
  if (json?.message) info(`Response: ${json.message}`);
  warn('Manual setup needed: GHL → Automations → New Workflow');
  info(`Trigger: "Contact Created" → Action: "Webhook" → URL: ${webhookUrl}`);
  return false;
}

// ---- Step 4: Register JT Webhook (JT → GHL) ----
async function registerJTWebhook() {
  console.log(`\n${BOLD}Step 4: Register JT → GHL Webhook${RESET}`);

  const webhookUrl = `${APP_URL}/api/webhooks/jobtread?secret=${WEBHOOK_SECRET}`;
  info(`URL: ${webhookUrl}`);

  // Try multiple GraphQL mutation names — JT's schema varies
  const mutations = [
    {
      name: 'createWebhookSubscription',
      query: `mutation($input: CreateWebhookSubscriptionInput!) {
        createWebhookSubscription(input: $input) { id url }
      }`,
    },
    {
      name: 'createConnector',
      query: `mutation($input: CreateConnectorInput!) {
        createConnector(input: $input) { id url }
      }`,
    },
    {
      name: 'createWebhook',
      query: `mutation($input: CreateWebhookInput!) {
        createWebhook(input: $input) { id url }
      }`,
    },
  ];

  const input = {
    url: webhookUrl,
    events: ['contact.created', 'contact.updated', 'CONTACT_CREATED', 'CONTACT_UPDATED'],
    name: 'BetterBoss GHL Sync',
  };

  for (const mutation of mutations) {
    const { json } = await fetchJSON('https://api.jobtread.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${JT_TOKEN}` },
      body: JSON.stringify({ query: mutation.query, variables: { input } }),
    });

    if (json?.data?.[mutation.name]?.id) {
      ok(`Registered via ${mutation.name} (ID: ${json.data[mutation.name].id})`);
      return true;
    }

    // If the mutation doesn't exist, continue to next
    const errMsg = json?.errors?.[0]?.message || '';
    if (errMsg.includes('Cannot query') || errMsg.includes('Unknown type') || errMsg.includes('not found')) {
      continue;
    }
  }

  // Also try: list existing webhooks to check
  for (const queryName of ['webhookSubscriptions', 'connectors', 'webhooks']) {
    const { json } = await fetchJSON('https://api.jobtread.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${JT_TOKEN}` },
      body: JSON.stringify({
        query: `{ ${queryName} { data { id name url } } }`,
      }),
    });

    const items = json?.data?.[queryName]?.data;
    if (Array.isArray(items)) {
      const existing = items.find((i) => i.url === webhookUrl || i.name === 'BetterBoss GHL Sync');
      if (existing) {
        ok(`Already registered via ${queryName} (ID: ${existing.id})`);
        return true;
      }
    }
  }

  warn('JT does not support programmatic webhook registration via its current API');
  warn('Manual setup needed: JT → Workflows → New Workflow');
  info(`Trigger: "When a Contact is Created"`);
  info(`Action:  "Send Webhook" → POST → URL: ${webhookUrl}`);
  return false;
}

// ---- Step 5: Verify endpoints are reachable ----
async function verifyEndpoints() {
  console.log(`\n${BOLD}Step 5: Verify Endpoints${RESET}`);

  const healthUrl = `${APP_URL}/api/webhooks/health?secret=${WEBHOOK_SECRET}`;

  try {
    const { ok: isOk, json } = await fetchJSON(healthUrl);
    if (isOk && json?.status === 'ready') {
      ok('Health endpoint reports: ready');
      return true;
    } else if (isOk) {
      warn(`Health endpoint reports: ${json?.status || 'unknown'}`);
      if (json?.missing?.length > 0) info(`Missing on server: ${json.missing.join(', ')}`);
      return true;
    }
  } catch {
    warn(`Could not reach ${APP_URL} — is the app deployed?`);
    info('Deploy to Vercel first, then re-run this script.');
    return false;
  }
  return false;
}

// ---- Main ----
async function main() {
  try {
    await validateCredentials();

    const jtOk = await validateJobTread();
    const ghlOk = await validateGHL();

    if (!jtOk || !ghlOk) {
      console.log(`\n${RED}${BOLD}Setup incomplete — fix the errors above and retry.${RESET}\n`);
      process.exit(1);
    }

    const ghlHookOk = await registerGHLWebhook();
    const jtHookOk = await registerJTWebhook();

    const appOk = await verifyEndpoints();

    // ---- Summary ----
    console.log(`\n${BOLD}━━━ Summary ━━━${RESET}`);
    ok(`JobTread API: Connected`);
    ok(`GoHighLevel API: Connected`);

    if (ghlHookOk) {
      ok(`GHL → JT webhook: Registered`);
    } else {
      warn(`GHL → JT webhook: Manual setup needed (see above)`);
    }

    if (jtHookOk) {
      ok(`JT → GHL webhook: Registered`);
    } else {
      warn(`JT → GHL webhook: Manual setup needed (see above)`);
    }

    if (appOk) {
      ok(`App endpoint: Reachable`);
    } else {
      warn(`App endpoint: Not reachable yet — deploy first`);
    }

    if (ghlHookOk && jtHookOk && appOk) {
      console.log(`\n${GREEN}${BOLD}All connectors registered! Lead sync is live.${RESET}`);
      console.log(`${DIM}Create a contact in JT → it appears in GHL within seconds, and vice versa.${RESET}\n`);
    } else if (!ghlHookOk || !jtHookOk) {
      console.log(`\n${YELLOW}${BOLD}APIs connected. Complete the manual webhook steps above to finish.${RESET}\n`);
      console.log(`${DIM}Webhook URLs to paste:${RESET}`);
      console.log(`  JT → GHL: ${APP_URL}/api/webhooks/jobtread?secret=${WEBHOOK_SECRET}`);
      console.log(`  GHL → JT: ${APP_URL}/api/webhooks/ghl?secret=${WEBHOOK_SECRET}\n`);
    }
  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

main();
