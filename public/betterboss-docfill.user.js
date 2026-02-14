// ==UserScript==
// @name         Better Boss — DocFill for JobTread
// @namespace    https://mybetterboss.ai
// @version      1.0.1
// @description  Auto-generate proposals, contracts & SOWs inside JobTread. Set up your business profile once, then instantly copy perfectly formatted descriptions and footers.
// @author       Better Boss (mybetterboss.ai)
// @match        https://app.jobtread.com/*
// @icon         https://mybetterboss.ai/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @homepageURL  https://mybetterboss.ai
// @supportURL   https://mybetterboss.ai
// @updateURL    https://mybetterboss.ai/betterboss-docfill.user.js
// @downloadURL  https://mybetterboss.ai/betterboss-docfill.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ==========================================================================
  // UNIVERSAL STORAGE — works with Tampermonkey (GM_*) or localStorage
  // ==========================================================================

  const HAS_GM = (typeof GM_getValue !== 'undefined' && typeof GM_setValue !== 'undefined');

  const store = {
    get(key, fallback) {
      try {
        if (HAS_GM) return GM_getValue(key, fallback);
        const raw = localStorage.getItem('bb_' + key);
        if (raw === null) return fallback;
        try { return JSON.parse(raw); } catch { return raw; }
      } catch { return fallback; }
    },
    set(key, val) {
      try {
        if (HAS_GM) { GM_setValue(key, val); return true; }
        localStorage.setItem('bb_' + key, JSON.stringify(val));
        return true;
      } catch { return false; }
    }
  };

  // ==========================================================================
  // INJECT STYLES — works with GM_addStyle or plain <style> injection
  // ==========================================================================

  const CSS = `
    #bb-autofill-btn{position:fixed;bottom:24px;right:24px;z-index:999999}
    .bb-fab{width:52px;height:52px;border-radius:50%;border:none;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(249,115,22,.4),0 2px 6px rgba(0,0,0,.2);transition:all .2s}
    .bb-fab:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(249,115,22,.5)}
    .bb-fab:active{transform:scale(.95)}
    .bb-fab__text{font-weight:800;font-size:16px;letter-spacing:-.04em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}

    #bb-autofill-panel{position:fixed;top:0;right:0;bottom:0;z-index:1000000;animation:bb-in .25s ease-out}
    @keyframes bb-in{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

    .bb-panel{width:380px;height:100%;background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.5);border-left:2px solid #f97316}
    .bb-panel__header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#111;border-bottom:1px solid #262626;flex-shrink:0}
    .bb-panel__brand{display:flex;align-items:center;gap:10px}
    .bb-logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .bb-panel__header h3{margin:0;font-size:15px;font-weight:700;color:#fff}
    .bb-accent{color:#f97316}
    .bb-panel__close{background:none;border:none;color:#737373;font-size:22px;cursor:pointer;padding:0 4px;line-height:1;transition:color .15s}
    .bb-panel__close:hover{color:#f97316}
    .bb-panel__body{flex:1;overflow-y:auto;padding:16px 20px}
    .bb-panel__footer{padding:10px 20px;border-top:1px solid #262626;text-align:center;font-size:10px;color:#525252;flex-shrink:0}
    .bb-panel__footer a{color:#f97316;text-decoration:none}
    .bb-panel__footer a:hover{text-decoration:underline}

    .bb-profile-badge{display:flex;align-items:center;gap:10px}
    .bb-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .bb-profile-badge strong{display:block;font-size:13px;color:#fff}
    .bb-profile-badge span{display:block;font-size:11px;color:#737373}

    .bb-notice{padding:10px 12px;border-radius:6px;font-size:12px;line-height:1.4}
    .bb-notice--warn{background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.25);color:#fb923c}
    .bb-notice a{color:#f97316;font-weight:600;cursor:pointer}

    .bb-section{margin-bottom:16px}
    .bb-section h4{margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#f97316}
    .bb-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
    .bb-row h4{margin:0!important}
    .bb-divider{height:1px;background:#262626;margin:16px 0}

    .bb-field{margin-bottom:10px}
    .bb-field label{display:block;margin-bottom:3px;font-size:11px;color:#a3a3a3;font-weight:500}
    .bb-field input,.bb-field textarea{width:100%;padding:8px 10px;background:#171717;border:1px solid #333;border-radius:6px;color:#e5e5e5;font-size:13px;font-family:inherit;transition:border-color .15s;box-sizing:border-box}
    .bb-field input:focus,.bb-field textarea:focus{outline:none;border-color:#f97316;box-shadow:0 0 0 2px rgba(249,115,22,.15)}
    .bb-field input::placeholder,.bb-field textarea::placeholder{color:#525252}
    .bb-field textarea{font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:11px;line-height:1.5;resize:vertical;min-height:60px}

    .bb-hint{margin:0 0 8px;font-size:11px;color:#737373;line-height:1.4}

    .bb-output{background:#171717;border:1px solid #333;border-radius:6px;padding:12px;font-size:11px;line-height:1.5;color:#d4d4d4;white-space:pre-wrap;word-wrap:break-word;max-height:300px;overflow-y:auto;font-family:'SF Mono','Fira Code',Consolas,monospace;user-select:all;cursor:text}
    .bb-output--sm{max-height:80px}
    .bb-output::-webkit-scrollbar{width:5px}
    .bb-output::-webkit-scrollbar-track{background:transparent}
    .bb-output::-webkit-scrollbar-thumb{background:#404040;border-radius:3px}

    .bb-btn{display:inline-block;padding:8px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .15s;text-align:center}
    .bb-btn--primary{display:block;width:100%;padding:12px 16px;font-size:13px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border-radius:8px}
    .bb-btn--primary:hover{background:linear-gradient(135deg,#fb923c,#f97316);box-shadow:0 2px 12px rgba(249,115,22,.3)}
    .bb-btn--copy{background:#171717;color:#f97316;border:1px solid #333;padding:5px 12px;font-size:11px;flex-shrink:0}
    .bb-btn--copy:hover{background:#262626;border-color:#f97316}
    .bb-btn--copied{background:rgba(34,197,94,.15)!important;border-color:#22c55e!important;color:#4ade80!important}
    .bb-btn--error{background:rgba(239,68,68,.15)!important;border-color:#ef4444!important;color:#f87171!important}
    .bb-btn--sm{background:transparent;color:#a3a3a3;padding:5px 10px;font-size:11px;border:1px solid #333;border-radius:6px}
    .bb-btn--sm:hover{color:#f97316;border-color:#f97316}
    .bb-btn--danger{color:#ef4444;border-color:rgba(239,68,68,.3)}
    .bb-btn--danger:hover{color:#ef4444;border-color:#ef4444;background:rgba(239,68,68,.08)}
    .bb-btn--ghost{background:transparent;color:#737373;border:none;padding:5px 0;font-size:11px}
    .bb-btn--ghost:hover{color:#f97316}

    .bb-panel__body::-webkit-scrollbar{width:6px}
    .bb-panel__body::-webkit-scrollbar-track{background:transparent}
    .bb-panel__body::-webkit-scrollbar-thumb{background:#333;border-radius:3px}

    .bb-tabs{display:flex;gap:0;border-bottom:1px solid #262626;margin-bottom:16px}
    .bb-tab{padding:8px 16px;font-size:12px;font-weight:600;color:#737373;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
    .bb-tab:hover{color:#e5e5e5}
    .bb-tab--active{color:#f97316;border-bottom-color:#f97316}

    .bb-settings-card{background:#111;border:1px solid #262626;border-radius:8px;padding:16px;margin-bottom:12px}
    .bb-settings-card h5{margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#f97316}
    .bb-frow{display:flex;gap:10px}
    .bb-frow .bb-field{flex:1}
    .bb-faction{display:flex;align-items:center;gap:10px;margin-top:8px}
    .bb-saved{font-size:12px;color:#22c55e;font-weight:500;opacity:0;transition:opacity .3s}
    .bb-saved--show{opacity:1}

    .bb-tags{margin-bottom:8px}
    .bb-tags strong{font-size:11px;color:#a3a3a3;display:block;margin-bottom:4px}
    .bb-tag{display:inline-block;padding:2px 6px;background:#1a1a1a;border:1px solid #333;border-radius:3px;font-size:10px;color:#f97316;font-family:'SF Mono',Menlo,monospace;cursor:pointer;transition:all .15s;margin:0 3px 3px 0}
    .bb-tag:hover{background:rgba(249,115,22,.1);border-color:#f97316}
  `;

  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(CSS);
  } else {
    const s = document.createElement('style');
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  const BUTTON_ID = 'bb-autofill-btn';
  const PANEL_ID  = 'bb-autofill-panel';
  const BRAND     = 'Better Boss';

  let currentJobInfo = null;
  let currentCustomerInfo = null;

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  function log(...a) { console.log('[Better Boss]', ...a); }

  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function getInitials(name) {
    if (!name) return 'BB';
    const p = name.trim().split(/\s+/);
    return p.length >= 2
      ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
      : p[0].substring(0, 2).toUpperCase();
  }

  function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ==========================================================================
  // STORAGE WRAPPERS (use universal store)
  // ==========================================================================

  function getProfile() {
    try {
      const raw = store.get('profile', null);
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    } catch (e) { log('getProfile error:', e); return {}; }
  }

  function saveProfile(profile) { return store.set('profile', profile); }

  function getDescTemplate() {
    return store.get('descriptionTemplate', '') || getDefaultDescTemplate();
  }

  function getFooterTemplate() {
    return store.get('footerTemplate', '') || getDefaultFooterTemplate();
  }

  function saveTemplates(desc, footer) {
    return store.set('descriptionTemplate', desc) && store.set('footerTemplate', footer);
  }

  // ==========================================================================
  // PAGE DETECTION
  // ==========================================================================

  const DOC_PATHS = [
    '/jobs/','/documents/','/invoices/','/estimates/','/proposals/',
    '/contracts/','/purchase-orders/','/change-orders/','/work-orders/',
    '/bills/','/budget','/quotes/'
  ];
  const EXCLUDE_PATHS = ['/settings','/plans','/catalog'];

  function isRelevantPage() {
    return DOC_PATHS.some(d => window.location.pathname.includes(d));
  }
  function isExcludedPage() {
    return EXCLUDE_PATHS.some(d => window.location.pathname.includes(d));
  }

  // ==========================================================================
  // INFO EXTRACTION
  // ==========================================================================

  function extractJobInfo() {
    const info = { jobName:'', jobNumber:'', jobAddress:'', jobId:'' };
    try {
      for (const h of document.querySelectorAll('h1, h2')) {
        const t = h.textContent.trim();
        if (t.length > 2 && t.length < 200) { info.jobName = t; break; }
      }
      if (!info.jobName) {
        const m = document.title.match(/^(.+?)(?:\s*[-|]\s*JobTread)?$/i);
        if (m) info.jobName = m[1].trim();
      }
      const nm = document.body.innerText.match(/(?:Job\s*#?\s*|#)(\d{3,})/i);
      if (nm) info.jobNumber = nm[1];
      const id = window.location.pathname.match(/\/jobs\/([^/]+)/);
      if (id) info.jobId = id[1];
    } catch (e) { log('extractJobInfo error:', e); }
    return info;
  }

  function extractCustomerInfo() {
    const info = { customerName:'', company:'', email:'', phone:'' };
    try {
      const txt = document.body.innerText;
      const em = txt.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (em) info.email = em[0];
      const ph = txt.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (ph) info.phone = ph[0];
    } catch (e) { log('extractCustomerInfo error:', e); }
    return info;
  }

  // ==========================================================================
  // TEMPLATE ENGINE
  // ==========================================================================

  function getDefaultDescTemplate() {
    return `*JobTread Implementation Agreement \u2014 *^{{company}}^**
*Client:* *^{{company}}^* (\u201CClient\u201D) \u2022 *Contact:* *^{{customerName}}^*
*Provider:* {{bizName}} (\u201CProvider\u201D)
*Project:* Full JobTread build-out operating system for remodeling and construction
*Term:* 30 business day implementation from kickoff
*Total Contract Value:* *$10,000 USD*
*Financing:* See Section 6
##1) Objective
Deploy a single, structured JobTread OS that speeds proposals, reduces chaos, and gives clear visibility across jobs and finances.
##2) Scope of Work
####2.1 Meetings & Communication
- 2-hour kickoff meeting
- 1 midway checkpoint meeting
- 1 final meeting
- Chat/message communication in JobTread with 24-hour email support
####2.2 Implementation Schedule
Custom implementation schedule built inside JobTread to track progress and milestones.
####2.3 Cost Catalog Build
Complete cost catalog build including suppliers, labor, materials, cost groups, product and material catalog uploaded, standardized, and linked to cost codes.
####2.4 Job Costing Framework
Job costing review including units, cost codes, and cost types configured for accurate project tracking.
####2.5 Custom Views
Custom views across all modules including jobs, customers, catalog, and more for streamlined navigation.
####2.6 Estimating Engine
- Parameters and formulas for quantity formulas in estimate templates
- Measurement integration (RENDR, Hover, or EagleView) OR setup for manual parameter input
- 3-5 estimate templates with cost groups, formulas, and parameter fields for fast, accurate range-based pricing
####2.7 Document Templates
Document template build-out including details, design, and custom cover PDFs. Proposals, Closeout Packets, Certificates of Completion, Contracts, and Change Orders configured and branded.
####2.8 Dashboards
1-2 custom dashboards with live metrics by role\u2014estimating accuracy, job costs, and pipeline status.
####2.9 Automation Suite
Up to 5 custom notifications OR 2-4 workflows as needed for client and trade partner communication including reminders, scheduling, and follow-ups.
####2.10 SOP Guides
5-10 SOP guides with refined standard operating procedures embedded directly in JobTread, built for repeatability and automation.
####2.11 Integration Review
Integration review (QuickBooks Online, etc.) to ensure connection is solid. Note: Provider is not an accountant but will verify integration functionality.
####2.12 Training & Handoff
Role-based videos, SOP reference map, and admin maintenance guide for full control post-launch.
##3) Scope Exclusions (Priced Separately)
- Custom API development
- Data migrations (e.g., CoConstruct migration = +$1,000 USD)
- GHL CRM integration
- Build out of integrated tools
- In-house takeoff tooling
##4) Process Assumptions
- Estimating: fixed cost and range-based models
- Standard JobTread features only; no external code or plug-ins
- Can help implement tools like RENDR or prebuilt integrations with JobTread
##5) Timeline (30 Business Days)
- Week 1: Kickoff, access setup, system mapping
- Week 2: Build templates, workflows, and automations; midpoint review
- Week 3: Finalize documents, dashboards, and schedules
- Week 4: QA, training videos, admin guide, go-live
##6) Pricing & Financing
*Fixed Fee*: $10,000 USD
*Financing options:*
6 mo: $1,666.67/mo \u2014 no interest
12 mo: $879.13/mo \u2014 ~$549.56 interest
36 mo: $322.63/mo \u2014 ~$1,614.90 interest
^Final terms subject to credit and approvals.^
##7) Payment Terms
- *100% due at kickoff* to schedule and start work
- If financed, the financing schedule replaces upfront payment
##8) Client Responsibilities
- Add Provider as a JobTread user and grant full access within 2 business days
- Provide reference materials (specs, selections, budgets, contract templates)
- Designate a decision-maker for reviews/approvals within 2 business days
- Attend kickoff and midpoint review
##9) Change Orders
Any change that adds scope, exceeds revision limits, or extends the timeline will require a change order and separate pricing.
##10) Support & Additional Work
- Post-go-live support available at an additional fee
- New projects outside this scope require a separate SOW
##11) Intellectual Property
- Client owns deliverables upon full payment
- Provider retains reusable frameworks
- No disclosure of Client data without consent
##12) Data Protection
Client is responsible for independent backups. Provider is not liable for data loss from Client actions or third-party outages.
##13) Limitation of Liability
Liability capped at total fees paid in prior 6 months. No consequential or special damages.
##14) Force Majeure
No liability for delays caused by events outside reasonable control.
##15) Confidentiality
Non-public information remains confidential and must be handled with reasonable care.
##16) Indemnification
Client indemnifies Provider against third-party claims from misuse or breach.
##17) Dispute Resolution & Governing Law
30-day informal negotiation, then binding arbitration in Denver, CO under AAA rules. Colorado law governs.
##18) Entire Agreement & Amendments
This document is the full agreement; changes require written approval.
##19) Counterparts & E-Signature
This agreement may be signed electronically and in counterparts.
##20) Acceptance & Signature
This Agreement is binding upon Client\u2019s signature below. *{{bizName}}\u2019s acceptance is deemed upon (a) commencement of services or (b) receipt of the first payment.* No additional Provider signature required.`;
  }

  function getDefaultFooterTemplate() {
    return '{{#customerName}}*Prepared for:* {{customerName}}{{/customerName}}' +
      '{{#company}} | *{{company}}*{{/company}}' +
      '{{#jobName}} | Project: {{jobName}}{{/jobName}}' +
      '{{#jobNumber}} | Job #{{jobNumber}}{{/jobNumber}}' +
      '\n{{#bizName}}*{{bizName}}*{{/bizName}}' +
      '{{#bizPhone}} | {{bizPhone}}{{/bizPhone}}' +
      '{{#bizEmail}} | {{bizEmail}}{{/bizEmail}}' +
      '{{#bizWebsite}} | {{bizWebsite}}{{/bizWebsite}}' +
      '{{#bizLicense}} | Lic #{{bizLicense}}{{/bizLicense}}';
  }

  function render(template, data) {
    let r = template;
    r = r.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, c) => {
      return (data[k] && data[k].toString().trim())
        ? c.replace(/\{\{(\w+)\}\}/g, (__, kk) => data[kk] || '')
        : '';
    });
    r = r.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] || '');
    return r.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ==========================================================================
  // CLIPBOARD
  // ==========================================================================

  async function copyText(text, btn) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (__) { ok = false; }
    }
    const orig = btn.textContent;
    if (ok) {
      btn.textContent = 'Copied!';
      btn.classList.add('bb-btn--copied');
    } else {
      btn.textContent = 'Failed \u2014 select & copy manually';
      btn.classList.add('bb-btn--error');
    }
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('bb-btn--copied', 'bb-btn--error');
    }, 2000);
  }

  // ==========================================================================
  // FLOATING BUTTON
  // ==========================================================================

  function createFAB() {
    if (document.getElementById(BUTTON_ID)) return;
    const el = document.createElement('div');
    el.id = BUTTON_ID;
    el.innerHTML = `<button class="bb-fab" title="${BRAND} DocFill" aria-label="Open ${BRAND} DocFill panel"><span class="bb-fab__text">BB</span></button>`;
    el.addEventListener('click', togglePanel);
    document.body.appendChild(el);
  }

  // ==========================================================================
  // PANEL
  // ==========================================================================

  let activeTab = 'generate';

  function togglePanel() {
    const ex = document.getElementById(PANEL_ID);
    if (ex) { ex.remove(); return; }
    buildPanel();
  }

  function flash(el) {
    el.classList.add('bb-saved--show');
    setTimeout(() => el.classList.remove('bb-saved--show'), 2000);
  }

  function buildPanel() {
    const job = currentJobInfo || extractJobInfo();
    const cust = currentCustomerInfo || extractCustomerInfo();
    currentJobInfo = job;
    currentCustomerInfo = cust;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="bb-panel">
        <div class="bb-panel__header">
          <div class="bb-panel__brand">
            <div class="bb-logo">BB</div>
            <div><h3>${BRAND} <span class="bb-accent">DocFill</span></h3></div>
          </div>
          <button class="bb-panel__close" id="bb-close" aria-label="Close panel">&times;</button>
        </div>
        <div class="bb-tabs">
          <button class="bb-tab bb-tab--active" data-tab="generate">DocFill</button>
          <button class="bb-tab" data-tab="settings">Settings</button>
        </div>
        <div class="bb-panel__body" id="bb-panel-body"></div>
        <div class="bb-panel__footer">
          ${BRAND} DocFill v1.0 &nbsp;\u00B7&nbsp;
          <a href="https://mybetterboss.ai" target="_blank" rel="noopener">mybetterboss.ai</a>
        </div>
      </div>`;

    document.body.appendChild(panel);

    panel.querySelectorAll('.bb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.bb-tab').forEach(t => t.classList.remove('bb-tab--active'));
        tab.classList.add('bb-tab--active');
        activeTab = tab.dataset.tab;
        renderTab();
      });
    });

    document.getElementById('bb-close').addEventListener('click', () => panel.remove());
    activeTab = 'generate';
    renderTab();
  }

  function renderTab() {
    const body = document.getElementById('bb-panel-body');
    if (!body) return;
    if (activeTab === 'generate') renderGenerateTab(body);
    else renderSettingsTab(body);
  }

  // ---------- GENERATE TAB ----------

  function renderGenerateTab(body) {
    const job = currentJobInfo || {};
    const cust = currentCustomerInfo || {};
    const p = getProfile();
    const loggedIn = !!(p && p.ownerName);

    const profileHTML = loggedIn
      ? `<div class="bb-profile-badge">
           <div class="bb-avatar">${getInitials(p.ownerName)}</div>
           <div><strong>${esc(p.ownerName)}</strong><span>${esc(p.bizName||'')}</span></div>
         </div>`
      : `<div class="bb-notice bb-notice--warn">
           No profile set up yet.
           <a id="bb-go-settings">Open Settings</a> to add your business info.
         </div>`;

    body.innerHTML = `
      <div class="bb-section">${profileHTML}</div>
      <div class="bb-divider"></div>
      <div class="bb-section">
        <h4>Client &amp; Job Details</h4>
        <div class="bb-field">
          <label for="bb-company">Client Company</label>
          <input id="bb-company" type="text" value="${esc(cust.company)}" placeholder="e.g. Smith Roofing LLC" maxlength="200"/>
        </div>
        <div class="bb-field">
          <label for="bb-name">Client Contact</label>
          <input id="bb-name" type="text" value="${esc(cust.customerName)}" placeholder="e.g. John Smith" maxlength="120"/>
        </div>
        <div class="bb-field">
          <label for="bb-job">Job Name</label>
          <input id="bb-job" type="text" value="${esc(job.jobName)}" placeholder="e.g. Roof Replacement \u2014 123 Main" maxlength="200"/>
        </div>
        <div class="bb-field">
          <label for="bb-jobnum">Job #</label>
          <input id="bb-jobnum" type="text" value="${esc(job.jobNumber)}" placeholder="e.g. 4821" maxlength="30"/>
        </div>
      </div>
      <div class="bb-divider"></div>
      <div class="bb-section">
        <div class="bb-row">
          <h4>Description</h4>
          <button class="bb-btn bb-btn--copy" id="bb-copy-desc">Copy Description</button>
        </div>
        <p class="bb-hint">Paste into the Description field on your document.</p>
        <div class="bb-output" id="bb-desc-out" tabindex="0" role="textbox" aria-readonly="true" aria-label="Generated description text"></div>
      </div>
      <div class="bb-divider"></div>
      <div class="bb-section">
        <div class="bb-row">
          <h4>Footer</h4>
          <button class="bb-btn bb-btn--copy" id="bb-copy-footer">Copy Footer</button>
        </div>
        <p class="bb-hint">Paste into the Footer field on your document.</p>
        <div class="bb-output bb-output--sm" id="bb-footer-out" tabindex="0" role="textbox" aria-readonly="true" aria-label="Generated footer text"></div>
      </div>
      <div class="bb-section">
        <button class="bb-btn bb-btn--primary" id="bb-regen">Regenerate</button>
      </div>`;

    document.getElementById('bb-regen').addEventListener('click', generate);
    document.getElementById('bb-copy-desc').addEventListener('click', function () {
      copyText(document.getElementById('bb-desc-out').getAttribute('data-raw')||'', this);
    });
    document.getElementById('bb-copy-footer').addEventListener('click', function () {
      copyText(document.getElementById('bb-footer-out').getAttribute('data-raw')||'', this);
    });

    const goSettings = document.getElementById('bb-go-settings');
    if (goSettings) {
      goSettings.addEventListener('click', (e) => {
        e.preventDefault();
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        panel.querySelectorAll('.bb-tab').forEach(t => t.classList.remove('bb-tab--active'));
        const settingsTab = panel.querySelector('[data-tab="settings"]');
        if (settingsTab) settingsTab.classList.add('bb-tab--active');
        activeTab = 'settings';
        renderTab();
      });
    }

    const debouncedGen = debounce(generate, 300);
    ['bb-company','bb-name','bb-job','bb-jobnum'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', debouncedGen);
    });

    generate();
  }

  function generate() {
    const p = getProfile();
    const data = {
      company:       document.getElementById('bb-company')?.value || '',
      customerName:  document.getElementById('bb-name')?.value || '',
      jobName:       document.getElementById('bb-job')?.value || '',
      jobNumber:     document.getElementById('bb-jobnum')?.value || '',
      jobAddress:    '', customerEmail: '', customerPhone: '',
      date:          new Date().toLocaleDateString(),
      bizName:       p.bizName || '',
      bizEmail:      p.bizEmail || '',
      bizPhone:      p.bizPhone || '',
      bizAddress:    p.bizAddress || '',
      bizWebsite:    p.bizWebsite || '',
      bizLicense:    p.bizLicense || '',
      ownerName:     p.ownerName || '',
    };

    const descText   = render(getDescTemplate(), data);
    const footerText = render(getFooterTemplate(), data);

    const dEl = document.getElementById('bb-desc-out');
    const fEl = document.getElementById('bb-footer-out');
    if (dEl) { dEl.setAttribute('data-raw', descText); dEl.textContent = descText; }
    if (fEl) { fEl.setAttribute('data-raw', footerText); fEl.textContent = footerText; }
  }

  // ---------- SETTINGS TAB ----------

  function renderSettingsTab(body) {
    const p = getProfile();
    const descTpl = getDescTemplate();
    const footerTpl = getFooterTemplate();

    body.innerHTML = `
      <div class="bb-section">
        <h4>Business Profile</h4>
        <div class="bb-settings-card">
          <div class="bb-frow">
            <div class="bb-field"><label>Your Name</label><input id="bb-s-name" value="${esc(p.ownerName)}" placeholder="e.g. Nick Peret" maxlength="120"/></div>
            <div class="bb-field"><label>Email</label><input id="bb-s-email" type="email" value="${esc(p.bizEmail)}" placeholder="e.g. nick@mybetterboss.ai" maxlength="200"/></div>
          </div>
          <div class="bb-frow">
            <div class="bb-field"><label>Company</label><input id="bb-s-company" value="${esc(p.bizName)}" placeholder="e.g. Better Boss" maxlength="200"/></div>
            <div class="bb-field"><label>Phone</label><input id="bb-s-phone" type="tel" value="${esc(p.bizPhone)}" placeholder="e.g. (303) 555-1234" maxlength="30"/></div>
          </div>
          <div class="bb-frow">
            <div class="bb-field"><label>Address</label><input id="bb-s-address" value="${esc(p.bizAddress)}" placeholder="e.g. Denver, CO" maxlength="300"/></div>
            <div class="bb-field"><label>Website</label><input id="bb-s-website" type="url" value="${esc(p.bizWebsite)}" placeholder="e.g. https://mybetterboss.ai" maxlength="200"/></div>
          </div>
          <div class="bb-field"><label>License #</label><input id="bb-s-license" value="${esc(p.bizLicense)}" placeholder="e.g. CON-12345" maxlength="60"/></div>
          <div class="bb-faction">
            <button class="bb-btn bb-btn--primary" style="width:auto;display:inline-block;padding:8px 20px;font-size:12px" id="bb-save-profile">Save Profile</button>
            <span class="bb-saved" id="bb-profile-saved">Saved!</span>
          </div>
        </div>
      </div>
      <div class="bb-divider"></div>
      <div class="bb-section">
        <h4>Description Template</h4>
        <p class="bb-hint">Use <code style="background:#1a1a1a;padding:1px 4px;border-radius:3px;font-size:10px;color:#f97316">{{variable}}</code> for values. <code style="background:#1a1a1a;padding:1px 4px;border-radius:3px;font-size:10px;color:#f97316">{{#var}}...{{/var}}</code> for conditional blocks.</p>
        <div class="bb-settings-card">
          <div class="bb-tags">
            <strong>Client/Job:</strong>
            <span class="bb-tag" data-v="company">company</span>
            <span class="bb-tag" data-v="customerName">customerName</span>
            <span class="bb-tag" data-v="jobName">jobName</span>
            <span class="bb-tag" data-v="jobNumber">jobNumber</span>
            <span class="bb-tag" data-v="date">date</span>
          </div>
          <div class="bb-tags">
            <strong>Your Business:</strong>
            <span class="bb-tag" data-v="bizName">bizName</span>
            <span class="bb-tag" data-v="bizEmail">bizEmail</span>
            <span class="bb-tag" data-v="bizPhone">bizPhone</span>
            <span class="bb-tag" data-v="bizAddress">bizAddress</span>
            <span class="bb-tag" data-v="bizWebsite">bizWebsite</span>
            <span class="bb-tag" data-v="bizLicense">bizLicense</span>
            <span class="bb-tag" data-v="ownerName">ownerName</span>
          </div>
          <div class="bb-field"><textarea id="bb-s-desc" rows="12" spellcheck="false">${esc(descTpl)}</textarea></div>
          <button class="bb-btn bb-btn--ghost" id="bb-reset-desc">Reset to Default</button>
        </div>
      </div>
      <div class="bb-section">
        <h4>Footer Template</h4>
        <div class="bb-settings-card">
          <div class="bb-field"><textarea id="bb-s-footer" rows="4" spellcheck="false">${esc(footerTpl)}</textarea></div>
          <button class="bb-btn bb-btn--ghost" id="bb-reset-footer">Reset to Default</button>
        </div>
      </div>
      <div class="bb-section">
        <div class="bb-faction">
          <button class="bb-btn bb-btn--primary" style="width:auto;display:inline-block;padding:8px 20px;font-size:12px" id="bb-save-tpl">Save Templates</button>
          <span class="bb-saved" id="bb-tpl-saved">Templates saved!</span>
        </div>
      </div>
      <div class="bb-divider"></div>
      <div class="bb-section">
        <h4>Data Management</h4>
        <div class="bb-settings-card">
          <p class="bb-hint" style="margin-bottom:8px">Export your profile + templates as a backup. Import to restore.</p>
          <div class="bb-faction">
            <button class="bb-btn bb-btn--sm" id="bb-export">Export Data</button>
            <label class="bb-btn bb-btn--sm" style="cursor:pointer" for="bb-import-file">Import Data<input type="file" id="bb-import-file" accept=".json" style="display:none"/></label>
            <button class="bb-btn bb-btn--sm bb-btn--danger" id="bb-clear-data">Clear All Data</button>
          </div>
        </div>
      </div>`;

    document.getElementById('bb-save-profile').addEventListener('click', () => {
      const profile = {
        ownerName:  document.getElementById('bb-s-name').value.trim(),
        bizEmail:   document.getElementById('bb-s-email').value.trim(),
        bizName:    document.getElementById('bb-s-company').value.trim(),
        bizPhone:   document.getElementById('bb-s-phone').value.trim(),
        bizAddress: document.getElementById('bb-s-address').value.trim(),
        bizWebsite: document.getElementById('bb-s-website').value.trim(),
        bizLicense: document.getElementById('bb-s-license').value.trim(),
      };
      if (saveProfile(profile)) {
        flash(document.getElementById('bb-profile-saved'));
      } else {
        alert('Failed to save profile.');
      }
    });

    document.getElementById('bb-save-tpl').addEventListener('click', () => {
      if (saveTemplates(document.getElementById('bb-s-desc').value, document.getElementById('bb-s-footer').value)) {
        flash(document.getElementById('bb-tpl-saved'));
      } else {
        alert('Failed to save templates.');
      }
    });

    document.getElementById('bb-reset-desc').addEventListener('click', () => {
      document.getElementById('bb-s-desc').value = getDefaultDescTemplate();
    });
    document.getElementById('bb-reset-footer').addEventListener('click', () => {
      document.getElementById('bb-s-footer').value = getDefaultFooterTemplate();
    });

    body.querySelectorAll('.bb-tag[data-v]').forEach(tag => {
      tag.addEventListener('click', () => {
        const v = `{{${tag.dataset.v}}}`;
        const ta = document.getElementById('bb-s-desc');
        if (!ta) return;
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + v + ta.value.substring(e);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = s + v.length;
      });
    });

    document.getElementById('bb-export').addEventListener('click', () => {
      const data = {
        profile: getProfile(),
        descriptionTemplate: getDescTemplate(),
        footerTemplate: getFooterTemplate(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'betterboss-docfill-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('bb-import-file').addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data || typeof data !== 'object') throw new Error('Invalid format');
          if (data.profile) saveProfile(data.profile);
          if (data.descriptionTemplate) store.set('descriptionTemplate', data.descriptionTemplate);
          if (data.footerTemplate) store.set('footerTemplate', data.footerTemplate);
          alert('Data imported! Reloading panel...');
          renderSettingsTab(body);
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('bb-clear-data').addEventListener('click', () => {
      if (!confirm('Clear all DocFill data? This removes your profile and templates.')) return;
      store.set('profile', {});
      store.set('descriptionTemplate', '');
      store.set('footerTemplate', '');
      alert('All data cleared.');
      renderSettingsTab(body);
    });
  }

  // ==========================================================================
  // SPA URL WATCHER
  // ==========================================================================

  function watchURL() {
    let last = window.location.href;
    const check = () => {
      if (window.location.href !== last) {
        last = window.location.href;
        currentJobInfo = currentCustomerInfo = null;
        const p = document.getElementById(PANEL_ID);
        if (p) p.remove();
        const b = document.getElementById(BUTTON_ID);
        if (b) b.remove();
        onPageChange();
      }
    };
    const origPush = history.pushState;
    history.pushState = function (...a) { origPush.apply(this, a); check(); };
    const origReplace = history.replaceState;
    history.replaceState = function (...a) { origReplace.apply(this, a); check(); };
    window.addEventListener('popstate', check);
  }

  function onPageChange() {
    if (!isExcludedPage() && isRelevantPage()) createFAB();
  }

  // ==========================================================================
  // INIT
  // ==========================================================================

  const isBookmarklet = !HAS_GM && !!window.__bbDocFillBookmarklet;

  function init() {
    log('DocFill v1.0.1 loaded on', window.location.href, HAS_GM ? '(Tampermonkey)' : '(Bookmarklet)');

    // Expose toggle function so the bookmarklet can re-open the panel on subsequent clicks
    window.__bbDocFillToggle = togglePanel;

    const hasRun = store.get('hasRunBefore', false);
    if (!hasRun) {
      store.set('hasRunBefore', true);
      log('First run — navigate to a job or document page to get started');
    }

    if (isBookmarklet) {
      // Bookmarklet: always show FAB and immediately open the panel
      createFAB();
      togglePanel();
    } else {
      onPageChange();
    }

    watchURL();

    const debouncedCheck = debounce(() => {
      if (!document.getElementById(BUTTON_ID) && (isBookmarklet || (!isExcludedPage() && isRelevantPage()))) {
        createFAB();
      }
    }, 500);
    const obs = new MutationObserver(debouncedCheck);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
