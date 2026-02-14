// =============================================================================
// Better Boss — DocFill v3.1
// https://better-boss.ai
//
// Auto-populate document description + footer for JobTread.
// Pulls all fields from the JT page automatically — zero typing.
// =============================================================================

(function () {
  'use strict';

  const VERSION = '3.1.0';
  const PANEL_ID = 'bb-panel';
  const TRIGGER_ID = 'bb-trigger';

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function debounce(fn, ms) {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  }

  function initials(name) {
    if (!name) return 'BB';
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  function toast(msg, type = 'success') {
    let el = document.getElementById('bb-toast');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'bb-toast';
    el.className = 'bb-toast bb-toast--' + type;
    el.innerHTML = (type === 'success'
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    ) + ' ' + esc(msg);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('bb-toast--show'));
    setTimeout(() => {
      el.classList.remove('bb-toast--show');
      setTimeout(() => el.remove(), 300);
    }, 2200);
  }

  // ---------------------------------------------------------------------------
  // Default templates
  // ---------------------------------------------------------------------------

  function defaultDescTemplates() {
    return [
      {
        id: 'sow',
        name: 'Implementation SOW',
        body: `*JobTread Implementation Agreement — *^{{company}}^**
*Client:* *^{{company}}^* ("Client") • *Contact:* *^{{customerName}}^*
*Provider:* {{bizName}} ("Provider")
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
1-2 custom dashboards with live metrics by role—estimating accuracy, job costs, and pipeline status.
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
6 mo: $1,666.67/mo — no interest
12 mo: $879.13/mo — ~$549.56 interest
36 mo: $322.63/mo — ~$1,614.90 interest
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
This Agreement is binding upon Client's signature below. *{{bizName}}'s acceptance is deemed upon (a) commencement of services or (b) receipt of the first payment.* No additional Provider signature required.`,
      },
      {
        id: 'proposal',
        name: 'Proposal',
        body: `## Proposal — {{jobName}}

*Prepared for:* {{customerName}}{{#company}} | {{company}}{{/company}}
*Prepared by:* {{bizName}}
*Date:* {{date}}

---

### Project Overview
[Describe the project scope, objectives, and deliverables here.]

### Scope of Work
- [Line item 1]
- [Line item 2]
- [Line item 3]

### Exclusions
- [Items NOT included in this proposal]

### Timeline
- Start: [Date]
- Completion: [Date]

### Pricing
| Item | Cost |
|------|------|
| Materials | $0.00 |
| Labor | $0.00 |
| *Total* | *$0.00* |

### Payment Schedule
- 50% deposit upon acceptance
- 25% at midpoint
- 25% upon completion

### Terms & Conditions
- This proposal is valid for 30 days
- Changes to scope require a written change order
- All work performed per local building codes and permits

---
*{{bizName}}* | {{bizPhone}} | {{bizEmail}}`,
      },
      {
        id: 'change_order',
        name: 'Change Order',
        body: `## Change Order

*Project:* {{jobName}}{{#jobNumber}} (Job #{{jobNumber}}){{/jobNumber}}
*Client:* {{customerName}}{{#company}} | {{company}}{{/company}}
*Contractor:* {{bizName}}
*Date:* {{date}}

---

### Description of Change
[Describe the requested change in detail.]

### Reason for Change
[Explain why this change is needed.]

### Cost Adjustment
| Item | Amount |
|------|--------|
| Additional Materials | $0.00 |
| Additional Labor | $0.00 |
| *Change Order Total* | *$0.00* |

### Schedule Impact
[Describe any timeline changes.]

### Authorization
This change order becomes part of the original contract upon signature.

Client Signature: _________________________ Date: _________
{{bizName}} Signature: _________________________ Date: _________`,
      },
      {
        id: 'blank',
        name: 'Blank',
        body: '',
      },
    ];
  }

  function defaultFooterTemplates() {
    return [
      {
        id: 'full',
        name: 'Full Contact',
        body: '{{#customerName}}*Prepared for:* {{customerName}}{{/customerName}}{{#company}} | *{{company}}*{{/company}}{{#jobName}} | Project: {{jobName}}{{/jobName}}{{#jobNumber}} | Job #{{jobNumber}}{{/jobNumber}}\n{{#bizName}}*{{bizName}}*{{/bizName}}{{#bizPhone}} | {{bizPhone}}{{/bizPhone}}{{#bizEmail}} | {{bizEmail}}{{/bizEmail}}{{#bizWebsite}} | {{bizWebsite}}{{/bizWebsite}}{{#bizLicense}} | Lic #{{bizLicense}}{{/bizLicense}}',
      },
      {
        id: 'minimal',
        name: 'Minimal',
        body: '{{#bizName}}*{{bizName}}*{{/bizName}}{{#bizPhone}} | {{bizPhone}}{{/bizPhone}}',
      },
      {
        id: 'blank',
        name: 'None',
        body: '',
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  let _data = null;

  function defaults() {
    return {
      profile: {},
      descTemplates: defaultDescTemplates(),
      footerTemplates: defaultFooterTemplates(),
      activeDesc: 'sow',
      activeFooter: 'full',
    };
  }

  function load() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (r) => {
        if (chrome.runtime.lastError || !r || !r.descTemplates) {
          _data = defaults();
          chrome.storage.local.set(_data);
        } else {
          _data = r;
          const d = defaults();
          let needSave = false;
          for (const k of Object.keys(d)) {
            if (_data[k] === undefined) { _data[k] = d[k]; needSave = true; }
          }
          if (needSave) chrome.storage.local.set(_data);
        }
        resolve(_data);
      });
    });
  }

  function save(key, val) {
    _data[key] = val;
    chrome.storage.local.set({ [key]: val });
  }

  // ---------------------------------------------------------------------------
  // Smart JT page scraper — auto-pull everything
  // ---------------------------------------------------------------------------

  const DOC_PATHS = ['/jobs/', '/documents/', '/invoices/', '/estimates/', '/proposals/', '/contracts/', '/purchase-orders/', '/change-orders/', '/work-orders/', '/bills/', '/budget', '/quotes/'];

  function isDocPage() {
    const p = window.location.pathname;
    if (['/settings', '/plans', '/catalog'].some(x => p.includes(x))) return false;
    return DOC_PATHS.some(x => p.includes(x));
  }

  // Helper: find text content near a label
  function findValueByLabel(labelText) {
    const all = document.querySelectorAll('span, div, td, dt, dd, label, p');
    const labels = Array.from(all).filter(el => {
      const t = el.textContent.trim().toLowerCase();
      return t === labelText.toLowerCase() || t === labelText.toLowerCase() + ':';
    });
    for (const lbl of labels) {
      // Check next sibling
      let next = lbl.nextElementSibling;
      if (next) {
        const v = next.textContent.trim();
        if (v && v.length < 200 && v.toLowerCase() !== labelText.toLowerCase()) return v;
      }
      // Check parent's next sibling (label/value pattern)
      const par = lbl.parentElement;
      if (par) {
        next = par.nextElementSibling;
        if (next) {
          const v = next.textContent.trim();
          if (v && v.length < 200) return v;
        }
        // Check sibling within same row
        const siblings = par.querySelectorAll('span, div, a');
        for (const s of siblings) {
          if (s === lbl) continue;
          const v = s.textContent.trim();
          if (v && v !== lbl.textContent.trim() && v.length < 200) return v;
        }
      }
    }
    return '';
  }

  // Helper: search page text for patterns
  function findByPattern(pattern) {
    const text = document.body.innerText || '';
    const m = text.match(pattern);
    return m ? m[1].trim() : '';
  }

  function scrapePageData() {
    const data = {
      customerName: '',
      company: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      jobName: '',
      jobNumber: '',
      jobAddress: '',
      docType: '',
    };

    try {
      // --- Customer / Contact ---
      // Try common JT label patterns
      const customerLabels = ['Customer', 'Client', 'Contact', 'Bill To', 'Sold To', 'Owner'];
      for (const lbl of customerLabels) {
        const v = findValueByLabel(lbl);
        if (v && !data.customerName) {
          // Could be "Company Name" or "First Last" — use it
          data.customerName = v;
        }
      }

      // Company name (separate from contact name)
      const companyLabels = ['Company', 'Organization', 'Business'];
      for (const lbl of companyLabels) {
        const v = findValueByLabel(lbl);
        if (v) { data.company = v; break; }
      }

      // If customer name looks like a company and we have no company, swap
      if (data.customerName && !data.company) {
        const words = data.customerName.split(/\s+/);
        const bizWords = ['llc', 'inc', 'corp', 'co', 'ltd', 'group', 'services', 'construction', 'builders', 'contracting', 'enterprises', 'homes', 'roofing', 'plumbing', 'electric', 'remodeling', 'renovations', 'design', 'solutions'];
        if (words.some(w => bizWords.includes(w.toLowerCase().replace(/[.,]/g, '')))) {
          data.company = data.customerName;
        }
      }

      // --- Email ---
      const emailMatch = findByPattern(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) data.customerEmail = emailMatch;

      // Also try label-based
      const emailLabels = ['Email', 'E-mail'];
      for (const lbl of emailLabels) {
        const v = findValueByLabel(lbl);
        if (v && v.includes('@')) { data.customerEmail = v; break; }
      }

      // --- Phone ---
      const phoneLabels = ['Phone', 'Mobile', 'Cell', 'Tel', 'Telephone'];
      for (const lbl of phoneLabels) {
        const v = findValueByLabel(lbl);
        if (v && v.match(/[\d()\-\s.+]{7,}/)) { data.customerPhone = v; break; }
      }
      if (!data.customerPhone) {
        const ph = findByPattern(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
        if (ph) data.customerPhone = ph;
      }

      // --- Address ---
      const addrLabels = ['Address', 'Job Address', 'Project Address', 'Site Address', 'Location'];
      for (const lbl of addrLabels) {
        const v = findValueByLabel(lbl);
        if (v && v.length > 5) {
          if (lbl.toLowerCase().includes('job') || lbl.toLowerCase().includes('site') || lbl.toLowerCase().includes('project')) {
            data.jobAddress = v;
          } else {
            data.customerAddress = v;
          }
          break;
        }
      }

      // --- Job Name ---
      // Try h1/h2 headings first
      for (const h of document.querySelectorAll('h1, h2')) {
        const t = h.textContent.trim();
        // Skip generic headings
        if (t.length > 2 && t.length < 200 && !['jobs', 'documents', 'settings', 'dashboard'].includes(t.toLowerCase())) {
          data.jobName = t;
          break;
        }
      }
      if (!data.jobName) {
        const m = document.title.match(/^(.+?)(?:\s*[-|]\s*JobTread)?$/i);
        if (m) data.jobName = m[1].trim();
      }

      // Try label-based
      if (!data.jobName) {
        const jobLabels = ['Job Name', 'Project Name', 'Job', 'Project'];
        for (const lbl of jobLabels) {
          const v = findValueByLabel(lbl);
          if (v) { data.jobName = v; break; }
        }
      }

      // --- Job Number ---
      const jnLabels = ['Job Number', 'Job #', 'Job No', 'Project Number', 'Number'];
      for (const lbl of jnLabels) {
        const v = findValueByLabel(lbl);
        if (v && v.match(/\d/)) { data.jobNumber = v; break; }
      }
      if (!data.jobNumber) {
        const nm = findByPattern(/(?:Job\s*#?\s*|#)(\d{3,})/i);
        if (nm) data.jobNumber = nm;
      }

      // --- Doc Type ---
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/proposals/')) data.docType = 'Proposal';
      else if (path.includes('/contracts/')) data.docType = 'Contract';
      else if (path.includes('/invoices/')) data.docType = 'Invoice';
      else if (path.includes('/estimates/')) data.docType = 'Estimate';
      else if (path.includes('/change-orders/')) data.docType = 'Change Order';
      else if (path.includes('/purchase-orders/')) data.docType = 'Purchase Order';
      else if (path.includes('/work-orders/')) data.docType = 'Work Order';
      else if (path.includes('/bills/')) data.docType = 'Bill';
      else if (path.includes('/quotes/')) data.docType = 'Quote';

      // --- Scrape from breadcrumbs if available ---
      const breadcrumbs = document.querySelectorAll('nav a, [class*="breadcrumb"] a, [aria-label*="breadcrumb"] a');
      for (const bc of breadcrumbs) {
        const t = bc.textContent.trim();
        if (t.length > 2 && t.length < 100 && !['Home', 'Jobs', 'Documents', 'Dashboard'].includes(t)) {
          if (!data.jobName) data.jobName = t;
        }
      }

      // --- Try to get customer from sidebar/details section ---
      const detailSections = document.querySelectorAll('[class*="detail"], [class*="sidebar"], [class*="info"], [class*="summary"]');
      for (const sec of detailSections) {
        const text = sec.innerText || '';
        // Look for name-like patterns near customer labels
        const custMatch = text.match(/(?:Customer|Client|Contact)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
        if (custMatch && !data.customerName) data.customerName = custMatch[1].trim();

        // Look for company pattern
        const compMatch = text.match(/(?:Company|Organization|Business)[:\s]+(.+?)(?:\n|$)/i);
        if (compMatch && !data.company) data.company = compMatch[1].trim();
      }

    } catch (_) {}

    return data;
  }

  // ---------------------------------------------------------------------------
  // Template engine
  // ---------------------------------------------------------------------------

  function render(tpl, data) {
    let r = tpl || '';
    // Conditionals: {{#var}}...{{/var}}
    r = r.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, c) =>
      (data[k] && data[k].toString().trim()) ? c.replace(/\{\{(\w+)\}\}/g, (__, kk) => data[kk] || '') : ''
    );
    // Variables: {{var}}
    r = r.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] || '');
    return r.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (__) { return false; }
    }
  }

  // ---------------------------------------------------------------------------
  // Trigger button
  // ---------------------------------------------------------------------------

  function createTrigger() {
    if (document.getElementById(TRIGGER_ID)) return;
    const el = document.createElement('button');
    el.id = TRIGGER_ID;
    el.className = 'bb-trigger';
    el.title = 'Better Boss DocFill';
    el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span>DocFill</span>';
    el.addEventListener('click', toggle);
    document.body.appendChild(el);
  }

  function removeTrigger() {
    const el = document.getElementById(TRIGGER_ID);
    if (el) el.remove();
  }

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  let panelOpen = false;
  let currentView = 'main';
  let editTarget = null;
  let _pageData = null; // cached page scrape

  function toggle() { panelOpen ? close() : open(); }

  function close() {
    const p = document.getElementById(PANEL_ID);
    if (p) {
      p.classList.add('bb-out');
      setTimeout(() => p.remove(), 200);
    }
    panelOpen = false;
  }

  async function open() {
    if (!_data) await load();
    close();

    // Scrape the JT page for all available data
    _pageData = scrapePageData();
    const p = _data.profile || {};
    const hasProfile = !!(p.ownerName);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = buildPanelHTML(p, hasProfile);
    document.body.appendChild(panel);
    panelOpen = true;
    currentView = 'main';

    bindPanelEvents(panel);
    generate();
  }

  function buildPanelHTML(p, hasProfile) {
    const descTpls = _data.descTemplates || [];
    const footerTpls = _data.footerTemplates || [];
    const descOpts = descTpls.map(t => `<option value="${esc(t.id)}"${t.id === _data.activeDesc ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const footerOpts = footerTpls.map(t => `<option value="${esc(t.id)}"${t.id === _data.activeFooter ? ' selected' : ''}>${esc(t.name)}</option>`).join('');

    const pg = _pageData || {};
    const detected = [];
    if (pg.customerName) detected.push(['Contact', pg.customerName]);
    if (pg.company) detected.push(['Company', pg.company]);
    if (pg.customerEmail) detected.push(['Email', pg.customerEmail]);
    if (pg.customerPhone) detected.push(['Phone', pg.customerPhone]);
    if (pg.jobName) detected.push(['Job', pg.jobName]);
    if (pg.jobNumber) detected.push(['Job #', pg.jobNumber]);
    if (pg.jobAddress) detected.push(['Site', pg.jobAddress]);
    if (pg.docType) detected.push(['Type', pg.docType]);

    const detectedHTML = detected.length > 0
      ? `<div class="bb-detected">
          <div class="bb-detected-hd">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Auto-detected from page
          </div>
          ${detected.map(([l, v]) => `<div class="bb-detected-row"><span class="bb-detected-label">${l}</span><span class="bb-detected-value">${esc(v)}</span></div>`).join('')}
        </div>`
      : `<div class="bb-detected bb-detected--empty">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Navigate to a job or document to auto-detect fields
        </div>`;

    return `<div class="bb">
      <div class="bb-hd">
        <div class="bb-hd-left">
          <div class="bb-logo">B</div>
          <div class="bb-hd-text">
            <span class="bb-hd-title">Better Boss</span>
            <span class="bb-hd-sub">DocFill v${VERSION}</span>
          </div>
        </div>
        <div class="bb-hd-right">
          <button class="bb-icon-btn" id="bb-refresh" title="Re-scan page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button class="bb-icon-btn" id="bb-gear" title="Manage templates">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="bb-icon-btn" id="bb-x" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="bb-main" id="bb-main">
        ${!hasProfile ? `
        <div class="bb-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Set up your profile in <a href="#" id="bb-open-opts">extension settings</a> to auto-fill your biz info.</span>
        </div>` : `
        <div class="bb-profile">
          <div class="bb-avatar">${initials(p.ownerName)}</div>
          <div class="bb-profile-info"><strong>${esc(p.ownerName)}</strong><span>${esc(p.bizName || '')}</span></div>
        </div>`}

        ${detectedHTML}

        <!-- Override fields (collapsed by default, expandable) -->
        <details class="bb-overrides">
          <summary class="bb-overrides-toggle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit fields manually
          </summary>
          <div class="bb-fields">
            <div class="bb-row">
              <div class="bb-field"><label>Company</label><input id="bb-company" value="${esc(pg.company || '')}" placeholder="Auto-detected" /></div>
              <div class="bb-field"><label>Contact</label><input id="bb-name" value="${esc(pg.customerName || '')}" placeholder="Auto-detected" /></div>
            </div>
            <div class="bb-row">
              <div class="bb-field bb-field--grow"><label>Job</label><input id="bb-job" value="${esc(pg.jobName || '')}" placeholder="Auto-detected" /></div>
              <div class="bb-field bb-field--sm"><label>Job #</label><input id="bb-jobnum" value="${esc(pg.jobNumber || '')}" placeholder="#" /></div>
            </div>
          </div>
        </details>

        <div class="bb-divider"></div>

        <div class="bb-section">
          <div class="bb-section-hd">
            <div class="bb-section-label">Description</div>
            <select id="bb-desc-tpl" class="bb-select">${descOpts}</select>
          </div>
          <div class="bb-preview" id="bb-desc-preview" tabindex="0"></div>
          <button class="bb-copy-btn" id="bb-copy-desc">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Description
          </button>
        </div>

        <div class="bb-divider"></div>

        <div class="bb-section">
          <div class="bb-section-hd">
            <div class="bb-section-label">Footer</div>
            <select id="bb-footer-tpl" class="bb-select">${footerOpts}</select>
          </div>
          <div class="bb-preview bb-preview--sm" id="bb-footer-preview" tabindex="0"></div>
          <button class="bb-copy-btn" id="bb-copy-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Footer
          </button>
        </div>

        <div class="bb-divider"></div>

        <button class="bb-primary-btn" id="bb-copy-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy All
        </button>
      </div>

      <!-- Templates view -->
      <div class="bb-templates" id="bb-templates" style="display:none">
        <button class="bb-back" id="bb-back-main">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div class="bb-section">
          <div class="bb-section-hd"><div class="bb-section-label">Description Templates</div><button class="bb-sm-btn" id="bb-add-desc">+ Add</button></div>
          <div class="bb-tpl-list" id="bb-desc-list"></div>
        </div>
        <div class="bb-divider"></div>
        <div class="bb-section">
          <div class="bb-section-hd"><div class="bb-section-label">Footer Templates</div><button class="bb-sm-btn" id="bb-add-footer">+ Add</button></div>
          <div class="bb-tpl-list" id="bb-footer-list"></div>
        </div>
      </div>

      <!-- Edit template view -->
      <div class="bb-edit" id="bb-edit" style="display:none">
        <button class="bb-back" id="bb-back-tpls">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div class="bb-section">
          <div class="bb-section-label" id="bb-edit-title">Edit Template</div>
          <div class="bb-field" style="margin-top:10px"><label>Name</label><input id="bb-edit-name" maxlength="80" /></div>
          <div class="bb-field" style="margin-top:8px">
            <label>Content <span class="bb-hint">Use {{variable}} for auto-fill</span></label>
            <textarea id="bb-edit-body" rows="14"></textarea>
          </div>
          <div class="bb-edit-vars">
            <span class="bb-var" data-v="company">company</span>
            <span class="bb-var" data-v="customerName">customerName</span>
            <span class="bb-var" data-v="customerEmail">customerEmail</span>
            <span class="bb-var" data-v="customerPhone">customerPhone</span>
            <span class="bb-var" data-v="jobName">jobName</span>
            <span class="bb-var" data-v="jobNumber">jobNumber</span>
            <span class="bb-var" data-v="jobAddress">jobAddress</span>
            <span class="bb-var" data-v="docType">docType</span>
            <span class="bb-var" data-v="date">date</span>
            <span class="bb-var bb-var--biz" data-v="bizName">bizName</span>
            <span class="bb-var bb-var--biz" data-v="bizEmail">bizEmail</span>
            <span class="bb-var bb-var--biz" data-v="bizPhone">bizPhone</span>
            <span class="bb-var bb-var--biz" data-v="bizWebsite">bizWebsite</span>
            <span class="bb-var bb-var--biz" data-v="bizLicense">bizLicense</span>
          </div>
          <div class="bb-edit-actions">
            <button class="bb-primary-btn" id="bb-save-tpl">Save</button>
            <button class="bb-ghost-btn" id="bb-cancel-edit">Cancel</button>
          </div>
        </div>
      </div>

      <div class="bb-ft">
        <span>Better Boss</span>
        <span class="bb-ft-dot">&middot;</span>
        <a href="https://better-boss.ai" target="_blank" rel="noopener">better-boss.ai</a>
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Bind events
  // ---------------------------------------------------------------------------

  function bindPanelEvents(panel) {
    const debouncedGen = debounce(generate, 200);

    panel.querySelector('#bb-x').addEventListener('click', close);

    // Re-scan page
    panel.querySelector('#bb-refresh').addEventListener('click', () => {
      _pageData = scrapePageData();
      // Update fields
      const fields = { 'bb-company': _pageData.company, 'bb-name': _pageData.customerName, 'bb-job': _pageData.jobName, 'bb-jobnum': _pageData.jobNumber };
      for (const [id, val] of Object.entries(fields)) {
        const el = panel.querySelector('#' + id);
        if (el && val) el.value = val;
      }
      generate();
      toast('Page re-scanned');
    });

    // Manual override inputs → regenerate
    ['bb-company', 'bb-name', 'bb-job', 'bb-jobnum'].forEach(id => {
      const el = panel.querySelector('#' + id);
      if (el) el.addEventListener('input', debouncedGen);
    });

    // Template selectors
    panel.querySelector('#bb-desc-tpl').addEventListener('change', (e) => { save('activeDesc', e.target.value); generate(); });
    panel.querySelector('#bb-footer-tpl').addEventListener('change', (e) => { save('activeFooter', e.target.value); generate(); });

    // Copy buttons
    panel.querySelector('#bb-copy-desc').addEventListener('click', async function () {
      const raw = panel.querySelector('#bb-desc-preview')?.dataset.raw || '';
      if (await copyText(raw)) flashCopy(this, 'Description copied');
    });
    panel.querySelector('#bb-copy-footer').addEventListener('click', async function () {
      const raw = panel.querySelector('#bb-footer-preview')?.dataset.raw || '';
      if (await copyText(raw)) flashCopy(this, 'Footer copied');
    });
    panel.querySelector('#bb-copy-all').addEventListener('click', async function () {
      const desc = panel.querySelector('#bb-desc-preview')?.dataset.raw || '';
      const footer = panel.querySelector('#bb-footer-preview')?.dataset.raw || '';
      const combined = desc + (footer ? '\n\n---\n\n' + footer : '');
      if (await copyText(combined)) flashCopy(this, 'Copied!');
    });

    // Open options
    const openOpts = panel.querySelector('#bb-open-opts');
    if (openOpts) openOpts.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.sendMessage({ action: 'openOptions' }); });

    // Views
    panel.querySelector('#bb-gear').addEventListener('click', () => showView('templates'));
    panel.querySelector('#bb-back-main').addEventListener('click', () => showView('main'));
    panel.querySelector('#bb-back-tpls').addEventListener('click', () => showView('templates'));

    // Add templates
    panel.querySelector('#bb-add-desc').addEventListener('click', () => {
      const id = 'desc_' + Date.now().toString(36);
      _data.descTemplates.push({ id, name: 'New Template', body: '' });
      save('descTemplates', _data.descTemplates);
      editTarget = { type: 'desc', id };
      showView('editTemplate');
    });
    panel.querySelector('#bb-add-footer').addEventListener('click', () => {
      const id = 'footer_' + Date.now().toString(36);
      _data.footerTemplates.push({ id, name: 'New Footer', body: '' });
      save('footerTemplates', _data.footerTemplates);
      editTarget = { type: 'footer', id };
      showView('editTemplate');
    });

    // Save template
    panel.querySelector('#bb-save-tpl').addEventListener('click', () => {
      if (!editTarget) return;
      const key = editTarget.type === 'desc' ? 'descTemplates' : 'footerTemplates';
      const tpl = _data[key].find(t => t.id === editTarget.id);
      if (!tpl) return;
      const nameVal = panel.querySelector('#bb-edit-name').value.trim();
      if (!nameVal) { toast('Name required', 'error'); return; }
      tpl.name = nameVal;
      tpl.body = panel.querySelector('#bb-edit-body').value;
      save(key, _data[key]);
      toast('Template saved');
      refreshSelectors();
      showView('templates');
    });
    panel.querySelector('#bb-cancel-edit').addEventListener('click', () => showView('templates'));

    // Variable tag insertion
    panel.querySelectorAll('.bb-var[data-v]').forEach(tag => {
      tag.addEventListener('click', () => {
        const ta = panel.querySelector('#bb-edit-body');
        if (!ta) return;
        const v = '{{' + tag.dataset.v + '}}';
        const s = ta.selectionStart;
        const e = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + v + ta.value.substring(e);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = s + v.length;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  function showView(view) {
    currentView = view;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.querySelector('#bb-main').style.display = view === 'main' ? '' : 'none';
    panel.querySelector('#bb-templates').style.display = view === 'templates' ? '' : 'none';
    panel.querySelector('#bb-edit').style.display = view === 'editTemplate' ? '' : 'none';
    if (view === 'templates') renderTemplatesList();
    if (view === 'editTemplate') renderEditTemplate();
    if (view === 'main') generate();
  }

  function renderTemplatesList() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.querySelector('#bb-desc-list').innerHTML = (_data.descTemplates || []).map(t => tplCard(t, 'desc', t.id === _data.activeDesc)).join('');
    panel.querySelector('#bb-footer-list').innerHTML = (_data.footerTemplates || []).map(t => tplCard(t, 'footer', t.id === _data.activeFooter)).join('');
    panel.querySelectorAll('[data-tpl-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { tplAction: action, tplType: type, tplId: id } = btn.dataset;
        const key = type === 'desc' ? 'descTemplates' : 'footerTemplates';
        const activeKey = type === 'desc' ? 'activeDesc' : 'activeFooter';
        if (action === 'use') { save(activeKey, id); refreshSelectors(); toast('Activated'); renderTemplatesList(); }
        else if (action === 'edit') { editTarget = { type, id }; showView('editTemplate'); }
        else if (action === 'delete') { _data[key] = _data[key].filter(t => t.id !== id); save(key, _data[key]); refreshSelectors(); toast('Deleted'); renderTemplatesList(); }
      });
    });
  }

  function tplCard(t, type, active) {
    const preview = (t.body || '').substring(0, 60).replace(/\n/g, ' ');
    return `<div class="bb-tpl-card${active ? ' bb-tpl-card--active' : ''}">
      <div class="bb-tpl-card-info"><div class="bb-tpl-card-name">${esc(t.name)}${active ? '<span class="bb-tpl-badge">Active</span>' : ''}</div><div class="bb-tpl-card-preview">${esc(preview)}${preview.length >= 60 ? '…' : ''}</div></div>
      <div class="bb-tpl-card-actions">
        ${!active ? `<button class="bb-sm-btn" data-tpl-action="use" data-tpl-type="${type}" data-tpl-id="${esc(t.id)}">Use</button>` : ''}
        <button class="bb-sm-btn" data-tpl-action="edit" data-tpl-type="${type}" data-tpl-id="${esc(t.id)}">Edit</button>
        <button class="bb-sm-btn bb-sm-btn--red" data-tpl-action="delete" data-tpl-type="${type}" data-tpl-id="${esc(t.id)}">Del</button>
      </div>
    </div>`;
  }

  function renderEditTemplate() {
    if (!editTarget) return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const key = editTarget.type === 'desc' ? 'descTemplates' : 'footerTemplates';
    const tpl = _data[key].find(t => t.id === editTarget.id);
    if (!tpl) return;
    panel.querySelector('#bb-edit-title').textContent = 'Edit ' + (editTarget.type === 'desc' ? 'Description' : 'Footer') + ' Template';
    panel.querySelector('#bb-edit-name').value = tpl.name;
    panel.querySelector('#bb-edit-body').value = tpl.body || '';
  }

  function refreshSelectors() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const ds = panel.querySelector('#bb-desc-tpl');
    const fs = panel.querySelector('#bb-footer-tpl');
    if (ds) ds.innerHTML = (_data.descTemplates || []).map(t => `<option value="${esc(t.id)}"${t.id === _data.activeDesc ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    if (fs) fs.innerHTML = (_data.footerTemplates || []).map(t => `<option value="${esc(t.id)}"${t.id === _data.activeFooter ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  }

  // ---------------------------------------------------------------------------
  // Generate — merges auto-detected + manual overrides + profile
  // ---------------------------------------------------------------------------

  function generate() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || currentView !== 'main') return;

    const prof = _data.profile || {};
    const pg = _pageData || {};

    // Manual overrides take precedence over auto-detected
    const data = {
      company: panel.querySelector('#bb-company')?.value || pg.company || '',
      customerName: panel.querySelector('#bb-name')?.value || pg.customerName || '',
      customerEmail: pg.customerEmail || '',
      customerPhone: pg.customerPhone || '',
      customerAddress: pg.customerAddress || '',
      jobName: panel.querySelector('#bb-job')?.value || pg.jobName || '',
      jobNumber: panel.querySelector('#bb-jobnum')?.value || pg.jobNumber || '',
      jobAddress: pg.jobAddress || '',
      docType: pg.docType || '',
      date: new Date().toLocaleDateString(),
      bizName: prof.bizName || '',
      bizEmail: prof.bizEmail || '',
      bizPhone: prof.bizPhone || '',
      bizAddress: prof.bizAddress || '',
      bizWebsite: prof.bizWebsite || '',
      bizLicense: prof.bizLicense || '',
      ownerName: prof.ownerName || '',
    };

    const descTpl = (_data.descTemplates || []).find(t => t.id === _data.activeDesc) || _data.descTemplates[0];
    const footerTpl = (_data.footerTemplates || []).find(t => t.id === _data.activeFooter) || _data.footerTemplates[0];

    const descText = render(descTpl?.body || '', data);
    const footerText = render(footerTpl?.body || '', data);

    const descEl = panel.querySelector('#bb-desc-preview');
    const footerEl = panel.querySelector('#bb-footer-preview');
    if (descEl) { descEl.dataset.raw = descText; descEl.textContent = descText || '(empty template)'; }
    if (footerEl) { footerEl.dataset.raw = footerText; footerEl.textContent = footerText || '(empty)'; }
  }

  function flashCopy(btn, msg) {
    toast(msg);
    btn.classList.add('bb-copied');
    setTimeout(() => btn.classList.remove('bb-copied'), 1500);
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcut
  // ---------------------------------------------------------------------------

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) { e.preventDefault(); toggle(); }
  });

  // ---------------------------------------------------------------------------
  // Chrome messaging
  // ---------------------------------------------------------------------------

  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((msg, _, reply) => {
      if (msg.action === 'togglePanel') { toggle(); reply({ ok: true }); }
      if (msg.action === 'getPageInfo') {
        reply({ isDocPage: isDocPage(), pageData: scrapePageData(), url: location.href });
      }
      return false;
    });
  }

  // ---------------------------------------------------------------------------
  // SPA watcher
  // ---------------------------------------------------------------------------

  function watchURL() {
    let last = location.href;
    const check = () => {
      if (location.href !== last) {
        last = location.href;
        close();
        removeTrigger();
        if (isDocPage()) createTrigger();
      }
    };
    const origPush = history.pushState;
    history.pushState = function (...a) { origPush.apply(this, a); check(); };
    const origReplace = history.replaceState;
    history.replaceState = function (...a) { origReplace.apply(this, a); check(); };
    window.addEventListener('popstate', check);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  async function init() {
    await load();
    if (isDocPage()) createTrigger();
    watchURL();
    const obs = new MutationObserver(debounce(() => {
      if (!document.getElementById(TRIGGER_ID) && isDocPage()) createTrigger();
    }, 500));
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
