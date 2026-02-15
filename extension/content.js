// =============================================================================
// Better Boss — DocFill v4.0
// https://better-boss.ai
//
// Auto-populate document descriptions + footers for JobTread.
// Uses fetch interception to capture real API data — not guesswork.
// =============================================================================

(function () {
  'use strict';

  const VERSION = '4.0.0';
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
    const icon = type === 'success'
      ? '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    el.innerHTML = icon + '<span>' + esc(msg) + '</span>';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('bb-toast--show'));
    setTimeout(() => { el.classList.remove('bb-toast--show'); setTimeout(() => el.remove(), 300); }, 2200);
  }

  // ---------------------------------------------------------------------------
  // 1. FETCH INTERCEPTOR — capture JT's actual API responses
  // ---------------------------------------------------------------------------

  const _captured = { contacts: [], jobs: [], entities: {}, ts: 0 };

  function injectInterceptor() {
    const script = document.createElement('script');
    script.textContent = [
      '(function(){',
      'var F=window.fetch;',
      'window.fetch=function(){',
      '  var a=arguments,u=typeof a[0]==="string"?a[0]:(a[0]||{}).url||"";',
      '  var r=F.apply(this,a);',
      '  try{',
      '    if(/graphql|\\/api|\\.jobtread\\.com/i.test(u)){',
      '      r.then(function(resp){return resp.clone().json();})',
      '       .then(function(j){window.postMessage({t:"__BB__",d:j,u:u},"*");})',
      '       .catch(function(){});',
      '    }',
      '  }catch(e){}',
      '  return r;',
      '};',
      'var XO=XMLHttpRequest.prototype.open,XS=XMLHttpRequest.prototype.send;',
      'XMLHttpRequest.prototype.open=function(m,u){this._bbu=u;return XO.apply(this,arguments);};',
      'XMLHttpRequest.prototype.send=function(){',
      '  var x=this;',
      '  x.addEventListener("load",function(){',
      '    try{',
      '      if(/graphql|\\/api|\\.jobtread\\.com/i.test(x._bbu||"")){',
      '        window.postMessage({t:"__BB__",d:JSON.parse(x.responseText),u:x._bbu},"*");',
      '      }',
      '    }catch(e){}',
      '  });',
      '  return XS.apply(this,arguments);',
      '};',
      '})();',
    ].join('\n');
    (document.head || document.documentElement).prepend(script);
    script.remove();
  }

  // Listen for intercepted API responses
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.t !== '__BB__') return;
    try { processIntercepted(e.data.d); } catch (_) {}
  });

  function processIntercepted(payload) {
    if (!payload || typeof payload !== 'object') return;
    walkObj(payload);
    _captured.ts = Date.now();
  }

  function walkObj(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walkObj); return; }
    tryIdentify(obj);
    for (const k of Object.keys(obj)) {
      if (k === '__typename' || k === 'extensions') continue;
      walkObj(obj[k]);
    }
  }

  function tryIdentify(obj) {
    if (!obj || typeof obj !== 'object' || !obj.id) return;

    // Contact / Customer shape
    if (hasAny(obj, ['firstName', 'lastName']) && !hasAny(obj, ['budget', 'lineItems'])) {
      upsert(_captured.contacts, {
        id: obj.id,
        firstName: obj.firstName || '',
        lastName: obj.lastName || '',
        company: obj.company || obj.companyName || obj.organizationName || '',
        email: obj.email || '',
        phone: obj.phone || obj.mobilePhone || obj.cellPhone || '',
        type: obj.type || obj.contactType || obj.__typename || '',
        address: fmtAddr(obj.address),
      });
    }

    // Job shape
    if (obj.name !== undefined && hasAny(obj, ['status', 'number', 'budget', 'stage', 'jobNumber', 'customer'])) {
      const cust = obj.customer || obj.contact || obj.client || obj.owner || {};
      upsert(_captured.jobs, {
        id: obj.id,
        name: obj.name || '',
        number: obj.number || obj.jobNumber || '',
        status: obj.status || '',
        stage: obj.stage || '',
        description: obj.description || '',
        address: fmtAddr(obj.address || obj.jobAddress || obj.siteAddress),
        custName: joinName(cust.firstName, cust.lastName) || cust.name || '',
        custCompany: cust.company || cust.companyName || '',
        custEmail: cust.email || '',
        custPhone: cust.phone || '',
      });
    }
  }

  function hasAny(o, keys) { return keys.some(k => o[k] !== undefined); }

  function upsert(arr, item) {
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) {
      // Merge — keep non-empty values
      for (const k of Object.keys(item)) { if (item[k]) arr[idx][k] = item[k]; }
    } else {
      arr.push(item);
    }
  }

  function fmtAddr(a) {
    if (!a || typeof a !== 'object') return typeof a === 'string' ? a : '';
    return [a.street1, a.street2, a.city, a.state, a.zip, a.country].filter(Boolean).join(', ');
  }

  function joinName(f, l) { return [f, l].filter(Boolean).join(' '); }

  // ---------------------------------------------------------------------------
  // 2. URL PARSER
  // ---------------------------------------------------------------------------

  function parseURL() {
    const p = location.pathname + location.hash;
    const patterns = [
      [/\/jobs?\/([^/?#]+)/i, 'job'],
      [/\/customers?\/([^/?#]+)/i, 'customer'],
      [/\/contacts?\/([^/?#]+)/i, 'contact'],
      [/\/estimates?\/([^/?#]+)/i, 'estimate'],
      [/\/proposals?\/([^/?#]+)/i, 'proposal'],
      [/\/invoices?\/([^/?#]+)/i, 'invoice'],
      [/\/contracts?\/([^/?#]+)/i, 'contract'],
      [/\/purchase-orders?\/([^/?#]+)/i, 'purchase_order'],
      [/\/change-orders?\/([^/?#]+)/i, 'change_order'],
      [/\/work-orders?\/([^/?#]+)/i, 'work_order'],
      [/\/bills?\/([^/?#]+)/i, 'bill'],
      [/\/quotes?\/([^/?#]+)/i, 'quote'],
      [/\/documents?\/([^/?#]+)/i, 'document'],
      [/\/budget/i, 'budget'],
    ];
    for (const [re, type] of patterns) {
      const m = p.match(re);
      if (m) return { type, id: m[1] || null };
    }
    return { type: 'unknown', id: null };
  }

  const DOC_TYPES = {
    job: 'Job', customer: 'Customer', contact: 'Contact',
    estimate: 'Estimate', proposal: 'Proposal', invoice: 'Invoice',
    contract: 'Contract', purchase_order: 'Purchase Order',
    change_order: 'Change Order', work_order: 'Work Order',
    bill: 'Bill', quote: 'Quote', document: 'Document', budget: 'Budget',
  };

  // ---------------------------------------------------------------------------
  // 3. DOM SCRAPER — smart fallback for when interceptor hasn't captured yet
  // ---------------------------------------------------------------------------

  function scrapeDOMFallback() {
    const d = { customerName: '', company: '', customerEmail: '', customerPhone: '', jobName: '', jobNumber: '', jobAddress: '' };
    try {
      // Title
      const titleClean = (document.title || '').replace(/\s*[-|–—]\s*JobTread.*$/i, '').trim();
      if (titleClean && titleClean.length > 1 && titleClean.length < 120) d.jobName = titleClean;

      // Headings
      const skip = new Set(['jobs', 'documents', 'settings', 'dashboard', 'home', 'contacts', 'customers', 'loading', 'jobtread', 'sign in', 'log in']);
      for (const h of document.querySelectorAll('h1, h2, [role="heading"]')) {
        const t = h.textContent.trim();
        if (t.length > 1 && t.length < 100 && !skip.has(t.toLowerCase())) {
          d.jobName = t;
          break;
        }
      }

      // Visible text patterns
      const body = document.body?.innerText || '';

      // Email
      const em = body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (em) d.customerEmail = em[1];

      // Phone
      const ph = body.match(/(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/);
      if (ph) d.customerPhone = ph[1];

      // Job number
      const jn = body.match(/(?:Job|Project)\s*#?\s*:?\s*(\d{3,})/i);
      if (jn) d.jobNumber = jn[1];

      // Label-value pairs — broad selectors for React SPAs
      const labelEls = document.querySelectorAll(
        '[class*="label" i], [class*="field" i], [class*="detail" i], [class*="info" i], ' +
        '[class*="header" i], [class*="title" i], dt, th, label, ' +
        '[data-testid], [data-field], [aria-label]'
      );
      for (const el of labelEls) {
        const lt = (el.textContent || '').trim().toLowerCase().replace(/:$/, '');
        if (lt.length > 30 || lt.length < 2) continue;

        let val = '';
        const next = el.nextElementSibling;
        if (next) val = next.textContent.trim();
        if (!val || val.length > 200) {
          const p = el.parentElement;
          if (p) {
            const dd = p.querySelector('dd, [class*="value" i], [class*="data" i], [class*="content" i]');
            if (dd) val = dd.textContent.trim();
          }
        }
        if (!val || val.length > 200) continue;

        if (!d.customerName && /^(customer|client|contact|owner|bill\s*to|sold\s*to)$/.test(lt)) d.customerName = val;
        if (!d.company && /^(company|organization|business|firm)$/.test(lt)) d.company = val;
        if (!d.jobNumber && /^(job\s*#|job\s*no|job\s*number|project\s*number)$/.test(lt)) d.jobNumber = val;
        if (!d.jobAddress && /^(address|job\s*address|site\s*address|project\s*address|location)$/.test(lt)) d.jobAddress = val;
      }

      // Breadcrumbs
      for (const a of document.querySelectorAll('nav a, [class*="breadcrumb" i] a, [aria-label*="breadcrumb" i] a')) {
        const t = a.textContent.trim();
        if (t.length > 2 && t.length < 80 && !skip.has(t.toLowerCase())) {
          if (!d.jobName) d.jobName = t;
        }
      }

      // Detect company-like customer names
      if (d.customerName && !d.company) {
        const biz = ['llc', 'inc', 'corp', 'co', 'ltd', 'group', 'services', 'construction', 'builders', 'contracting', 'enterprises', 'homes', 'roofing', 'plumbing', 'electric', 'remodeling', 'renovations', 'design', 'solutions'];
        if (d.customerName.split(/\s+/).some(w => biz.includes(w.toLowerCase().replace(/[.,]/g, '')))) {
          d.company = d.customerName;
        }
      }
    } catch (_) {}
    return d;
  }

  // ---------------------------------------------------------------------------
  // 4. COMBINED DATA GATHERER
  // ---------------------------------------------------------------------------

  function gatherData() {
    const url = parseURL();
    const dom = scrapeDOMFallback();

    const r = {
      customerName: '', company: '', customerEmail: '', customerPhone: '',
      customerAddress: '', jobName: '', jobNumber: '', jobAddress: '',
      docType: DOC_TYPES[url.type] || '', pageType: url.type, source: 'none',
      fieldCount: 0,
    };

    // Intercepted data (priority)
    if (_captured.ts > 0) {
      let job = url.id ? _captured.jobs.find(j => j.id === url.id) : null;
      if (!job && _captured.jobs.length) job = _captured.jobs[_captured.jobs.length - 1];

      if (job) {
        r.jobName = job.name; r.jobNumber = job.number; r.jobAddress = job.address;
        r.customerName = job.custName; r.company = job.custCompany;
        r.customerEmail = job.custEmail; r.customerPhone = job.custPhone;
        r.source = 'api';
      }

      if (['customer', 'contact'].includes(url.type)) {
        let c = url.id ? _captured.contacts.find(x => x.id === url.id) : null;
        if (!c && _captured.contacts.length) c = _captured.contacts[_captured.contacts.length - 1];
        if (c) {
          r.customerName = joinName(c.firstName, c.lastName) || r.customerName;
          r.company = c.company || r.company;
          r.customerEmail = c.email || r.customerEmail;
          r.customerPhone = c.phone || r.customerPhone;
          r.customerAddress = c.address || r.customerAddress;
          r.source = 'api';
        }
      }
    }

    // Fill gaps from DOM
    if (!r.jobName) r.jobName = dom.jobName;
    if (!r.jobNumber) r.jobNumber = dom.jobNumber;
    if (!r.customerName) r.customerName = dom.customerName;
    if (!r.company) r.company = dom.company;
    if (!r.customerEmail) r.customerEmail = dom.customerEmail;
    if (!r.customerPhone) r.customerPhone = dom.customerPhone;
    if (!r.jobAddress) r.jobAddress = dom.jobAddress;
    if (r.source === 'none' && (r.jobName || r.customerName)) r.source = 'dom';

    // Count filled fields
    r.fieldCount = [r.customerName, r.company, r.customerEmail, r.customerPhone, r.jobName, r.jobNumber, r.jobAddress, r.customerAddress].filter(Boolean).length;

    return r;
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
      { id: 'blank', name: 'Blank', body: '' },
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
      { id: 'blank', name: 'None', body: '' },
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
          let save = false;
          for (const k of Object.keys(d)) {
            if (_data[k] === undefined) { _data[k] = d[k]; save = true; }
          }
          if (save) chrome.storage.local.set(_data);
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
  // Template engine
  // ---------------------------------------------------------------------------

  function render(tpl, data) {
    let r = tpl || '';
    r = r.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, c) =>
      (data[k] && data[k].toString().trim()) ? c.replace(/\{\{(\w+)\}\}/g, (__, kk) => data[kk] || '') : ''
    );
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
        ta.remove();
        return ok;
      } catch (__) { return false; }
    }
  }

  // ---------------------------------------------------------------------------
  // Page detection
  // ---------------------------------------------------------------------------

  function isRelevantPage() {
    const p = location.pathname.toLowerCase();
    if (['/settings', '/plans', '/catalog', '/login', '/signup', '/register'].some(x => p.includes(x))) return false;
    const relevant = ['/jobs', '/documents', '/invoices', '/estimates', '/proposals', '/contracts', '/purchase-orders', '/change-orders', '/work-orders', '/bills', '/budget', '/quotes', '/customers', '/contacts'];
    return relevant.some(x => p.includes(x));
  }

  // ---------------------------------------------------------------------------
  // Trigger FAB
  // ---------------------------------------------------------------------------

  function createTrigger() {
    if (document.getElementById(TRIGGER_ID)) return;
    const btn = document.createElement('button');
    btn.id = TRIGGER_ID;
    btn.className = 'bb-fab';
    btn.title = 'Better Boss DocFill (Ctrl+Shift+B)';
    btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span>DocFill</span>';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
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
  let _pageData = null;

  function toggle() { panelOpen ? closePanel() : openPanel(); }

  function closePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) { p.classList.add('bb-panel--out'); setTimeout(() => p.remove(), 200); }
    panelOpen = false;
  }

  async function openPanel() {
    if (!_data) await load();
    closePanel();
    _pageData = gatherData();
    const prof = _data.profile || {};

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = buildHTML(prof);
    document.body.appendChild(panel);
    panelOpen = true;
    currentView = 'main';
    bindEvents(panel);
    generate();
  }

  // ---------------------------------------------------------------------------
  // Panel HTML
  // ---------------------------------------------------------------------------

  function buildHTML(prof) {
    const hasProfile = !!prof.ownerName;
    const pg = _pageData || {};
    const descTpls = _data.descTemplates || [];
    const footerTpls = _data.footerTemplates || [];
    const descOpts = descTpls.map(t => `<option value="${esc(t.id)}"${t.id === _data.activeDesc ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const footerOpts = footerTpls.map(t => `<option value="${esc(t.id)}"${t.id === _data.activeFooter ? ' selected' : ''}>${esc(t.name)}</option>`).join('');

    // Detected data rows
    const fields = [];
    if (pg.customerName) fields.push(['Customer', pg.customerName]);
    if (pg.company) fields.push(['Company', pg.company]);
    if (pg.customerEmail) fields.push(['Email', pg.customerEmail]);
    if (pg.customerPhone) fields.push(['Phone', pg.customerPhone]);
    if (pg.jobName) fields.push(['Job', pg.jobName]);
    if (pg.jobNumber) fields.push(['Job #', pg.jobNumber]);
    if (pg.jobAddress) fields.push(['Address', pg.jobAddress]);
    if (pg.docType) fields.push(['Type', pg.docType]);

    const sourceBadge = pg.source === 'api'
      ? '<span class="bb-badge bb-badge--green">LIVE DATA</span>'
      : pg.source === 'dom'
        ? '<span class="bb-badge bb-badge--yellow">SCRAPED</span>'
        : '';

    const statusDot = pg.fieldCount > 0 ? 'bb-dot--on' : 'bb-dot--off';
    const statusText = pg.fieldCount > 0
      ? `${pg.docType || 'Page'} · ${pg.fieldCount} field${pg.fieldCount !== 1 ? 's' : ''} detected`
      : 'No data detected — navigate to a job or document';

    const dataHTML = fields.length > 0
      ? `<div class="bb-card">
          <div class="bb-card-hd"><span class="bb-card-label">Detected Data</span>${sourceBadge}</div>
          <div class="bb-data">${fields.map(([k, v]) =>
            `<div class="bb-data-row"><span class="bb-data-k">${esc(k)}</span><span class="bb-data-v">${esc(v)}</span></div>`
          ).join('')}</div>
        </div>`
      : `<div class="bb-card bb-card--empty">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div class="bb-empty-text">No data detected yet</div>
          <div class="bb-empty-hint">Navigate to a job or document in JobTread, then click the refresh button above.</div>
        </div>`;

    return `<div class="bb">
      <div class="bb-hd">
        <div class="bb-hd-brand">
          <div class="bb-logo">B</div>
          <div class="bb-hd-text">
            <span class="bb-hd-title">Better Boss</span>
          </div>
        </div>
        <div class="bb-hd-actions">
          <button class="bb-btn-icon" id="bb-refresh" title="Re-scan page">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button class="bb-btn-icon" id="bb-gear" title="Templates">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="bb-btn-icon" id="bb-close" title="Close">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Status bar -->
      <div class="bb-status">
        <div class="bb-dot ${statusDot}"></div>
        <span>${statusText}</span>
      </div>

      <!-- Main view -->
      <div class="bb-body" id="bb-view-main">
        ${!hasProfile ? `
        <div class="bb-card bb-card--notice">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>Set up your business profile in <a href="#" id="bb-open-opts">extension settings</a> to auto-fill your info into templates.</div>
        </div>` : `
        <div class="bb-profile">
          <div class="bb-avatar">${initials(prof.ownerName)}</div>
          <div class="bb-profile-text">
            <span class="bb-profile-name">${esc(prof.ownerName)}</span>
            <span class="bb-profile-co">${esc(prof.bizName || '')}</span>
          </div>
        </div>`}

        ${dataHTML}

        <details class="bb-card bb-card--toggle">
          <summary class="bb-toggle-hd">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            <span>Override fields</span>
            <svg class="bb-chevron" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </summary>
          <div class="bb-toggle-body">
            <div class="bb-row">
              <div class="bb-input-group"><label>Customer</label><input id="bb-f-name" value="${esc(pg.customerName)}" placeholder="Auto" /></div>
              <div class="bb-input-group"><label>Company</label><input id="bb-f-company" value="${esc(pg.company)}" placeholder="Auto" /></div>
            </div>
            <div class="bb-row">
              <div class="bb-input-group bb-input-group--grow"><label>Job Name</label><input id="bb-f-job" value="${esc(pg.jobName)}" placeholder="Auto" /></div>
              <div class="bb-input-group bb-input-group--sm"><label>Job #</label><input id="bb-f-jobnum" value="${esc(pg.jobNumber)}" placeholder="#" /></div>
            </div>
          </div>
        </details>

        <div class="bb-sep"></div>

        <div class="bb-section">
          <div class="bb-section-hd">
            <span class="bb-section-label">Description</span>
            <select id="bb-sel-desc" class="bb-select">${descOpts}</select>
          </div>
          <div class="bb-preview" id="bb-preview-desc" tabindex="0"></div>
          <button class="bb-btn bb-btn--outline" id="bb-copy-desc">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Description
          </button>
        </div>

        <div class="bb-sep"></div>

        <div class="bb-section">
          <div class="bb-section-hd">
            <span class="bb-section-label">Footer</span>
            <select id="bb-sel-footer" class="bb-select">${footerOpts}</select>
          </div>
          <div class="bb-preview bb-preview--sm" id="bb-preview-footer" tabindex="0"></div>
          <button class="bb-btn bb-btn--outline" id="bb-copy-footer">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Footer
          </button>
        </div>

        <div class="bb-sep"></div>

        <button class="bb-btn bb-btn--primary" id="bb-copy-all">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy All
        </button>
      </div>

      <!-- Templates view -->
      <div class="bb-body" id="bb-view-tpls" style="display:none">
        <button class="bb-back" id="bb-back-main">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div class="bb-section">
          <div class="bb-section-hd"><span class="bb-section-label">Description Templates</span><button class="bb-btn--sm" id="bb-add-desc">+ New</button></div>
          <div class="bb-tpl-list" id="bb-desc-list"></div>
        </div>
        <div class="bb-sep"></div>
        <div class="bb-section">
          <div class="bb-section-hd"><span class="bb-section-label">Footer Templates</span><button class="bb-btn--sm" id="bb-add-footer">+ New</button></div>
          <div class="bb-tpl-list" id="bb-footer-list"></div>
        </div>
      </div>

      <!-- Edit template view -->
      <div class="bb-body" id="bb-view-edit" style="display:none">
        <button class="bb-back" id="bb-back-tpls">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div class="bb-section">
          <div class="bb-section-label" id="bb-edit-title">Edit Template</div>
          <div class="bb-input-group" style="margin-top:12px"><label>Name</label><input id="bb-edit-name" maxlength="80" /></div>
          <div class="bb-input-group" style="margin-top:8px">
            <label>Content <span class="bb-hint">Use {{variable}} for auto-fill</span></label>
            <textarea id="bb-edit-body" rows="14"></textarea>
          </div>
          <div class="bb-vars">
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
            <button class="bb-btn bb-btn--primary" id="bb-save-tpl">Save</button>
            <button class="bb-btn bb-btn--ghost" id="bb-cancel-edit">Cancel</button>
          </div>
        </div>
      </div>

      <div class="bb-ft">
        Better Boss <span class="bb-ft-sep">&middot;</span> <a href="https://better-boss.ai" target="_blank" rel="noopener">better-boss.ai</a>
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------------

  function bindEvents(panel) {
    const dg = debounce(generate, 200);

    panel.querySelector('#bb-close').addEventListener('click', closePanel);

    // Refresh
    panel.querySelector('#bb-refresh').addEventListener('click', () => {
      _pageData = gatherData();
      for (const [id, key] of [['bb-f-name', 'customerName'], ['bb-f-company', 'company'], ['bb-f-job', 'jobName'], ['bb-f-jobnum', 'jobNumber']]) {
        const el = panel.querySelector('#' + id);
        if (el && _pageData[key]) el.value = _pageData[key];
      }
      // Re-render status
      const statusEl = panel.querySelector('.bb-status span');
      if (statusEl) {
        statusEl.textContent = _pageData.fieldCount > 0
          ? `${_pageData.docType || 'Page'} · ${_pageData.fieldCount} field${_pageData.fieldCount !== 1 ? 's' : ''} detected`
          : 'No data detected — navigate to a job or document';
      }
      const dot = panel.querySelector('.bb-dot');
      if (dot) { dot.className = 'bb-dot ' + (_pageData.fieldCount > 0 ? 'bb-dot--on' : 'bb-dot--off'); }
      generate();
      toast('Page re-scanned');
    });

    // Manual inputs
    for (const id of ['bb-f-name', 'bb-f-company', 'bb-f-job', 'bb-f-jobnum']) {
      const el = panel.querySelector('#' + id);
      if (el) el.addEventListener('input', dg);
    }

    // Template selects
    panel.querySelector('#bb-sel-desc').addEventListener('change', (e) => { save('activeDesc', e.target.value); generate(); });
    panel.querySelector('#bb-sel-footer').addEventListener('change', (e) => { save('activeFooter', e.target.value); generate(); });

    // Copy
    panel.querySelector('#bb-copy-desc').addEventListener('click', async function () {
      const raw = panel.querySelector('#bb-preview-desc')?.dataset.raw || '';
      if (await copyText(raw)) flashBtn(this, 'Copied!');
    });
    panel.querySelector('#bb-copy-footer').addEventListener('click', async function () {
      const raw = panel.querySelector('#bb-preview-footer')?.dataset.raw || '';
      if (await copyText(raw)) flashBtn(this, 'Copied!');
    });
    panel.querySelector('#bb-copy-all').addEventListener('click', async function () {
      const d = panel.querySelector('#bb-preview-desc')?.dataset.raw || '';
      const f = panel.querySelector('#bb-preview-footer')?.dataset.raw || '';
      if (await copyText(d + (f ? '\n\n---\n\n' + f : ''))) flashBtn(this, 'Copied!');
    });

    // Options link
    const optLink = panel.querySelector('#bb-open-opts');
    if (optLink) optLink.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.sendMessage({ action: 'openOptions' }); });

    // Views
    panel.querySelector('#bb-gear').addEventListener('click', () => showView('tpls'));
    panel.querySelector('#bb-back-main').addEventListener('click', () => showView('main'));
    panel.querySelector('#bb-back-tpls').addEventListener('click', () => showView('tpls'));

    // Add templates
    panel.querySelector('#bb-add-desc').addEventListener('click', () => {
      const id = 'desc_' + Date.now().toString(36);
      _data.descTemplates.push({ id, name: 'New Template', body: '' });
      save('descTemplates', _data.descTemplates);
      editTarget = { type: 'desc', id };
      showView('edit');
    });
    panel.querySelector('#bb-add-footer').addEventListener('click', () => {
      const id = 'footer_' + Date.now().toString(36);
      _data.footerTemplates.push({ id, name: 'New Footer', body: '' });
      save('footerTemplates', _data.footerTemplates);
      editTarget = { type: 'footer', id };
      showView('edit');
    });

    // Save template
    panel.querySelector('#bb-save-tpl').addEventListener('click', () => {
      if (!editTarget) return;
      const key = editTarget.type === 'desc' ? 'descTemplates' : 'footerTemplates';
      const tpl = _data[key].find(t => t.id === editTarget.id);
      if (!tpl) return;
      const n = panel.querySelector('#bb-edit-name').value.trim();
      if (!n) { toast('Name required', 'error'); return; }
      tpl.name = n;
      tpl.body = panel.querySelector('#bb-edit-body').value;
      save(key, _data[key]);
      toast('Template saved');
      refreshSelectors();
      showView('tpls');
    });
    panel.querySelector('#bb-cancel-edit').addEventListener('click', () => showView('tpls'));

    // Variable tags
    panel.querySelectorAll('.bb-var[data-v]').forEach(tag => {
      tag.addEventListener('click', () => {
        const ta = panel.querySelector('#bb-edit-body');
        if (!ta) return;
        const v = '{{' + tag.dataset.v + '}}';
        const s = ta.selectionStart, e = ta.selectionEnd;
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
    panel.querySelector('#bb-view-main').style.display = view === 'main' ? '' : 'none';
    panel.querySelector('#bb-view-tpls').style.display = view === 'tpls' ? '' : 'none';
    panel.querySelector('#bb-view-edit').style.display = view === 'edit' ? '' : 'none';
    if (view === 'tpls') renderTplList();
    if (view === 'edit') renderEditTpl();
    if (view === 'main') generate();
  }

  function renderTplList() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.querySelector('#bb-desc-list').innerHTML = (_data.descTemplates || []).map(t => tplCard(t, 'desc', t.id === _data.activeDesc)).join('');
    panel.querySelector('#bb-footer-list').innerHTML = (_data.footerTemplates || []).map(t => tplCard(t, 'footer', t.id === _data.activeFooter)).join('');
    panel.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { act, ttype, tid } = btn.dataset;
        const key = ttype === 'desc' ? 'descTemplates' : 'footerTemplates';
        const akey = ttype === 'desc' ? 'activeDesc' : 'activeFooter';
        if (act === 'use') { save(akey, tid); refreshSelectors(); toast('Activated'); renderTplList(); }
        else if (act === 'edit') { editTarget = { type: ttype, id: tid }; showView('edit'); }
        else if (act === 'del') { _data[key] = _data[key].filter(t => t.id !== tid); save(key, _data[key]); refreshSelectors(); toast('Deleted'); renderTplList(); }
      });
    });
  }

  function tplCard(t, type, active) {
    const preview = (t.body || '').substring(0, 55).replace(/\n/g, ' ');
    return `<div class="bb-tpl${active ? ' bb-tpl--active' : ''}">
      <div class="bb-tpl-info">
        <div class="bb-tpl-name">${esc(t.name)}${active ? '<span class="bb-badge bb-badge--accent">Active</span>' : ''}</div>
        <div class="bb-tpl-preview">${esc(preview)}${preview.length >= 55 ? '…' : ''}</div>
      </div>
      <div class="bb-tpl-acts">
        ${!active ? `<button class="bb-btn--sm" data-act="use" data-ttype="${type}" data-tid="${esc(t.id)}">Use</button>` : ''}
        <button class="bb-btn--sm" data-act="edit" data-ttype="${type}" data-tid="${esc(t.id)}">Edit</button>
        <button class="bb-btn--sm bb-btn--danger" data-act="del" data-ttype="${type}" data-tid="${esc(t.id)}">Del</button>
      </div>
    </div>`;
  }

  function renderEditTpl() {
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
    const ds = panel.querySelector('#bb-sel-desc');
    const fs = panel.querySelector('#bb-sel-footer');
    if (ds) ds.innerHTML = (_data.descTemplates || []).map(t => `<option value="${esc(t.id)}"${t.id === _data.activeDesc ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    if (fs) fs.innerHTML = (_data.footerTemplates || []).map(t => `<option value="${esc(t.id)}"${t.id === _data.activeFooter ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  }

  // ---------------------------------------------------------------------------
  // Generate output
  // ---------------------------------------------------------------------------

  function generate() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || currentView !== 'main') return;

    const prof = _data.profile || {};
    const pg = _pageData || {};

    const data = {
      company: panel.querySelector('#bb-f-company')?.value || pg.company || '',
      customerName: panel.querySelector('#bb-f-name')?.value || pg.customerName || '',
      customerEmail: pg.customerEmail || '',
      customerPhone: pg.customerPhone || '',
      customerAddress: pg.customerAddress || '',
      jobName: panel.querySelector('#bb-f-job')?.value || pg.jobName || '',
      jobNumber: panel.querySelector('#bb-f-jobnum')?.value || pg.jobNumber || '',
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

    const de = panel.querySelector('#bb-preview-desc');
    const fe = panel.querySelector('#bb-preview-footer');
    if (de) { de.dataset.raw = descText; de.textContent = descText || '(empty template)'; }
    if (fe) { fe.dataset.raw = footerText; fe.textContent = footerText || '(empty)'; }
  }

  function flashBtn(btn, msg) {
    toast(msg);
    btn.classList.add('bb-btn--copied');
    setTimeout(() => btn.classList.remove('bb-btn--copied'), 1500);
  }

  // ---------------------------------------------------------------------------
  // Keyboard
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
        reply({ isDocPage: isRelevantPage(), pageData: gatherData(), url: location.href });
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
        closePanel();
        removeTrigger();
        if (isRelevantPage()) createTrigger();
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
    // Inject API interceptor immediately
    injectInterceptor();

    // Wait for body
    if (!document.body) {
      await new Promise(r => {
        if (document.readyState !== 'loading') return r();
        document.addEventListener('DOMContentLoaded', r);
      });
    }

    await load();
    if (isRelevantPage()) createTrigger();
    watchURL();

    // Watch for SPA content changes
    const obs = new MutationObserver(debounce(() => {
      if (!document.getElementById(TRIGGER_ID) && isRelevantPage()) createTrigger();
    }, 500));
    obs.observe(document.body, { childList: true, subtree: true });
  }

  init();
})();
