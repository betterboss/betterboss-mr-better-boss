// =============================================================================
// BetterBoss JobTread Auto-Populate — Content Script
// Detects document editing pages on app.jobtread.com and auto-populates
// job/customer information into description and footer textarea fields.
//
// JobTread uses plain <textarea> elements (NOT rich text editors).
// It is a React app, so we must use the native value setter to bypass
// React's synthetic event system.
//
// JobTread formatting syntax (plaintext markdown):
//   *bold*  ^italic^  _underline_  ~strikethrough~
//   # H1  ## H2  ### H3
//   - bullet  1. numbered
//   > quote   --- horizontal rule
//   [text](url) links
// =============================================================================

(function () {
  'use strict';

  // ---- Constants ----
  const DEBOUNCE_MS = 300;
  const POLL_INTERVAL_MS = 1500;
  const MAX_POLL_ATTEMPTS = 40;
  const BUTTON_ID = 'bb-autofill-btn';
  const PANEL_ID = 'bb-autofill-panel';

  // ---- State ----
  let currentJobInfo = null;
  let currentCustomerInfo = null;
  let isPopulated = false;
  let pollTimer = null;

  // ---- React-Safe Native Value Setter ----
  // JobTread is a React app. Directly setting .value on a textarea won't
  // trigger React's state updates. We must use the native HTMLTextAreaElement
  // prototype setter, then immediately dispatch input + change events.
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  ).set;

  // ---- Utility ----

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function log(...args) {
    console.log('[BetterBoss Auto-Populate]', ...args);
  }

  // ---- Page Context Detection ----

  /**
   * Determines if we're on a document editing page.
   * Matches JobTread's actual URL patterns for document types.
   */
  function isDocumentPage() {
    const path = window.location.pathname;
    return (
      path.includes('/documents/') ||
      path.includes('/invoices/') ||
      path.includes('/estimates/') ||
      path.includes('/proposals/') ||
      path.includes('/contracts/') ||
      path.includes('/purchase-orders/') ||
      path.includes('/change-orders/') ||
      path.includes('/work-orders/') ||
      path.includes('/bills/')
    );
  }

  function isJobPage() {
    return /\/jobs\/[^/]+/i.test(window.location.pathname);
  }

  function isBudgetPage() {
    return window.location.pathname.endsWith('/budget');
  }

  /**
   * Pages where we should NOT activate (per JT Power Tools patterns).
   */
  function isExcludedPage() {
    const path = window.location.pathname;
    return (
      path.includes('/files') ||
      path.includes('/vendors') ||
      path.includes('/customers') ||
      path.includes('/settings') ||
      path.includes('/plans') ||
      path.includes('/catalog')
    );
  }

  // ---- Job & Customer Info Extraction ----

  /**
   * Scrapes visible job and customer information from the current page DOM.
   * JobTread uses Tailwind classes like .font-bold, .text-cyan-500, .uppercase
   * for headings and labels. We look for structured text patterns.
   */
  function extractJobInfo() {
    const info = {
      jobName: '',
      jobNumber: '',
      jobStatus: '',
      jobDescription: '',
      jobAddress: '',
      jobId: '',
    };

    // Try heading elements first (JobTread puts job name in prominent headings)
    const headings = document.querySelectorAll('h1, h2, [class*="font-bold"]');
    for (const h of headings) {
      const text = h.textContent.trim();
      // Skip tiny or generic labels
      if (text.length > 2 && text.length < 200 && !text.match(/^(dashboard|settings|jobs|home)/i)) {
        // Check if this looks like a job name (not a section heading)
        const parent = h.closest('[class*="header"], [class*="breadcrumb"], nav');
        if (parent || h.tagName === 'H1') {
          info.jobName = text;
          break;
        }
      }
    }

    // Fallback: try the page title
    if (!info.jobName) {
      const titleMatch = document.title.match(/^(.+?)(?:\s*[-|]\s*JobTread)?$/i);
      if (titleMatch) {
        info.jobName = titleMatch[1].trim();
      }
    }

    // Try to find job number (often displayed as #XXXX or Job #XXXX)
    const allText = document.body.innerText;
    const jobNumMatch = allText.match(/(?:Job\s*#?\s*|#)(\d{3,})/i);
    if (jobNumMatch) {
      info.jobNumber = jobNumMatch[1];
    }

    // Extract job ID from URL
    const jobIdMatch = window.location.pathname.match(/\/jobs\/([^/]+)/);
    if (jobIdMatch) {
      info.jobId = jobIdMatch[1];
    }

    // Try to extract address — look for elements near labels that say "Address" or "Location"
    const labels = document.querySelectorAll('.font-bold, label, [class*="uppercase"]');
    for (const label of labels) {
      const labelText = label.textContent.trim().toLowerCase();
      if (labelText.includes('address') || labelText.includes('location')) {
        // Get next sibling or adjacent text
        const next = label.nextElementSibling || label.parentElement;
        if (next) {
          const addr = next.textContent.trim();
          if (addr.length > 5 && addr !== labelText) {
            info.jobAddress = addr.replace(labelText, '').trim();
            break;
          }
        }
      }
    }

    return info;
  }

  function extractCustomerInfo() {
    const info = {
      customerName: '',
      company: '',
      email: '',
      phone: '',
      address: '',
    };

    // Look for customer-related labels and their values
    const labels = document.querySelectorAll('.font-bold, label, [class*="uppercase"]');
    for (const label of labels) {
      const labelText = label.textContent.trim().toLowerCase();
      if (
        labelText.includes('customer') ||
        labelText.includes('client') ||
        labelText.includes('contact')
      ) {
        const next = label.nextElementSibling || label.parentElement;
        if (next) {
          const val = next.textContent.trim();
          if (val.length > 1 && val !== labelText) {
            info.customerName = val.replace(/customer|client|contact/gi, '').trim();
            break;
          }
        }
      }
    }

    // Try matching email and phone in visible text
    const allText = document.body.innerText;

    const emailMatch = allText.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) {
      info.email = emailMatch[0];
    }

    const phoneMatch = allText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      info.phone = phoneMatch[0];
    }

    return info;
  }

  // ---- Textarea Field Detection ----

  /**
   * Finds description and footer textarea fields on the document page.
   * JobTread uses plain <textarea> elements. On document pages, the
   * description and footer are within containers with the native formatter
   * toolbar (.sticky.shadow-line-bottom).
   *
   * DOM structure for document textareas:
   *   <div class="rounded-sm border">
   *     <div class="sticky shadow-line-bottom z-[1] p-1 flex gap-1 bg-white">
   *       <!-- native toolbar buttons -->
   *     </div>
   *     <div class="relative">
   *       <textarea ...>
   *     </div>
   *   </div>
   */
  function findEditableFields() {
    const fields = {
      description: null,
      footer: null,
      allEditable: [],
    };

    // Strategy 1: Find textareas inside containers with the native formatter toolbar
    const formattedContainers = document.querySelectorAll('.rounded-sm.border');
    for (const container of formattedContainers) {
      const toolbar = container.querySelector(':scope > .sticky.shadow-line-bottom');
      if (toolbar) {
        const buttons = toolbar.querySelectorAll('div[role="button"]');
        if (buttons.length >= 3) {
          // This container has the native formatter — find its textarea
          const textarea = container.querySelector('textarea');
          if (textarea && !textarea.hasAttribute('data-jt-no-formatter')) {
            fields.allEditable.push(textarea);
          }
        }
      }
    }

    // Strategy 2: Find textareas by placeholder
    const descTextarea = document.querySelector('textarea[placeholder="Description"]');
    if (descTextarea && !fields.allEditable.includes(descTextarea)) {
      fields.allEditable.push(descTextarea);
    }

    // Strategy 3: Find textareas with caret-black class (common JT form textareas)
    const caretBlackTextareas = document.querySelectorAll('textarea.caret-black');
    for (const ta of caretBlackTextareas) {
      if (!fields.allEditable.includes(ta) && !isExcludedTextarea(ta)) {
        fields.allEditable.push(ta);
      }
    }

    // Strategy 4: Find textareas with transparent text + formatting overlay
    const allTextareas = document.querySelectorAll('textarea');
    for (const ta of allTextareas) {
      if (
        !fields.allEditable.includes(ta) &&
        !isExcludedTextarea(ta) &&
        ta.style.color === 'transparent'
      ) {
        fields.allEditable.push(ta);
      }
    }

    // Classify fields as description vs footer
    for (const ta of fields.allEditable) {
      const context = getFieldContext(ta);
      if (context === 'description' && !fields.description) {
        fields.description = ta;
      } else if (context === 'footer' && !fields.footer) {
        fields.footer = ta;
      }
    }

    // Fallback: first editable = description, last = footer
    if (!fields.description && fields.allEditable.length > 0) {
      fields.description = fields.allEditable[0];
    }
    if (!fields.footer && fields.allEditable.length > 1) {
      fields.footer = fields.allEditable[fields.allEditable.length - 1];
    }

    return fields;
  }

  /**
   * Check if a textarea should be excluded from auto-populate.
   */
  function isExcludedTextarea(ta) {
    const placeholder = (ta.getAttribute('placeholder') || '').toLowerCase();

    // Exclude known non-document fields
    if (
      placeholder === 'set notes' ||
      placeholder === 'name' ||
      placeholder === 'add an item...' ||
      placeholder === 'add an item'
    ) {
      return true;
    }

    if (ta.hasAttribute('data-jt-no-formatter')) {
      return true;
    }

    // Exclude subtask fields (small padding)
    if (ta.classList.contains('p-1') && !ta.classList.contains('p-2') && ta.style.color === 'transparent') {
      return true;
    }

    // Exclude fields inside Job Parameters popup
    const paramPopup = ta.closest('.shadow-lg.rounded-sm.bg-white');
    if (paramPopup) {
      const paramHeader = paramPopup.querySelector('.font-bold.text-cyan-500.uppercase');
      if (paramHeader && paramHeader.textContent.toLowerCase().includes('job parameters')) {
        return true;
      }
    }

    // Exclude checklist items
    const ancestor = ta.closest('div');
    if (ancestor) {
      const checklistLabel = ancestor.querySelector('.font-bold');
      if (checklistLabel && checklistLabel.textContent.trim().toLowerCase() === 'checklist') {
        return true;
      }
    }

    return false;
  }

  /**
   * Determines field context by looking at nearby labels, headings,
   * and element attributes. Uses JobTread's actual class patterns
   * (.font-bold, .uppercase, .text-jtOrange).
   */
  function getFieldContext(ta) {
    // Check placeholder
    const placeholder = (ta.getAttribute('placeholder') || '').toLowerCase();
    if (/description|scope|intro|body|content/.test(placeholder)) return 'description';
    if (/footer|terms|condition|closing/.test(placeholder)) return 'footer';

    // Check aria-label
    const ariaLabel = (ta.getAttribute('aria-label') || '').toLowerCase();
    if (/description|scope/.test(ariaLabel)) return 'description';
    if (/footer|terms/.test(ariaLabel)) return 'footer';

    // Walk up to find a label (JobTread uses .font-bold.uppercase headers)
    let container = ta.closest('.rounded-sm.border') || ta.parentElement;
    if (container) {
      // Check preceding sibling labels
      let prev = container.previousElementSibling;
      for (let i = 0; i < 5 && prev; i++) {
        const text = prev.textContent.trim().toLowerCase();
        if (/description|scope|intro|header/i.test(text)) return 'description';
        if (/footer|terms|condition/i.test(text)) return 'footer';
        prev = prev.previousElementSibling;
      }

      // Check labels within the parent section
      const parentSection = ta.closest('section, [class*="divide-y"], form');
      if (parentSection) {
        const allLabels = parentSection.querySelectorAll(
          '.font-bold, .uppercase, label, h3, h4, h5'
        );
        for (const lbl of allLabels) {
          const lblText = lbl.textContent.trim().toLowerCase();
          // Only use labels that appear BEFORE the textarea in DOM order
          if (ta.compareDocumentPosition(lbl) & Node.DOCUMENT_POSITION_PRECEDING) {
            if (/description|scope|intro|header/i.test(lblText)) return 'description';
            if (/footer|terms|condition/i.test(lblText)) return 'footer';
          }
        }
      }
    }

    return null;
  }

  // ---- React-Safe Field Setting ----

  /**
   * Sets textarea value using the native HTMLTextAreaElement.prototype.value
   * setter, then dispatches input + change events immediately so React
   * picks up the change. React will CLEAR the value if events are delayed.
   */
  function setTextareaValue(textarea, value) {
    if (!textarea) return;

    textarea.focus();

    // Use native setter to bypass React's controlled component
    nativeTextareaSetter.call(textarea, value);

    // Set cursor at end
    textarea.setSelectionRange(value.length, value.length);

    // Dispatch input event IMMEDIATELY (React clears value if we delay)
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: false,
      composed: true,
      data: null,
      dataTransfer: null,
      inputType: 'insertText',
      isComposing: false,
    });
    textarea.dispatchEvent(inputEvent);

    // Dispatch change event immediately too
    const changeEvent = new Event('change', {
      bubbles: true,
      cancelable: false,
    });
    textarea.dispatchEvent(changeEvent);
  }

  // ---- Template System ----

  /**
   * Default description template using JobTread's plaintext markdown formatting.
   * *bold*  ^italic^  ## headings  - bullets
   */
  function getDefaultDescriptionTemplate() {
    return [
      '*JobTread Implementation Agreement — *^{{company}}^**',
      '*Client:* *^{{company}}^* ("Client") • *Contact:* *^{{customerName}}^*',
      '*Provider:* Better Boss ("Provider")',
      '*Project:* Full JobTread build-out operating system for remodeling and construction',
      '*Term:* 30 business day implementation from kickoff',
      '*Total Contract Value:* *$10,000 USD*',
      '*Financing:* See Section 6',
      '##1) Objective',
      'Deploy a single, structured JobTread OS that speeds proposals, reduces chaos, and gives clear visibility across jobs and finances.',
      '##2) Scope of Work',
      '####2.1 Meetings & Communication',
      '- 2-hour kickoff meeting',
      '- 1 midway checkpoint meeting',
      '- 1 final meeting',
      '- Chat/message communication in JobTread with 24-hour email support',
      '####2.2 Implementation Schedule',
      'Custom implementation schedule built inside JobTread to track progress and milestones.',
      '####2.3 Cost Catalog Build',
      'Complete cost catalog build including suppliers, labor, materials, cost groups, product and material catalog (Lowe\'s + local vendors) uploaded, standardized, and linked to cost codes.',
      '####2.4 Job Costing Framework',
      'Job costing review including units, cost codes, and cost types configured for accurate project tracking.',
      '####2.5 Custom Views',
      'Custom views across all modules including jobs, customers, catalog, and more for streamlined navigation.',
      '####2.6 Estimating Engine',
      '- Parameters and formulas for quantity formulas in estimate templates',
      '- Measurement integration (RENDR, Hover, or EagleView) OR setup for manual parameter input',
      '- 3-5 estimate templates with cost groups, formulas, and parameter fields for fast, accurate range-based pricing',
      '####2.7 Document Templates',
      'Document template build-out including details, design, and custom cover PDFs. Proposals, Closeout Packets, Certificates of Completion, Contracts, and Change Orders configured and branded.',
      '####2.8 Dashboards',
      '1-2 custom dashboards with live metrics by role—estimating accuracy, job costs, and pipeline status.',
      '####2.9 Automation Suite',
      'Up to 5 custom notifications OR 2-4 workflows as needed for client and trade partner communication including reminders, scheduling, and follow-ups.',
      '####2.10 SOP Guides',
      '5-10 SOP guides with refined standard operating procedures embedded directly in JobTread, built for repeatability and automation.',
      '####2.11 Integration Review',
      'Integration review (QuickBooks Online, etc.) to ensure connection is solid. Note: Provider is not an accountant but will verify integration functionality.',
      '####2.12 Training & Handoff',
      'Role-based videos, SOP reference map, and admin maintenance guide for full control post-launch.',
      '##3) Scope Exclusions (Priced Separately)',
      '- Custom API development',
      '- Data migrations (e.g., CoConstruct migration = +$1,000 USD)',
      '- GHL CRM integration',
      '- Build out of integrated tools',
      '- In-house takeoff tooling',
      '##4) Process Assumptions',
      '- Estimating: fixed cost and range-based models',
      '- Standard JobTread features only; no external code or plug-ins',
      '- Can help implement tools like RENDR or prebuilt integrations with JobTread',
      '##5) Timeline (30 Business Days)',
      '- Week 1: Kickoff, access setup, system mapping',
      '- Week 2: Build templates, workflows, and automations; midpoint review',
      '- Week 3: Finalize documents, dashboards, and schedules',
      '- Week 4: QA, training videos, admin guide, go-live',
      '##6) Pricing & Financing',
      '*Fixed Fee*: $10,000 USD',
      '*Financing options:*',
      '6 mo: $1,666.67/mo — no interest',
      '12 mo: $879.13/mo — ~$549.56 interest',
      '36 mo: $322.63/mo — ~$1,614.90 interest',
      '^Final terms subject to credit and approvals.^',
      '##7) Payment Terms',
      '- *100% due at kickoff* to schedule and start work',
      '- If financed, the financing schedule replaces upfront payment',
      '##8) Client Responsibilities',
      '- Add Provider as a JobTread user and grant full access within 2 business days',
      '- Provide reference materials (specs, selections, budgets, contract templates)',
      '- Designate a decision-maker for reviews/approvals within 2 business days',
      '- Attend kickoff and midpoint review',
      '##9) Change Orders',
      'Any change that adds scope, exceeds revision limits, or extends the timeline will require a change order and separate pricing.',
      '##10) Support & Additional Work',
      '- Post-go-live support available at an additional fee',
      '- New projects outside this scope require a separate SOW',
      '##11) Intellectual Property',
      '- Client owns deliverables upon full payment',
      '- Provider retains reusable frameworks',
      '- No disclosure of Client data without consent',
      '##12) Data Protection',
      'Client is responsible for independent backups. Provider is not liable for data loss from Client actions or third-party outages.',
      '##13) Limitation of Liability',
      'Liability capped at total fees paid in prior 6 months. No consequential or special damages.',
      '##14) Force Majeure',
      'No liability for delays caused by events outside reasonable control.',
      '##15) Confidentiality',
      'Non-public information remains confidential and must be handled with reasonable care.',
      '##16) Indemnification',
      'Client indemnifies Provider against third-party claims from misuse or breach.',
      '##17) Dispute Resolution & Governing Law',
      '30-day informal negotiation, then binding arbitration in Denver, CO under AAA rules. Colorado law governs.',
      '##18) Entire Agreement & Amendments',
      'This document is the full agreement; changes require written approval.',
      '##19) Counterparts & E-Signature',
      'This agreement may be signed electronically and in counterparts.',
      '##20) Acceptance & Signature',
      'This Agreement is binding upon Client\'s signature below. *Better Boss\' acceptance is deemed upon (a) commencement of services or (b) receipt of the first payment.* No additional Provider signature required.',
    ].join('\n');
  }

  function getDefaultFooterTemplate() {
    return [
      '{{#customerName}}*Prepared for:* {{customerName}}{{/customerName}}',
      '{{#company}} | *{{company}}*{{/company}}',
      '{{#jobName}} | Project: {{jobName}}{{/jobName}}',
      '{{#jobNumber}} | Job #{{jobNumber}}{{/jobNumber}}',
    ].join('');
  }

  /**
   * Simple mustache-like template renderer.
   * Supports {{variable}} and {{#variable}}...{{/variable}} conditional blocks.
   */
  function renderTemplate(template, data) {
    let result = template;

    // Handle conditional blocks: {{#key}}content{{/key}}
    result = result.replace(
      /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (match, key, content) => {
        if (data[key] && data[key].toString().trim()) {
          return content.replace(/\{\{(\w+)\}\}/g, (m, k) => data[k] || '');
        }
        return '';
      }
    );

    // Handle remaining simple variables
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');

    // Clean up blank lines from missing conditional blocks
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    return result;
  }

  function buildTemplateData(jobInfo, customerInfo) {
    return {
      jobName: jobInfo.jobName || '',
      jobNumber: jobInfo.jobNumber || '',
      jobStatus: jobInfo.jobStatus || '',
      jobDescription: jobInfo.jobDescription || '',
      jobAddress: jobInfo.jobAddress || '',
      customerName: customerInfo.customerName || '',
      company: customerInfo.company || '',
      customerEmail: customerInfo.email || '',
      customerPhone: customerInfo.phone || '',
      customerAddress: customerInfo.address || '',
      date: new Date().toLocaleDateString(),
    };
  }

  // ---- Auto-Populate Logic ----

  async function autoPopulate(mode = 'both') {
    log('Starting auto-populate, mode:', mode);

    const jobInfo = extractJobInfo();
    const customerInfo = extractCustomerInfo();

    // Merge with any stored overrides from the popup
    const stored = await getStoredSettings();

    if (stored.jobName) jobInfo.jobName = stored.jobName;
    if (stored.jobNumber) jobInfo.jobNumber = stored.jobNumber;
    if (stored.customerName) customerInfo.customerName = stored.customerName;
    if (stored.company) customerInfo.company = stored.company;
    if (stored.email) customerInfo.email = stored.email;
    if (stored.phone) customerInfo.phone = stored.phone;

    currentJobInfo = jobInfo;
    currentCustomerInfo = customerInfo;

    const data = buildTemplateData(jobInfo, customerInfo);

    const descTemplate = stored.descriptionTemplate || getDefaultDescriptionTemplate();
    const footerTemplate = stored.footerTemplate || getDefaultFooterTemplate();

    const fields = findEditableFields();

    if (mode === 'both' || mode === 'description') {
      if (fields.description) {
        const descContent = renderTemplate(descTemplate, data);
        setTextareaValue(fields.description, descContent);
        log('Description populated');
      } else {
        log('No description field found');
      }
    }

    if (mode === 'both' || mode === 'footer') {
      if (fields.footer) {
        const footerContent = renderTemplate(footerTemplate, data);
        setTextareaValue(fields.footer, footerContent);
        log('Footer populated');
      } else {
        log('No footer field found');
      }
    }

    isPopulated = true;
    updateButtonState();

    return { jobInfo, customerInfo, fields };
  }

  // ---- Chrome Storage Helpers ----

  function getStoredSettings() {
    return new Promise((resolve) => {
      if (chrome && chrome.storage) {
        chrome.storage.sync.get(
          [
            'autoPopulateEnabled',
            'descriptionTemplate',
            'footerTemplate',
            'jobName',
            'jobNumber',
            'customerName',
            'company',
            'email',
            'phone',
          ],
          (result) => resolve(result || {})
        );
      } else {
        resolve({});
      }
    });
  }

  // ---- Floating Action Button ----

  function createFloatingButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement('div');
    btn.id = BUTTON_ID;
    btn.innerHTML = `
      <button class="bb-fab" title="BetterBoss Auto-Populate">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="currentColor" opacity="0.3"/>
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.5"/>
          <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="17" cy="17" r="4" fill="#0c8ce9" stroke="white" stroke-width="1"/>
          <path d="M15.5 17H18.5M17 15.5V18.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </button>
    `;
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  function updateButtonState() {
    const fab = document.querySelector('.bb-fab');
    if (fab) {
      if (isPopulated) {
        fab.classList.add('bb-fab--active');
      } else {
        fab.classList.remove('bb-fab--active');
      }
    }
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

  function createPanel() {
    const jobInfo = currentJobInfo || extractJobInfo();
    const customerInfo = currentCustomerInfo || extractCustomerInfo();
    const fields = findEditableFields();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="bb-panel">
        <div class="bb-panel__header">
          <h3>BetterBoss Auto-Populate</h3>
          <button class="bb-panel__close" id="bb-close-panel">&times;</button>
        </div>

        <div class="bb-panel__body">
          <div class="bb-panel__section">
            <h4>Page Status</h4>
            <div class="bb-status ${fields.allEditable.length > 0 ? 'bb-status--success' : 'bb-status--warning'}">
              ${fields.allEditable.length} textarea field(s) found
              ${fields.description ? ' | Description: Yes' : ' | Description: No'}
              ${fields.footer ? ' | Footer: Yes' : ' | Footer: No'}
            </div>
          </div>

          <div class="bb-panel__section">
            <h4>Job Info</h4>
            <div class="bb-field-group">
              <label>Job Name</label>
              <input type="text" id="bb-job-name" value="${escapeAttr(jobInfo.jobName)}" placeholder="Enter job name..."/>
            </div>
            <div class="bb-field-group">
              <label>Job Number</label>
              <input type="text" id="bb-job-number" value="${escapeAttr(jobInfo.jobNumber)}" placeholder="Enter job number..."/>
            </div>
            <div class="bb-field-group">
              <label>Job Address</label>
              <input type="text" id="bb-job-address" value="${escapeAttr(jobInfo.jobAddress)}" placeholder="Enter job address..."/>
            </div>
          </div>

          <div class="bb-panel__section">
            <h4>Customer Info</h4>
            <div class="bb-field-group">
              <label>Customer Name</label>
              <input type="text" id="bb-customer-name" value="${escapeAttr(customerInfo.customerName)}" placeholder="Enter customer name..."/>
            </div>
            <div class="bb-field-group">
              <label>Company</label>
              <input type="text" id="bb-company" value="${escapeAttr(customerInfo.company)}" placeholder="Enter company..."/>
            </div>
            <div class="bb-field-group">
              <label>Email</label>
              <input type="text" id="bb-email" value="${escapeAttr(customerInfo.email)}" placeholder="Enter email..."/>
            </div>
            <div class="bb-field-group">
              <label>Phone</label>
              <input type="text" id="bb-phone" value="${escapeAttr(customerInfo.phone)}" placeholder="Enter phone..."/>
            </div>
          </div>

          <div class="bb-panel__section">
            <h4>Populate Fields</h4>
            <div class="bb-btn-group">
              <button class="bb-btn bb-btn--primary" id="bb-fill-both">
                Fill Description & Footer
              </button>
              <button class="bb-btn bb-btn--secondary" id="bb-fill-desc">
                Description Only
              </button>
              <button class="bb-btn bb-btn--secondary" id="bb-fill-footer">
                Footer Only
              </button>
            </div>
          </div>

          <div class="bb-panel__section bb-panel__section--status">
            <div id="bb-status"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('bb-close-panel').addEventListener('click', () => {
      panel.remove();
    });

    document.getElementById('bb-fill-both').addEventListener('click', () => {
      fillFromPanel('both');
    });

    document.getElementById('bb-fill-desc').addEventListener('click', () => {
      fillFromPanel('description');
    });

    document.getElementById('bb-fill-footer').addEventListener('click', () => {
      fillFromPanel('footer');
    });
  }

  function fillFromPanel(mode) {
    const jobInfo = {
      jobName: document.getElementById('bb-job-name')?.value || '',
      jobNumber: document.getElementById('bb-job-number')?.value || '',
      jobAddress: document.getElementById('bb-job-address')?.value || '',
      jobDescription: '',
      jobStatus: '',
    };

    const customerInfo = {
      customerName: document.getElementById('bb-customer-name')?.value || '',
      company: document.getElementById('bb-company')?.value || '',
      email: document.getElementById('bb-email')?.value || '',
      phone: document.getElementById('bb-phone')?.value || '',
      address: '',
    };

    currentJobInfo = jobInfo;
    currentCustomerInfo = customerInfo;

    const data = buildTemplateData(jobInfo, customerInfo);
    const fields = findEditableFields();

    getStoredSettings().then((stored) => {
      const descTemplate = stored.descriptionTemplate || getDefaultDescriptionTemplate();
      const footerTemplate = stored.footerTemplate || getDefaultFooterTemplate();

      const statusEl = document.getElementById('bb-status');
      const messages = [];

      if (mode === 'both' || mode === 'description') {
        if (fields.description) {
          setTextareaValue(fields.description, renderTemplate(descTemplate, data));
          messages.push('Description populated');
        } else {
          messages.push('No description field found');
        }
      }

      if (mode === 'both' || mode === 'footer') {
        if (fields.footer) {
          setTextareaValue(fields.footer, renderTemplate(footerTemplate, data));
          messages.push('Footer populated');
        } else {
          messages.push('No footer field found');
        }
      }

      isPopulated = true;
      updateButtonState();

      if (statusEl) {
        const hasError = messages.some((m) => m.includes('not found'));
        statusEl.className = hasError
          ? 'bb-status bb-status--warning'
          : 'bb-status bb-status--success';
        statusEl.textContent = messages.join(' | ');
      }
    });
  }

  function escapeAttr(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---- Auto-Detection & Polling ----

  function startPolling() {
    let attempts = 0;

    if (pollTimer) clearInterval(pollTimer);

    pollTimer = setInterval(async () => {
      attempts++;

      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }

      if (isExcludedPage()) return;
      if (!isDocumentPage() && !isJobPage() && !isBudgetPage()) return;

      const fields = findEditableFields();
      if (fields.allEditable.length > 0 && !isPopulated) {
        const stored = await getStoredSettings();
        if (stored.autoPopulateEnabled !== false) {
          log('Textarea fields found, auto-populating...');
          autoPopulate('both');
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    }, POLL_INTERVAL_MS);
  }

  // ---- MutationObserver ----

  const handleMutation = debounce(() => {
    if (isExcludedPage()) return;

    if (isDocumentPage() || isJobPage() || isBudgetPage()) {
      createFloatingButton();
      if (!isPopulated) {
        startPolling();
      }
    }
  }, DEBOUNCE_MS);

  function setupObserver() {
    const observer = new MutationObserver(handleMutation);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ---- URL Change Detection (SPA) ----

  function setupUrlWatcher() {
    let lastUrl = window.location.href;

    const check = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        isPopulated = false;
        log('URL changed to:', lastUrl);
        handleMutation();
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

  // ---- Message Handling (from popup/background) ----

  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'populate') {
        autoPopulate(message.mode || 'both').then((result) => {
          sendResponse({ success: true, result });
        });
        return true;
      }

      if (message.action === 'getPageInfo') {
        const jobInfo = extractJobInfo();
        const customerInfo = extractCustomerInfo();
        const fields = findEditableFields();
        sendResponse({
          jobInfo,
          customerInfo,
          hasDescription: !!fields.description,
          hasFooter: !!fields.footer,
          editableFieldCount: fields.allEditable.length,
          isDocumentPage: isDocumentPage(),
          isJobPage: isJobPage(),
          url: window.location.href,
        });
        return false;
      }

      if (message.action === 'detectFields') {
        const fields = findEditableFields();
        sendResponse({
          description: !!fields.description,
          footer: !!fields.footer,
          count: fields.allEditable.length,
        });
        return false;
      }
    });
  }

  // ---- Initialization ----

  function init() {
    log('Initializing on', window.location.href);

    if (isExcludedPage()) {
      log('Excluded page, skipping.');
      return;
    }

    if (isDocumentPage() || isJobPage() || isBudgetPage()) {
      createFloatingButton();
      startPolling();
    }

    setupObserver();
    setupUrlWatcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
