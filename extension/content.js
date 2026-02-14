// =============================================================================
// Better Boss — DocFill v2.0 Content Script
// https://better-boss.ai
//
// Multi-template document builder for JobTread.
// Features: template library, snippets, custom variables, keyboard shortcuts,
//           Copy All, live preview, toast notifications.
//
// JobTread formatting:
//   *bold*  ^italic^  _underline_  ~strikethrough~
//   # H1  ## H2  ### H3  #### H4
//   - bullet  1. numbered  > quote  --- hr  [text](url)
// =============================================================================

(function () {
  'use strict';

  // ==========================================================================
  // CONFIG
  // ==========================================================================

  const VERSION = '2.0.0';
  const BRAND = 'Better Boss';
  const FAB_ID = 'bb-docfill-fab';
  const PANEL_ID = 'bb-docfill-panel';
  const TOAST_ID = 'bb-docfill-toast';

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  function log(...a) { console.log(`[${BRAND}]`, ...a); }
  function uid() { return 'bb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
  function initials(name) {
    if (!name) return 'BB';
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS
  // ==========================================================================

  function toast(msg, type = 'success') {
    const prev = document.getElementById(TOAST_ID);
    if (prev) prev.remove();
    const el = document.createElement('div');
    el.id = TOAST_ID;
    el.className = `bb-toast bb-toast--${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('bb-toast--show'));
    setTimeout(() => {
      el.classList.remove('bb-toast--show');
      setTimeout(() => el.remove(), 300);
    }, 2200);
  }

  // ==========================================================================
  // DEFAULT DATA
  // ==========================================================================

  function getDefaultDescTemplates() {
    return [
      {
        id: 'desc_sow',
        name: 'JT Implementation SOW',
        content: `*JobTread Implementation Agreement \u2014 *^{{company}}^**
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
This Agreement is binding upon Client\u2019s signature below. *{{bizName}}\u2019s acceptance is deemed upon (a) commencement of services or (b) receipt of the first payment.* No additional Provider signature required.`,
        isDefault: true,
      },
      {
        id: 'desc_proposal',
        name: 'Construction Proposal',
        content: `## Proposal \u2014 {{jobName}}

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
        isDefault: true,
      },
      {
        id: 'desc_change_order',
        name: 'Change Order',
        content: `## Change Order

*Project:* {{jobName}}{{#jobNumber}} (Job #{{jobNumber}}){{/jobNumber}}
*Client:* {{customerName}}{{#company}} | {{company}}{{/company}}
*Contractor:* {{bizName}}
*Date:* {{date}}

---

### Description of Change
[Describe the requested change in detail.]

### Reason for Change
[Explain why this change is needed.]

### Impact on Scope
[Describe how this affects the original scope of work.]

### Cost Adjustment
| Item | Amount |
|------|--------|
| Additional Materials | $0.00 |
| Additional Labor | $0.00 |
| *Change Order Total* | *$0.00* |

### Schedule Impact
[Describe any timeline changes. Example: "Adds 3 business days to completion."]

### Authorization
This change order becomes part of the original contract upon signature.

Client Signature: _________________________ Date: _________
{{bizName}} Signature: _________________________ Date: _________`,
        isDefault: true,
      },
      {
        id: 'desc_blank',
        name: 'Blank Template',
        content: '',
        isDefault: true,
      },
    ];
  }

  function getDefaultFooterTemplates() {
    return [
      {
        id: 'footer_full',
        name: 'Full Contact Footer',
        content:
          '{{#customerName}}*Prepared for:* {{customerName}}{{/customerName}}' +
          '{{#company}} | *{{company}}*{{/company}}' +
          '{{#jobName}} | Project: {{jobName}}{{/jobName}}' +
          '{{#jobNumber}} | Job #{{jobNumber}}{{/jobNumber}}' +
          '\n{{#bizName}}*{{bizName}}*{{/bizName}}' +
          '{{#bizPhone}} | {{bizPhone}}{{/bizPhone}}' +
          '{{#bizEmail}} | {{bizEmail}}{{/bizEmail}}' +
          '{{#bizWebsite}} | {{bizWebsite}}{{/bizWebsite}}' +
          '{{#bizLicense}} | Lic #{{bizLicense}}{{/bizLicense}}',
        isDefault: true,
      },
      {
        id: 'footer_minimal',
        name: 'Minimal Footer',
        content: '{{#bizName}}*{{bizName}}*{{/bizName}}{{#bizPhone}} | {{bizPhone}}{{/bizPhone}}',
        isDefault: true,
      },
      {
        id: 'footer_blank',
        name: 'Blank Footer',
        content: '',
        isDefault: true,
      },
    ];
  }

  function getDefaultSnippets() {
    return [
      {
        id: 'snip_payment',
        name: 'Payment Terms',
        content: '##Payment Terms\n- 50% deposit due upon contract signing\n- 25% due at project midpoint\n- 25% due upon final completion and walkthrough\n- Late payments subject to 1.5% monthly interest\n- All payments due within 15 days of invoice date',
      },
      {
        id: 'snip_warranty',
        name: 'Warranty Clause',
        content: '##Warranty\nContractor warrants all work performed under this agreement for a period of *one (1) year* from the date of substantial completion. This warranty covers defects in workmanship and materials provided by the Contractor. This warranty does not cover damage caused by the Client, normal wear and tear, or acts of nature.',
      },
      {
        id: 'snip_change_policy',
        name: 'Change Order Policy',
        content: '##Change Orders\nAny changes to the original scope of work must be documented in writing via a Change Order signed by both parties. Change orders may affect project cost and timeline. No additional work will begin until the change order is approved and signed.',
      },
      {
        id: 'snip_insurance',
        name: 'Insurance & Liability',
        content: '##Insurance & Liability\nContractor maintains general liability insurance, workers\u2019 compensation, and auto insurance. Certificates of insurance available upon request. Contractor\u2019s total liability shall not exceed the total contract value. Contractor is not liable for pre-existing conditions or concealed defects discovered during work.',
      },
      {
        id: 'snip_cancellation',
        name: 'Cancellation Policy',
        content: '##Cancellation\nEither party may cancel this agreement with *14 days written notice*. If Client cancels after work has begun, Client is responsible for payment of all completed work plus materials ordered. Deposit is non-refundable after project kickoff.',
      },
    ];
  }

  function getDefaultData() {
    return {
      profile: {},
      descTemplates: getDefaultDescTemplates(),
      footerTemplates: getDefaultFooterTemplates(),
      snippets: getDefaultSnippets(),
      activeDescId: 'desc_sow',
      activeFooterId: 'footer_full',
      customVars: {},
      prefs: { shortcuts: true },
    };
  }

  // ==========================================================================
  // STORAGE (chrome.storage.local with in-memory cache)
  // ==========================================================================

  let _data = null;

  function loadData() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(null, (result) => {
          if (chrome.runtime.lastError) {
            log('Storage read error:', chrome.runtime.lastError);
            _data = getDefaultData();
          } else if (!result || !result.descTemplates) {
            // First run or migration needed — check sync storage
            chrome.storage.sync.get(null, (syncResult) => {
              if (syncResult && syncResult.profile && syncResult.profile.ownerName) {
                // Migrate from sync to local
                _data = getDefaultData();
                _data.profile = syncResult.profile;
                if (syncResult.descriptionTemplate) {
                  _data.descTemplates[0].content = syncResult.descriptionTemplate;
                }
                if (syncResult.footerTemplate) {
                  _data.footerTemplates[0].content = syncResult.footerTemplate;
                }
                saveData(_data);
                log('Migrated data from sync to local storage');
              } else {
                _data = getDefaultData();
                saveData(_data);
              }
              resolve(_data);
            });
            return;
          } else {
            _data = result;
            // Ensure all keys exist (for upgrades)
            const defaults = getDefaultData();
            let needsSave = false;
            for (const key of Object.keys(defaults)) {
              if (_data[key] === undefined) {
                _data[key] = defaults[key];
                needsSave = true;
              }
            }
            if (needsSave) saveData(_data);
          }
          resolve(_data);
        });
      } catch (e) {
        log('Storage exception:', e);
        _data = getDefaultData();
        resolve(_data);
      }
    });
  }

  function saveData(data) {
    _data = data || _data;
    try {
      chrome.storage.local.set(_data);
    } catch (e) {
      log('Save error:', e);
    }
  }

  function save(key, value) {
    _data[key] = value;
    try {
      chrome.storage.local.set({ [key]: value });
    } catch (e) {
      log('Save error:', e);
    }
  }

  // ==========================================================================
  // PAGE DETECTION
  // ==========================================================================

  const DOC_PATHS = [
    '/jobs/', '/documents/', '/invoices/', '/estimates/', '/proposals/',
    '/contracts/', '/purchase-orders/', '/change-orders/', '/work-orders/',
    '/bills/', '/budget', '/quotes/',
  ];
  const EXCLUDE_PATHS = ['/settings', '/plans', '/catalog'];

  function isDocPage() {
    const p = window.location.pathname;
    if (EXCLUDE_PATHS.some(x => p.includes(x))) return false;
    return DOC_PATHS.some(x => p.includes(x));
  }

  let currentJobInfo = null;
  let currentCustomerInfo = null;

  function extractJobInfo() {
    const info = { jobName: '', jobNumber: '', jobId: '' };
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
    const info = { customerName: '', company: '', email: '', phone: '' };
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

  function render(template, data) {
    let r = template || '';
    // Conditional blocks: {{#var}}content{{/var}}
    r = r.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, c) => {
      return (data[k] && data[k].toString().trim())
        ? c.replace(/\{\{(\w+)\}\}/g, (__, kk) => data[kk] || '')
        : '';
    });
    // Simple variables: {{var}}
    r = r.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] || '');
    return r.replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildData() {
    const p = (_data && _data.profile) || {};
    const cv = (_data && _data.customVars) || {};
    return {
      company: document.getElementById('bb-company')?.value || '',
      customerName: document.getElementById('bb-name')?.value || '',
      jobName: document.getElementById('bb-job')?.value || '',
      jobNumber: document.getElementById('bb-jobnum')?.value || '',
      date: new Date().toLocaleDateString(),
      bizName: p.bizName || '',
      bizEmail: p.bizEmail || '',
      bizPhone: p.bizPhone || '',
      bizAddress: p.bizAddress || '',
      bizWebsite: p.bizWebsite || '',
      bizLicense: p.bizLicense || '',
      ownerName: p.ownerName || '',
      ...cv,
    };
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
    if (btn) {
      const orig = btn.innerHTML;
      if (ok) {
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        btn.classList.add('bb-btn--copied');
      } else {
        btn.textContent = 'Failed';
        btn.classList.add('bb-btn--error');
      }
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('bb-btn--copied', 'bb-btn--error'); }, 1800);
    }
    return ok;
  }

  // ==========================================================================
  // FAB
  // ==========================================================================

  function createFAB() {
    if (document.getElementById(FAB_ID)) return;
    const el = document.createElement('div');
    el.id = FAB_ID;
    el.innerHTML = `<button class="bb-fab" title="${BRAND} DocFill" aria-label="Open ${BRAND} DocFill"><span class="bb-fab__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span><span class="bb-fab__label">DocFill</span></button>`;
    el.addEventListener('click', togglePanel);
    document.body.appendChild(el);
  }

  // ==========================================================================
  // PANEL CORE
  // ==========================================================================

  let activeTab = 'docfill';
  let editingId = null;
  let editingType = null; // 'desc', 'footer', 'snippet'

  function togglePanel() {
    const ex = document.getElementById(PANEL_ID);
    if (ex) { closePanel(); return; }
    openPanel();
  }

  function closePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) {
      p.classList.add('bb-panel-out');
      setTimeout(() => p.remove(), 200);
    }
  }

  async function openPanel() {
    if (!_data) await loadData();
    const job = currentJobInfo || extractJobInfo();
    const cust = currentCustomerInfo || extractCustomerInfo();
    currentJobInfo = job;
    currentCustomerInfo = cust;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="bb-panel">
        <div class="bb-hdr">
          <div class="bb-hdr__brand">
            <div class="bb-hdr__logo">BB</div>
            <div class="bb-hdr__text">
              <span class="bb-hdr__title">${BRAND} <span class="bb-hdr__accent">DocFill</span></span>
              <span class="bb-hdr__ver">v${VERSION}</span>
            </div>
          </div>
          <button class="bb-hdr__close" id="bb-close">&times;</button>
        </div>
        <div class="bb-tabs" id="bb-tabs">
          <button class="bb-tab bb-tab--active" data-tab="docfill">DocFill</button>
          <button class="bb-tab" data-tab="templates">Templates</button>
          <button class="bb-tab" data-tab="snippets">Snippets</button>
          <button class="bb-tab" data-tab="settings">Settings</button>
          <div class="bb-tab__indicator"></div>
        </div>
        <div class="bb-body" id="bb-body"></div>
        <div class="bb-foot">
          <span>${BRAND} DocFill v${VERSION}</span>
          <a href="https://better-boss.ai" target="_blank" rel="noopener">better-boss.ai</a>
        </div>
      </div>`;

    document.body.appendChild(panel);

    // Tab switching
    panel.querySelectorAll('.bb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        editingId = null;
        editingType = null;
        panel.querySelectorAll('.bb-tab').forEach(t => t.classList.remove('bb-tab--active'));
        tab.classList.add('bb-tab--active');
        activeTab = tab.dataset.tab;
        moveIndicator(tab);
        renderTab();
      });
    });

    document.getElementById('bb-close').addEventListener('click', closePanel);
    activeTab = 'docfill';
    moveIndicator(panel.querySelector('.bb-tab--active'));
    renderTab();
  }

  function moveIndicator(tab) {
    const indicator = document.querySelector('.bb-tab__indicator');
    if (!indicator || !tab) return;
    indicator.style.left = tab.offsetLeft + 'px';
    indicator.style.width = tab.offsetWidth + 'px';
  }

  function renderTab() {
    const body = document.getElementById('bb-body');
    if (!body) return;
    if (activeTab === 'docfill') renderDocFill(body);
    else if (activeTab === 'templates') renderTemplates(body);
    else if (activeTab === 'snippets') renderSnippets(body);
    else if (activeTab === 'settings') renderSettings(body);
  }

  // ==========================================================================
  // TAB: DOCFILL (Main Generation)
  // ==========================================================================

  function renderDocFill(body) {
    const job = currentJobInfo || {};
    const cust = currentCustomerInfo || {};
    const p = _data.profile || {};
    const loggedIn = !!(p.ownerName);
    const descTemplates = _data.descTemplates || [];
    const footerTemplates = _data.footerTemplates || [];
    const activeDescId = _data.activeDescId || (descTemplates[0] && descTemplates[0].id);
    const activeFooterId = _data.activeFooterId || (footerTemplates[0] && footerTemplates[0].id);

    const profileHTML = loggedIn
      ? `<div class="bb-badge"><div class="bb-avatar">${initials(p.ownerName)}</div><div class="bb-badge__info"><strong>${esc(p.ownerName)}</strong><span>${esc(p.bizName || '')}</span></div></div>`
      : `<div class="bb-alert bb-alert--warn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Set up your profile in <a href="#" id="bb-go-settings">Settings</a> to auto-fill your business info.</div>`;

    const descOpts = descTemplates.map(t => `<option value="${esc(t.id)}"${t.id === activeDescId ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const footerOpts = footerTemplates.map(t => `<option value="${esc(t.id)}"${t.id === activeFooterId ? ' selected' : ''}>${esc(t.name)}</option>`).join('');

    body.innerHTML = `
      <div class="bb-sec">${profileHTML}</div>
      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Client & Job</h4></div>
        <div class="bb-grid">
          <div class="bb-inp"><label for="bb-company">Company</label><input id="bb-company" value="${esc(cust.company)}" placeholder="Smith Roofing LLC" maxlength="200"/></div>
          <div class="bb-inp"><label for="bb-name">Contact</label><input id="bb-name" value="${esc(cust.customerName)}" placeholder="John Smith" maxlength="120"/></div>
        </div>
        <div class="bb-grid">
          <div class="bb-inp"><label for="bb-job">Job Name</label><input id="bb-job" value="${esc(job.jobName)}" placeholder="Roof Replacement" maxlength="200"/></div>
          <div class="bb-inp bb-inp--sm"><label for="bb-jobnum">Job #</label><input id="bb-jobnum" value="${esc(job.jobNumber)}" placeholder="4821" maxlength="30"/></div>
        </div>
      </div>

      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head">
          <h4>Description</h4>
          <div class="bb-sec__actions">
            <select id="bb-desc-select" class="bb-select">${descOpts}</select>
            <button class="bb-btn bb-btn--copy" id="bb-copy-desc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>
          </div>
        </div>
        <div class="bb-output" id="bb-desc-out" tabindex="0"></div>
      </div>

      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head">
          <h4>Footer</h4>
          <div class="bb-sec__actions">
            <select id="bb-footer-select" class="bb-select">${footerOpts}</select>
            <button class="bb-btn bb-btn--copy" id="bb-copy-footer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>
          </div>
        </div>
        <div class="bb-output bb-output--sm" id="bb-footer-out" tabindex="0"></div>
      </div>

      <div class="bb-sec bb-sec--actions">
        <button class="bb-btn bb-btn--primary" id="bb-copy-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy All to Clipboard
        </button>
        <button class="bb-btn bb-btn--ghost" id="bb-regen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Regenerate
        </button>
      </div>`;

    // Events
    const debouncedGen = debounce(generate, 250);
    ['bb-company', 'bb-name', 'bb-job', 'bb-jobnum'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', debouncedGen);
    });

    document.getElementById('bb-desc-select').addEventListener('change', (e) => {
      save('activeDescId', e.target.value);
      generate();
    });
    document.getElementById('bb-footer-select').addEventListener('change', (e) => {
      save('activeFooterId', e.target.value);
      generate();
    });

    document.getElementById('bb-copy-desc').addEventListener('click', function () {
      const raw = document.getElementById('bb-desc-out')?.getAttribute('data-raw') || '';
      copyText(raw, this);
    });
    document.getElementById('bb-copy-footer').addEventListener('click', function () {
      const raw = document.getElementById('bb-footer-out')?.getAttribute('data-raw') || '';
      copyText(raw, this);
    });
    document.getElementById('bb-copy-all').addEventListener('click', function () {
      const desc = document.getElementById('bb-desc-out')?.getAttribute('data-raw') || '';
      const footer = document.getElementById('bb-footer-out')?.getAttribute('data-raw') || '';
      const combined = desc + (footer ? '\n\n---\n\n' + footer : '');
      copyText(combined, this);
    });
    document.getElementById('bb-regen').addEventListener('click', () => {
      currentJobInfo = extractJobInfo();
      currentCustomerInfo = extractCustomerInfo();
      const job2 = currentJobInfo;
      const el1 = document.getElementById('bb-job');
      const el2 = document.getElementById('bb-jobnum');
      if (el1 && job2.jobName) el1.value = job2.jobName;
      if (el2 && job2.jobNumber) el2.value = job2.jobNumber;
      generate();
      toast('Page data refreshed');
    });

    const goSettings = document.getElementById('bb-go-settings');
    if (goSettings) {
      goSettings.addEventListener('click', (e) => {
        e.preventDefault();
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        panel.querySelectorAll('.bb-tab').forEach(t => t.classList.remove('bb-tab--active'));
        const st = panel.querySelector('[data-tab="settings"]');
        if (st) { st.classList.add('bb-tab--active'); moveIndicator(st); }
        activeTab = 'settings';
        renderTab();
      });
    }

    generate();
  }

  function generate() {
    const data = buildData();
    const descTemplates = _data.descTemplates || [];
    const footerTemplates = _data.footerTemplates || [];
    const descTpl = descTemplates.find(t => t.id === _data.activeDescId) || descTemplates[0];
    const footerTpl = footerTemplates.find(t => t.id === _data.activeFooterId) || footerTemplates[0];

    const descText = render(descTpl ? descTpl.content : '', data);
    const footerText = render(footerTpl ? footerTpl.content : '', data);

    const dEl = document.getElementById('bb-desc-out');
    const fEl = document.getElementById('bb-footer-out');
    if (dEl) { dEl.setAttribute('data-raw', descText); dEl.textContent = descText; }
    if (fEl) { fEl.setAttribute('data-raw', footerText); fEl.textContent = footerText; }
  }

  // ==========================================================================
  // TAB: TEMPLATES
  // ==========================================================================

  function renderTemplates(body) {
    const descTemplates = _data.descTemplates || [];
    const footerTemplates = _data.footerTemplates || [];

    if (editingId) {
      renderTemplateEditor(body);
      return;
    }

    const renderList = (templates, type, activeId) => {
      return templates.map(t => {
        const isActive = t.id === activeId;
        return `<div class="bb-card ${isActive ? 'bb-card--active' : ''}" data-id="${esc(t.id)}">
          <div class="bb-card__body">
            <div class="bb-card__title">${esc(t.name)}${isActive ? '<span class="bb-card__badge">Active</span>' : ''}</div>
            <div class="bb-card__preview">${esc((t.content || '').substring(0, 80))}${(t.content || '').length > 80 ? '...' : ''}</div>
          </div>
          <div class="bb-card__actions">
            ${!isActive ? `<button class="bb-btn bb-btn--xs" data-action="activate" data-type="${type}" data-id="${esc(t.id)}">Use</button>` : ''}
            <button class="bb-btn bb-btn--xs" data-action="edit" data-type="${type}" data-id="${esc(t.id)}">Edit</button>
            ${!t.isDefault ? `<button class="bb-btn bb-btn--xs bb-btn--danger-xs" data-action="delete" data-type="${type}" data-id="${esc(t.id)}">Del</button>` : ''}
          </div>
        </div>`;
      }).join('');
    };

    body.innerHTML = `
      <div class="bb-sec">
        <div class="bb-sec__head">
          <h4>Description Templates</h4>
          <button class="bb-btn bb-btn--xs bb-btn--add" id="bb-add-desc">+ New</button>
        </div>
        <div class="bb-card-list">${renderList(descTemplates, 'desc', _data.activeDescId)}</div>
      </div>
      <div class="bb-sep"></div>
      <div class="bb-sec">
        <div class="bb-sec__head">
          <h4>Footer Templates</h4>
          <button class="bb-btn bb-btn--xs bb-btn--add" id="bb-add-footer">+ New</button>
        </div>
        <div class="bb-card-list">${renderList(footerTemplates, 'footer', _data.activeFooterId)}</div>
      </div>`;

    // Delegate card actions
    body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const type = btn.dataset.type;
      const id = btn.dataset.id;

      if (action === 'activate') {
        save(type === 'desc' ? 'activeDescId' : 'activeFooterId', id);
        toast('Template activated');
        renderTemplates(body);
      } else if (action === 'edit') {
        editingId = id;
        editingType = type;
        renderTemplateEditor(body);
      } else if (action === 'delete') {
        const key = type === 'desc' ? 'descTemplates' : 'footerTemplates';
        _data[key] = _data[key].filter(t => t.id !== id);
        save(key, _data[key]);
        toast('Template deleted');
        renderTemplates(body);
      }
    });

    document.getElementById('bb-add-desc')?.addEventListener('click', () => {
      const newTpl = { id: uid(), name: 'New Template', content: '', isDefault: false };
      _data.descTemplates.push(newTpl);
      save('descTemplates', _data.descTemplates);
      editingId = newTpl.id;
      editingType = 'desc';
      renderTemplateEditor(body);
    });

    document.getElementById('bb-add-footer')?.addEventListener('click', () => {
      const newTpl = { id: uid(), name: 'New Footer', content: '', isDefault: false };
      _data.footerTemplates.push(newTpl);
      save('footerTemplates', _data.footerTemplates);
      editingId = newTpl.id;
      editingType = 'footer';
      renderTemplateEditor(body);
    });
  }

  function renderTemplateEditor(body) {
    const key = editingType === 'desc' ? 'descTemplates' : 'footerTemplates';
    const tpl = (_data[key] || []).find(t => t.id === editingId);
    if (!tpl) { editingId = null; renderTemplates(body); return; }

    const customVarTags = Object.keys(_data.customVars || {}).map(k =>
      `<span class="bb-tag" data-v="${esc(k)}">${esc(k)}</span>`
    ).join('');

    body.innerHTML = `
      <div class="bb-sec">
        <button class="bb-btn bb-btn--ghost bb-btn--back" id="bb-back-tpl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Templates
        </button>
      </div>
      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Edit ${editingType === 'desc' ? 'Description' : 'Footer'} Template</h4></div>
        <div class="bb-inp"><label>Template Name</label><input id="bb-tpl-name" value="${esc(tpl.name)}" maxlength="80"/></div>
      </div>
      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Variables</h4></div>
        <p class="bb-hint">Click to insert at cursor. Use <code>{{var}}</code> for values, <code>{{#var}}...{{/var}}</code> for conditionals.</p>
        <div class="bb-tags">
          <div class="bb-tags__group">
            <span class="bb-tags__label">Client/Job</span>
            <span class="bb-tag" data-v="company">company</span>
            <span class="bb-tag" data-v="customerName">customerName</span>
            <span class="bb-tag" data-v="jobName">jobName</span>
            <span class="bb-tag" data-v="jobNumber">jobNumber</span>
            <span class="bb-tag" data-v="date">date</span>
          </div>
          <div class="bb-tags__group">
            <span class="bb-tags__label">Business</span>
            <span class="bb-tag bb-tag--biz" data-v="bizName">bizName</span>
            <span class="bb-tag bb-tag--biz" data-v="bizEmail">bizEmail</span>
            <span class="bb-tag bb-tag--biz" data-v="bizPhone">bizPhone</span>
            <span class="bb-tag bb-tag--biz" data-v="bizAddress">bizAddress</span>
            <span class="bb-tag bb-tag--biz" data-v="bizWebsite">bizWebsite</span>
            <span class="bb-tag bb-tag--biz" data-v="bizLicense">bizLicense</span>
            <span class="bb-tag bb-tag--biz" data-v="ownerName">ownerName</span>
          </div>
          ${customVarTags ? `<div class="bb-tags__group"><span class="bb-tags__label">Custom</span>${customVarTags}</div>` : ''}
        </div>
      </div>
      <div class="bb-sec">
        <div class="bb-inp"><label>Template Content</label><textarea id="bb-tpl-content" rows="${editingType === 'desc' ? 16 : 6}" spellcheck="false">${esc(tpl.content)}</textarea></div>
      </div>
      <div class="bb-sec bb-sec--actions">
        <button class="bb-btn bb-btn--primary" id="bb-save-tpl">Save Template</button>
        <button class="bb-btn bb-btn--ghost" id="bb-cancel-tpl">Cancel</button>
      </div>`;

    // Tag insertion
    body.querySelectorAll('.bb-tag[data-v]').forEach(tag => {
      tag.addEventListener('click', () => {
        const ta = document.getElementById('bb-tpl-content');
        if (!ta) return;
        const v = `{{${tag.dataset.v}}}`;
        const s = ta.selectionStart, e = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + v + ta.value.substring(e);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = s + v.length;
      });
    });

    document.getElementById('bb-back-tpl')?.addEventListener('click', () => {
      editingId = null;
      editingType = null;
      renderTemplates(body);
    });

    document.getElementById('bb-save-tpl')?.addEventListener('click', () => {
      const name = document.getElementById('bb-tpl-name').value.trim();
      const content = document.getElementById('bb-tpl-content').value;
      if (!name) { toast('Template name is required', 'error'); return; }
      tpl.name = name;
      tpl.content = content;
      save(key, _data[key]);
      toast('Template saved');
      editingId = null;
      editingType = null;
      renderTemplates(body);
    });

    document.getElementById('bb-cancel-tpl')?.addEventListener('click', () => {
      editingId = null;
      editingType = null;
      renderTemplates(body);
    });
  }

  // ==========================================================================
  // TAB: SNIPPETS
  // ==========================================================================

  function renderSnippets(body) {
    const snippets = _data.snippets || [];

    if (editingId && editingType === 'snippet') {
      renderSnippetEditor(body);
      return;
    }

    const list = snippets.map(s => `
      <div class="bb-card" data-id="${esc(s.id)}">
        <div class="bb-card__body">
          <div class="bb-card__title">${esc(s.name)}</div>
          <div class="bb-card__preview">${esc((s.content || '').substring(0, 100))}${(s.content || '').length > 100 ? '...' : ''}</div>
        </div>
        <div class="bb-card__actions">
          <button class="bb-btn bb-btn--xs bb-btn--copy-xs" data-action="copy-snippet" data-id="${esc(s.id)}">Copy</button>
          <button class="bb-btn bb-btn--xs" data-action="edit-snippet" data-id="${esc(s.id)}">Edit</button>
          <button class="bb-btn bb-btn--xs bb-btn--danger-xs" data-action="delete-snippet" data-id="${esc(s.id)}">Del</button>
        </div>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="bb-sec">
        <div class="bb-sec__head">
          <h4>Quick Snippets</h4>
          <button class="bb-btn bb-btn--xs bb-btn--add" id="bb-add-snippet">+ New</button>
        </div>
        <p class="bb-hint">Reusable text blocks. Click Copy to grab any snippet instantly.</p>
        <div class="bb-card-list">${list || '<div class="bb-empty">No snippets yet. Click + New to create one.</div>'}</div>
      </div>`;

    body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'copy-snippet') {
        const snip = snippets.find(s => s.id === id);
        if (snip) {
          const rendered = render(snip.content, buildData());
          copyText(rendered, btn);
        }
      } else if (action === 'edit-snippet') {
        editingId = id;
        editingType = 'snippet';
        renderSnippetEditor(body);
      } else if (action === 'delete-snippet') {
        _data.snippets = _data.snippets.filter(s => s.id !== id);
        save('snippets', _data.snippets);
        toast('Snippet deleted');
        renderSnippets(body);
      }
    });

    document.getElementById('bb-add-snippet')?.addEventListener('click', () => {
      const newSnip = { id: uid(), name: 'New Snippet', content: '' };
      _data.snippets.push(newSnip);
      save('snippets', _data.snippets);
      editingId = newSnip.id;
      editingType = 'snippet';
      renderSnippetEditor(body);
    });
  }

  function renderSnippetEditor(body) {
    const snip = (_data.snippets || []).find(s => s.id === editingId);
    if (!snip) { editingId = null; renderSnippets(body); return; }

    body.innerHTML = `
      <div class="bb-sec">
        <button class="bb-btn bb-btn--ghost bb-btn--back" id="bb-back-snip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Snippets
        </button>
      </div>
      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Edit Snippet</h4></div>
        <div class="bb-inp"><label>Snippet Name</label><input id="bb-snip-name" value="${esc(snip.name)}" maxlength="80"/></div>
        <div class="bb-inp"><label>Content</label><textarea id="bb-snip-content" rows="10" spellcheck="false">${esc(snip.content)}</textarea></div>
      </div>
      <div class="bb-sec bb-sec--actions">
        <button class="bb-btn bb-btn--primary" id="bb-save-snip">Save Snippet</button>
        <button class="bb-btn bb-btn--ghost" id="bb-cancel-snip">Cancel</button>
      </div>`;

    document.getElementById('bb-back-snip')?.addEventListener('click', () => {
      editingId = null;
      editingType = null;
      renderSnippets(body);
    });

    document.getElementById('bb-save-snip')?.addEventListener('click', () => {
      const name = document.getElementById('bb-snip-name').value.trim();
      const content = document.getElementById('bb-snip-content').value;
      if (!name) { toast('Snippet name is required', 'error'); return; }
      snip.name = name;
      snip.content = content;
      save('snippets', _data.snippets);
      toast('Snippet saved');
      editingId = null;
      editingType = null;
      renderSnippets(body);
    });

    document.getElementById('bb-cancel-snip')?.addEventListener('click', () => {
      editingId = null;
      editingType = null;
      renderSnippets(body);
    });
  }

  // ==========================================================================
  // TAB: SETTINGS
  // ==========================================================================

  function renderSettings(body) {
    const p = _data.profile || {};
    const cv = _data.customVars || {};
    const prefs = _data.prefs || {};
    const syncToken = _data._syncToken || '';
    const lastSynced = _data._lastSynced || '';

    const customVarRows = Object.entries(cv).map(([k, v]) =>
      `<div class="bb-cv-row">
        <span class="bb-cv-key">${esc(k)}</span>
        <span class="bb-cv-eq">=</span>
        <span class="bb-cv-val">${esc(v)}</span>
        <button class="bb-btn bb-btn--xs bb-btn--danger-xs" data-del-var="${esc(k)}">&times;</button>
      </div>`
    ).join('');

    body.innerHTML = `
      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Business Profile</h4></div>
        <div class="bb-card-inner">
          <div class="bb-grid">
            <div class="bb-inp"><label>Your Name</label><input id="bb-s-name" value="${esc(p.ownerName)}" placeholder="Nick Peret" maxlength="120"/></div>
            <div class="bb-inp"><label>Email</label><input id="bb-s-email" type="email" value="${esc(p.bizEmail)}" placeholder="nick@better-boss.ai" maxlength="200"/></div>
          </div>
          <div class="bb-grid">
            <div class="bb-inp"><label>Company</label><input id="bb-s-company" value="${esc(p.bizName)}" placeholder="Better Boss" maxlength="200"/></div>
            <div class="bb-inp"><label>Phone</label><input id="bb-s-phone" type="tel" value="${esc(p.bizPhone)}" placeholder="(720) 636-9500" maxlength="30"/></div>
          </div>
          <div class="bb-grid">
            <div class="bb-inp"><label>Address</label><input id="bb-s-address" value="${esc(p.bizAddress)}" placeholder="Denver, CO" maxlength="300"/></div>
            <div class="bb-inp"><label>Website</label><input id="bb-s-website" type="url" value="${esc(p.bizWebsite)}" placeholder="https://better-boss.ai" maxlength="200"/></div>
          </div>
          <div class="bb-inp"><label>License #</label><input id="bb-s-license" value="${esc(p.bizLicense)}" placeholder="CON-12345" maxlength="60"/></div>
          <button class="bb-btn bb-btn--primary bb-btn--compact" id="bb-save-profile">Save Profile</button>
        </div>
      </div>

      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Custom Variables</h4></div>
        <p class="bb-hint">Add your own {{variables}} to use in templates. Great for project managers, estimators, etc.</p>
        <div class="bb-card-inner">
          <div class="bb-cv-list">${customVarRows || '<div class="bb-empty">No custom variables yet.</div>'}</div>
          <div class="bb-cv-add">
            <input id="bb-cv-key" placeholder="Variable name" maxlength="40"/>
            <input id="bb-cv-val" placeholder="Value" maxlength="200"/>
            <button class="bb-btn bb-btn--xs bb-btn--add" id="bb-add-cv">+ Add</button>
          </div>
        </div>
      </div>

      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Preferences</h4></div>
        <div class="bb-card-inner">
          <label class="bb-toggle">
            <input type="checkbox" id="bb-pref-shortcuts" ${prefs.shortcuts !== false ? 'checked' : ''}/>
            <span class="bb-toggle__label">Keyboard shortcuts</span>
            <span class="bb-toggle__hint">Ctrl+Shift+B toggle panel &bull; Ctrl+Shift+D copy desc &bull; Ctrl+Shift+F copy footer</span>
          </label>
        </div>
      </div>

      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Cloud Sync</h4></div>
        <div class="bb-card-inner">
          <p class="bb-hint" style="margin-bottom:8px">Sync your profile, templates & snippets across devices via better-boss.ai.</p>
          ${syncToken
            ? `<div class="bb-cv-row" style="margin-bottom:8px">
                <span class="bb-cv-key">Token</span>
                <span class="bb-cv-eq">:</span>
                <span class="bb-cv-val" title="${esc(syncToken)}">${esc(syncToken.substring(0, 12))}...</span>
                <button class="bb-btn bb-btn--xs" id="bb-copy-token">Copy</button>
              </div>
              ${lastSynced ? `<p class="bb-hint" style="margin-bottom:8px">Last synced: ${esc(new Date(lastSynced).toLocaleString())}</p>` : ''}
              <div class="bb-btn-row">
                <button class="bb-btn bb-btn--outline" id="bb-sync-push">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/></svg>
                  Push
                </button>
                <button class="bb-btn bb-btn--outline" id="bb-sync-pull">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Pull
                </button>
                <button class="bb-btn bb-btn--outline bb-btn--danger" id="bb-sync-disconnect">Disconnect</button>
              </div>`
            : `<div class="bb-btn-row">
                <button class="bb-btn bb-btn--outline" id="bb-sync-new">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  New Token
                </button>
                <div class="bb-cv-add" style="flex:1">
                  <input id="bb-sync-token-input" placeholder="Paste existing token" style="flex:1"/>
                  <button class="bb-btn bb-btn--xs bb-btn--add" id="bb-sync-connect">Connect</button>
                </div>
              </div>`
          }
        </div>
      </div>

      <div class="bb-sep"></div>

      <div class="bb-sec">
        <div class="bb-sec__head"><h4>Data</h4></div>
        <div class="bb-card-inner">
          <p class="bb-hint" style="margin-bottom:10px">Export your profile, templates & snippets as a backup. Import to restore on another machine.</p>
          <div class="bb-btn-row">
            <button class="bb-btn bb-btn--outline" id="bb-export">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            <label class="bb-btn bb-btn--outline" style="cursor:pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import
              <input type="file" id="bb-import-file" accept=".json" style="display:none"/>
            </label>
            <button class="bb-btn bb-btn--outline bb-btn--danger" id="bb-clear">Reset All</button>
          </div>
        </div>
      </div>`;

    // Save profile
    document.getElementById('bb-save-profile')?.addEventListener('click', () => {
      const profile = {
        ownerName: document.getElementById('bb-s-name').value.trim(),
        bizEmail: document.getElementById('bb-s-email').value.trim(),
        bizName: document.getElementById('bb-s-company').value.trim(),
        bizPhone: document.getElementById('bb-s-phone').value.trim(),
        bizAddress: document.getElementById('bb-s-address').value.trim(),
        bizWebsite: document.getElementById('bb-s-website').value.trim(),
        bizLicense: document.getElementById('bb-s-license').value.trim(),
      };
      save('profile', profile);
      toast('Profile saved');
    });

    // Add custom variable
    document.getElementById('bb-add-cv')?.addEventListener('click', () => {
      const key = document.getElementById('bb-cv-key').value.trim().replace(/[^a-zA-Z0-9_]/g, '');
      const val = document.getElementById('bb-cv-val').value.trim();
      if (!key) { toast('Variable name required', 'error'); return; }
      if (!val) { toast('Value required', 'error'); return; }
      _data.customVars = _data.customVars || {};
      _data.customVars[key] = val;
      save('customVars', _data.customVars);
      toast(`Variable {{${key}}} added`);
      renderSettings(body);
    });

    // Delete custom variable
    body.querySelectorAll('[data-del-var]').forEach(btn => {
      btn.addEventListener('click', () => {
        delete _data.customVars[btn.dataset.delVar];
        save('customVars', _data.customVars);
        toast('Variable removed');
        renderSettings(body);
      });
    });

    // Preferences
    document.getElementById('bb-pref-shortcuts')?.addEventListener('change', (e) => {
      _data.prefs = _data.prefs || {};
      _data.prefs.shortcuts = e.target.checked;
      save('prefs', _data.prefs);
      toast(e.target.checked ? 'Shortcuts enabled' : 'Shortcuts disabled');
    });

    // Cloud Sync connectors
    document.getElementById('bb-copy-token')?.addEventListener('click', function () {
      copyText(syncToken, this);
    });

    document.getElementById('bb-sync-new')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'generateSyncToken' }, (resp) => {
        if (resp && resp.token) {
          _data._syncToken = resp.token;
          toast('Sync token created — share it across devices');
          renderSettings(body);
        } else {
          toast('Failed to generate token', 'error');
        }
      });
    });

    document.getElementById('bb-sync-connect')?.addEventListener('click', () => {
      const token = document.getElementById('bb-sync-token-input')?.value.trim();
      if (!token || token.length < 8) { toast('Paste a valid sync token', 'error'); return; }
      save('_syncToken', token);
      _data._syncToken = token;
      toast('Connected to sync token');
      renderSettings(body);
    });

    document.getElementById('bb-sync-push')?.addEventListener('click', () => {
      toast('Syncing...');
      chrome.runtime.sendMessage({ action: 'pushSync', token: syncToken }, (resp) => {
        if (resp && resp.success) {
          _data._lastSynced = new Date().toISOString();
          toast('Data pushed to cloud');
          renderSettings(body);
        } else {
          toast('Push failed: ' + (resp?.error || 'Unknown error'), 'error');
        }
      });
    });

    document.getElementById('bb-sync-pull')?.addEventListener('click', () => {
      toast('Pulling...');
      chrome.runtime.sendMessage({ action: 'pullSync', token: syncToken }, (resp) => {
        if (resp && resp.success) {
          // Reload data from storage
          loadData().then(() => {
            toast('Data pulled from cloud');
            renderSettings(body);
          });
        } else {
          toast('Pull failed: ' + (resp?.error || 'Unknown error'), 'error');
        }
      });
    });

    document.getElementById('bb-sync-disconnect')?.addEventListener('click', () => {
      if (!confirm('Disconnect cloud sync? Your local data stays, but syncing stops.')) return;
      delete _data._syncToken;
      delete _data._lastSynced;
      try {
        chrome.storage.local.remove(['_syncToken', '_lastSynced']);
      } catch (e) { /* ignore */ }
      toast('Sync disconnected');
      renderSettings(body);
    });

    // Export
    document.getElementById('bb-export')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(_data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'better-boss-docfill-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('Data exported');
    });

    // Import
    document.getElementById('bb-import-file')?.addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!imported || typeof imported !== 'object') throw new Error('Invalid format');
          // Merge intelligently
          if (imported.profile) save('profile', imported.profile);
          if (imported.descTemplates) save('descTemplates', imported.descTemplates);
          if (imported.footerTemplates) save('footerTemplates', imported.footerTemplates);
          if (imported.snippets) save('snippets', imported.snippets);
          if (imported.customVars) save('customVars', imported.customVars);
          if (imported.activeDescId) save('activeDescId', imported.activeDescId);
          if (imported.activeFooterId) save('activeFooterId', imported.activeFooterId);
          // Handle legacy format (single template)
          if (imported.descriptionTemplate && !imported.descTemplates) {
            _data.descTemplates[0].content = imported.descriptionTemplate;
            save('descTemplates', _data.descTemplates);
          }
          if (imported.footerTemplate && !imported.footerTemplates) {
            _data.footerTemplates[0].content = imported.footerTemplate;
            save('footerTemplates', _data.footerTemplates);
          }
          toast('Data imported successfully');
          renderSettings(body);
        } catch (err) {
          toast('Import failed: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });

    // Clear all
    document.getElementById('bb-clear')?.addEventListener('click', () => {
      if (!confirm('Reset ALL DocFill data? This removes your profile, templates, snippets, and custom variables.')) return;
      _data = getDefaultData();
      saveData(_data);
      toast('All data reset to defaults');
      renderSettings(body);
    });
  }

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================

  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!_data || !_data.prefs || _data.prefs.shortcuts === false) return;
      if (!e.ctrlKey || !e.shiftKey) return;

      if (e.key === 'B' || e.key === 'b') {
        e.preventDefault();
        togglePanel();
      } else if (e.key === 'D' || e.key === 'd') {
        e.preventDefault();
        const raw = document.getElementById('bb-desc-out')?.getAttribute('data-raw');
        if (raw) { copyText(raw); toast('Description copied'); }
      } else if (e.key === 'F' || e.key === 'f') {
        e.preventDefault();
        const raw = document.getElementById('bb-footer-out')?.getAttribute('data-raw');
        if (raw) { copyText(raw); toast('Footer copied'); }
      }
    });
  }

  // ==========================================================================
  // MESSAGES (Chrome Extension API)
  // ==========================================================================

  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((msg, _, reply) => {
      if (msg.action === 'getPageInfo') {
        reply({
          jobInfo: currentJobInfo || extractJobInfo(),
          customerInfo: currentCustomerInfo || extractCustomerInfo(),
          isRelevantPage: isDocPage(),
          url: window.location.href,
        });
        return false;
      }
      if (msg.action === 'togglePanel') {
        togglePanel();
        reply({ success: true });
        return false;
      }
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
        const b = document.getElementById(FAB_ID);
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
    if (isDocPage()) createFAB();
  }

  // ==========================================================================
  // INIT
  // ==========================================================================

  async function init() {
    log(`DocFill v${VERSION} loaded on`, window.location.href);
    await loadData();
    onPageChange();
    watchURL();
    setupShortcuts();

    const debouncedCheck = debounce(() => {
      if (!document.getElementById(FAB_ID) && isDocPage()) createFAB();
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
