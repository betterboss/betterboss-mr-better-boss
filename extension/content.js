// =============================================================================
// Better Boss DocFill — Content Script
// Generates pre-formatted document text (description & footer) using
// job/customer info + saved business profile. User copies and pastes into
// the correct JobTread fields.
//
// JobTread formatting syntax (plaintext markdown):
//   *bold*  ^italic^  _underline_  ~strikethrough~
//   # H1  ## H2  ### H3  #### H4
//   - bullet  1. numbered
//   > quote   --- horizontal rule
//   [text](url) links
// =============================================================================

(function () {
  'use strict';

  const BUTTON_ID = 'bb-autofill-btn';
  const PANEL_ID = 'bb-autofill-panel';

  let currentJobInfo = null;
  let currentCustomerInfo = null;
  let cachedProfile = null;

  function log(...args) {
    console.log('[BB DocFill]', ...args);
  }

  // ---- Page Detection ----

  function isRelevantPage() {
    const path = window.location.pathname;
    return (
      path.includes('/jobs/') ||
      path.includes('/documents/') ||
      path.includes('/invoices/') ||
      path.includes('/estimates/') ||
      path.includes('/proposals/') ||
      path.includes('/contracts/') ||
      path.includes('/purchase-orders/') ||
      path.includes('/change-orders/') ||
      path.includes('/work-orders/') ||
      path.includes('/bills/') ||
      path.includes('/budget')
    );
  }

  function isExcludedPage() {
    const path = window.location.pathname;
    return (
      path.includes('/settings') ||
      path.includes('/plans') ||
      path.includes('/catalog')
    );
  }

  // ---- Info Extraction ----

  function extractJobInfo() {
    const info = { jobName: '', jobNumber: '', jobAddress: '', jobId: '' };

    const headings = document.querySelectorAll('h1, h2');
    for (const h of headings) {
      const text = h.textContent.trim();
      if (text.length > 2 && text.length < 200) {
        info.jobName = text;
        break;
      }
    }

    if (!info.jobName) {
      const m = document.title.match(/^(.+?)(?:\s*[-|]\s*JobTread)?$/i);
      if (m) info.jobName = m[1].trim();
    }

    const numMatch = document.body.innerText.match(/(?:Job\s*#?\s*|#)(\d{3,})/i);
    if (numMatch) info.jobNumber = numMatch[1];

    const idMatch = window.location.pathname.match(/\/jobs\/([^/]+)/);
    if (idMatch) info.jobId = idMatch[1];

    return info;
  }

  function extractCustomerInfo() {
    const info = { customerName: '', company: '', email: '', phone: '' };

    const allText = document.body.innerText;
    const emailMatch = allText.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) info.email = emailMatch[0];

    const phoneMatch = allText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) info.phone = phoneMatch[0];

    return info;
  }

  // ---- Templates ----

  function getDefaultDescriptionTemplate() {
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
Complete cost catalog build including suppliers, labor, materials, cost groups, product and material catalog (Lowe\u2019s + local vendors) uploaded, standardized, and linked to cost codes.
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

  /**
   * Mustache-style template renderer.
   * {{variable}} — replaced with value
   * {{#variable}}...{{/variable}} — only included if variable has a value
   */
  function renderTemplate(template, data) {
    let result = template;

    // Conditional blocks
    result = result.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, key, content) => {
        if (data[key] && data[key].toString().trim()) {
          return content.replace(/\{\{(\w+)\}\}/g, (__, k) => data[k] || '');
        }
        return '';
      }
    );

    // Simple variables
    result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');

    // Clean up extra blank lines
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    return result;
  }

  // ---- Storage ----

  function getStoredSettings() {
    return new Promise((resolve) => {
      if (chrome && chrome.storage) {
        chrome.storage.sync.get(null, (result) => resolve(result || {}));
      } else {
        resolve({});
      }
    });
  }

  // ---- Copy to Clipboard ----

  async function copyToClipboard(text, buttonEl) {
    try {
      await navigator.clipboard.writeText(text);
      const orig = buttonEl.textContent;
      buttonEl.textContent = 'Copied!';
      buttonEl.classList.add('bb-btn--copied');
      setTimeout(() => {
        buttonEl.textContent = orig;
        buttonEl.classList.remove('bb-btn--copied');
      }, 1500);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      const orig = buttonEl.textContent;
      buttonEl.textContent = 'Copied!';
      buttonEl.classList.add('bb-btn--copied');
      setTimeout(() => {
        buttonEl.textContent = orig;
        buttonEl.classList.remove('bb-btn--copied');
      }, 1500);
    }
  }

  // ---- Floating Action Button ----

  function createFloatingButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement('div');
    btn.id = BUTTON_ID;
    btn.innerHTML = `
      <button class="bb-fab" title="Better Boss DocFill">
        <span class="bb-fab__text">BB</span>
      </button>
    `;
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  // ---- Side Panel ----

  function togglePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
      return;
    }
    createPanel();
  }

  function getInitials(name) {
    if (!name) return 'BB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  async function createPanel() {
    const jobInfo = currentJobInfo || extractJobInfo();
    const customerInfo = currentCustomerInfo || extractCustomerInfo();
    currentJobInfo = jobInfo;
    currentCustomerInfo = customerInfo;

    const stored = await getStoredSettings();
    const profile = stored.profile || {};
    cachedProfile = profile;

    const isLoggedIn = profile && profile.ownerName;
    const profileLabel = isLoggedIn
      ? `<div class="bb-profile-badge">
           <div class="bb-profile-badge__avatar">${getInitials(profile.ownerName)}</div>
           <div class="bb-profile-badge__info">
             <strong>${escapeAttr(profile.ownerName)}</strong>
             <span>${escapeAttr(profile.bizName || '')}</span>
           </div>
         </div>`
      : `<p class="bb-help" style="color:#f97316;">No profile set up. <a href="#" id="bb-open-settings" style="color:#0c8ce9;text-decoration:underline;">Open Settings</a> to create one.</p>`;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="bb-panel">
        <div class="bb-panel__header">
          <div class="bb-panel__brand">
            <div class="bb-panel__logo">BB</div>
            <div>
              <h3>Better Boss <span style="color:#f97316;">DocFill</span></h3>
            </div>
          </div>
          <button class="bb-panel__close" id="bb-close-panel">&times;</button>
        </div>

        <div class="bb-panel__body">
          <!-- Profile badge -->
          <div class="bb-panel__section">
            ${profileLabel}
          </div>

          <div class="bb-divider"></div>

          <!-- Customer / Job fields -->
          <div class="bb-panel__section">
            <h4>Client & Job Details</h4>
            <div class="bb-field-group">
              <label>Client's Company</label>
              <input type="text" id="bb-company" value="${escapeAttr(customerInfo.company)}" placeholder="e.g. Smith Remodeling LLC"/>
            </div>
            <div class="bb-field-group">
              <label>Client Contact Name</label>
              <input type="text" id="bb-customer-name" value="${escapeAttr(customerInfo.customerName)}" placeholder="e.g. John Smith"/>
            </div>
            <div class="bb-field-group">
              <label>Job Name</label>
              <input type="text" id="bb-job-name" value="${escapeAttr(jobInfo.jobName)}" placeholder="e.g. Kitchen Remodel"/>
            </div>
            <div class="bb-field-group">
              <label>Job Number</label>
              <input type="text" id="bb-job-number" value="${escapeAttr(jobInfo.jobNumber)}" placeholder="e.g. 1234"/>
            </div>
          </div>

          <div class="bb-divider"></div>

          <!-- DESCRIPTION output -->
          <div class="bb-panel__section">
            <div class="bb-section-header">
              <h4>Description Text</h4>
              <button class="bb-btn bb-btn--copy" id="bb-copy-desc">Copy Description</button>
            </div>
            <p class="bb-help">Copy and paste into the Description field.</p>
            <div class="bb-output" id="bb-desc-output"></div>
          </div>

          <div class="bb-divider"></div>

          <!-- FOOTER output -->
          <div class="bb-panel__section">
            <div class="bb-section-header">
              <h4>Footer Text</h4>
              <button class="bb-btn bb-btn--copy" id="bb-copy-footer">Copy Footer</button>
            </div>
            <p class="bb-help">Copy and paste into the Footer field.</p>
            <div class="bb-output bb-output--small" id="bb-footer-output"></div>
          </div>

          <!-- Generate button -->
          <div class="bb-panel__section">
            <button class="bb-btn bb-btn--primary" id="bb-generate">Generate Text</button>
          </div>
        </div>

        <div class="bb-panel__footer">
          Better Boss DocFill v1.0.0
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Wire up events
    document.getElementById('bb-close-panel').addEventListener('click', () => panel.remove());
    document.getElementById('bb-generate').addEventListener('click', generateOutput);
    document.getElementById('bb-copy-desc').addEventListener('click', function () {
      const text = document.getElementById('bb-desc-output').getAttribute('data-raw') || '';
      copyToClipboard(text, this);
    });
    document.getElementById('bb-copy-footer').addEventListener('click', function () {
      const text = document.getElementById('bb-footer-output').getAttribute('data-raw') || '';
      copyToClipboard(text, this);
    });

    // Settings link (if not logged in)
    const settingsLink = document.getElementById('bb-open-settings');
    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openOptions' });
      });
    }

    // Re-generate on input change
    ['bb-company', 'bb-customer-name', 'bb-job-name', 'bb-job-number'].forEach((id) => {
      document.getElementById(id).addEventListener('input', generateOutput);
    });

    // Generate immediately
    generateOutput();
  }

  async function generateOutput() {
    const company = document.getElementById('bb-company')?.value || '';
    const customerName = document.getElementById('bb-customer-name')?.value || '';
    const jobName = document.getElementById('bb-job-name')?.value || '';
    const jobNumber = document.getElementById('bb-job-number')?.value || '';

    const stored = await getStoredSettings();
    const profile = stored.profile || {};

    const data = {
      // Client/job fields (entered per-document)
      company,
      customerName,
      jobName,
      jobNumber,
      jobAddress: '',
      customerEmail: '',
      customerPhone: '',
      date: new Date().toLocaleDateString(),
      // Business profile fields (from settings)
      bizName: profile.bizName || '',
      bizEmail: profile.bizEmail || '',
      bizPhone: profile.bizPhone || '',
      bizAddress: profile.bizAddress || '',
      bizWebsite: profile.bizWebsite || '',
      bizLicense: profile.bizLicense || '',
      ownerName: profile.ownerName || '',
    };

    const descTemplate = stored.descriptionTemplate || getDefaultDescriptionTemplate();
    const footerTemplate = stored.footerTemplate || getDefaultFooterTemplate();

    const descText = renderTemplate(descTemplate, data);
    const footerText = renderTemplate(footerTemplate, data);

    const descOutput = document.getElementById('bb-desc-output');
    const footerOutput = document.getElementById('bb-footer-output');

    if (descOutput) {
      descOutput.setAttribute('data-raw', descText);
      descOutput.textContent = descText;
    }
    if (footerOutput) {
      footerOutput.setAttribute('data-raw', footerText);
      footerOutput.textContent = footerText;
    }
  }

  function escapeAttr(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---- Message Handling (from popup) ----

  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getPageInfo') {
        sendResponse({
          jobInfo: currentJobInfo || extractJobInfo(),
          customerInfo: currentCustomerInfo || extractCustomerInfo(),
          isRelevantPage: isRelevantPage(),
          url: window.location.href,
        });
        return false;
      }

      if (message.action === 'togglePanel') {
        togglePanel();
        sendResponse({ success: true });
        return false;
      }
    });
  }

  // ---- URL Change Detection (SPA) ----

  function setupUrlWatcher() {
    let lastUrl = window.location.href;

    const check = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        currentJobInfo = null;
        currentCustomerInfo = null;
        cachedProfile = null;
        const oldPanel = document.getElementById(PANEL_ID);
        if (oldPanel) oldPanel.remove();
        const oldBtn = document.getElementById(BUTTON_ID);
        if (oldBtn) oldBtn.remove();
        handlePageChange();
      }
    };

    const origPush = history.pushState;
    history.pushState = function (...args) {
      origPush.apply(this, args);
      check();
    };

    const origReplace = history.replaceState;
    history.replaceState = function (...args) {
      origReplace.apply(this, args);
      check();
    };

    window.addEventListener('popstate', check);
  }

  function handlePageChange() {
    if (!isExcludedPage() && isRelevantPage()) {
      createFloatingButton();
    }
  }

  // ---- Init ----

  function init() {
    log('Initializing on', window.location.href);
    handlePageChange();
    setupUrlWatcher();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_ID) && !isExcludedPage() && isRelevantPage()) {
        createFloatingButton();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
