// =============================================================================
// BetterBoss JobTread Auto-Populate — Content Script
// Detects document editing pages on app.jobtread.com and auto-populates
// job/customer information into description and footer fields.
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
   * Determines if we're on a document editing page by looking at the URL
   * and page content. JobTread document URLs typically contain patterns like:
   * /jobs/{id}/proposals, /jobs/{id}/invoices, /documents/, etc.
   */
  function isDocumentPage() {
    const url = window.location.href;
    const docPatterns = [
      /\/proposals\//i,
      /\/estimates\//i,
      /\/invoices\//i,
      /\/purchase-orders\//i,
      /\/change-orders\//i,
      /\/work-orders\//i,
      /\/bills\//i,
      /\/documents\//i,
      /\/selections\//i,
    ];
    return docPatterns.some((p) => p.test(url));
  }

  function isJobPage() {
    return /\/jobs\/[^/]+/i.test(window.location.href);
  }

  // ---- Job & Customer Info Extraction ----

  /**
   * Scrapes visible job and customer information from the current page DOM.
   * JobTread typically displays job name, number, customer name, address, etc.
   * in the page header or sidebar when viewing a job or document.
   */
  function extractJobInfo() {
    const info = {
      jobName: '',
      jobNumber: '',
      jobStatus: '',
      jobDescription: '',
      jobAddress: '',
    };

    // Try to extract from page title or header elements
    // JobTread commonly puts job info in header/breadcrumb areas
    const titleCandidates = [
      'h1', 'h2',
      '[data-testid="job-name"]',
      '[class*="job-name"]',
      '[class*="jobName"]',
      '[class*="JobName"]',
      '[class*="header-title"]',
      '[class*="page-title"]',
      '.job-header',
      '.job-title',
    ];

    for (const selector of titleCandidates) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        info.jobName = el.textContent.trim();
        break;
      }
    }

    // Try to find job number (often displayed as #XXXX or Job #XXXX)
    const allText = document.body.innerText;
    const jobNumMatch = allText.match(/(?:Job\s*#?\s*|#)(\d{3,})/i);
    if (jobNumMatch) {
      info.jobNumber = jobNumMatch[1];
    }

    // Try to extract address from visible elements
    const addressCandidates = [
      '[data-testid="job-address"]',
      '[class*="address"]',
      '[class*="Address"]',
      '[class*="location"]',
    ];

    for (const selector of addressCandidates) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim().length > 5) {
        info.jobAddress = el.textContent.trim();
        break;
      }
    }

    // Extract from URL if possible (job ID)
    const jobIdMatch = window.location.href.match(/\/jobs\/([^/]+)/);
    if (jobIdMatch) {
      info.jobId = jobIdMatch[1];
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

    // Look for customer name in common locations
    const customerCandidates = [
      '[data-testid="customer-name"]',
      '[class*="customer-name"]',
      '[class*="customerName"]',
      '[class*="client-name"]',
      '[class*="contact-name"]',
    ];

    for (const selector of customerCandidates) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        info.customerName = el.textContent.trim();
        break;
      }
    }

    // Try matching customer patterns in visible text
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

  // ---- Editable Field Detection ----

  /**
   * Finds description and footer editable fields on the document page.
   * JobTread uses rich text editors (contenteditable divs) and textareas
   * for document description and footer areas.
   */
  function findEditableFields() {
    const fields = {
      description: null,
      footer: null,
      allEditable: [],
    };

    // Look for contenteditable elements (rich text editors)
    const editables = document.querySelectorAll(
      '[contenteditable="true"], textarea, [role="textbox"]'
    );

    // Also look for common editor frameworks
    const editorSelectors = [
      '.ql-editor',                   // Quill
      '.ProseMirror',                 // ProseMirror / TipTap
      '.tox-edit-area__iframe',       // TinyMCE
      '.ce-block__content',           // Editor.js
      '[class*="editor"]',            // Generic
      '[class*="Editor"]',
      '[data-placeholder]',           // Placeholder-based editors
      '.DraftEditor-root',            // Draft.js
      '[class*="rich-text"]',         // Generic rich text
      '[class*="description"]',       // Description-specific
      '[class*="footer"]',            // Footer-specific
    ];

    for (const selector of editorSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (!fields.allEditable.includes(el)) {
          fields.allEditable.push(el);
        }
      });
    }

    editables.forEach((el) => {
      if (!fields.allEditable.includes(el)) {
        fields.allEditable.push(el);
      }
    });

    // Try to identify which field is description vs footer based on:
    // 1. Labels/headings near the field
    // 2. Position on page (description usually above, footer below)
    // 3. Attributes or class names
    fields.allEditable.forEach((el) => {
      const context = getFieldContext(el);
      if (context === 'description' && !fields.description) {
        fields.description = el;
      } else if (context === 'footer' && !fields.footer) {
        fields.footer = el;
      }
    });

    // Fallback: if we found editables but couldn't classify them,
    // use position — first is description, last (if different) is footer
    if (!fields.description && fields.allEditable.length > 0) {
      fields.description = fields.allEditable[0];
    }
    if (!fields.footer && fields.allEditable.length > 1) {
      fields.footer = fields.allEditable[fields.allEditable.length - 1];
    }

    return fields;
  }

  /**
   * Determines field context by looking at nearby labels, headings,
   * and element attributes.
   */
  function getFieldContext(el) {
    // Check element itself
    const elText = (
      el.className +
      ' ' +
      (el.getAttribute('data-placeholder') || '') +
      ' ' +
      (el.getAttribute('aria-label') || '') +
      ' ' +
      (el.getAttribute('name') || '') +
      ' ' +
      (el.id || '')
    ).toLowerCase();

    if (/description|scope|intro|body|content|message/.test(elText)) {
      return 'description';
    }
    if (/footer|terms|condition|closing|signature/.test(elText)) {
      return 'footer';
    }

    // Check nearby labels (previous siblings, parent labels)
    let node = el.previousElementSibling;
    for (let i = 0; i < 3 && node; i++) {
      const text = node.textContent.toLowerCase();
      if (/description|scope|intro/.test(text)) return 'description';
      if (/footer|terms|condition/.test(text)) return 'footer';
      node = node.previousElementSibling;
    }

    // Check parent's preceding heading
    const parent = el.closest('section, div, fieldset, form');
    if (parent) {
      const heading = parent.querySelector('h1, h2, h3, h4, h5, h6, label, legend');
      if (heading) {
        const hText = heading.textContent.toLowerCase();
        if (/description|scope|intro/.test(hText)) return 'description';
        if (/footer|terms|condition/.test(hText)) return 'footer';
      }
    }

    return null;
  }

  // ---- Template System ----

  function getDefaultDescriptionTemplate() {
    return [
      'Project: {{jobName}}',
      '{{#jobNumber}}Job #: {{jobNumber}}{{/jobNumber}}',
      '',
      '{{#customerName}}Customer: {{customerName}}{{/customerName}}',
      '{{#company}}Company: {{company}}{{/company}}',
      '{{#customerEmail}}Email: {{customerEmail}}{{/customerEmail}}',
      '{{#customerPhone}}Phone: {{customerPhone}}{{/customerPhone}}',
      '',
      '{{#jobAddress}}Project Address: {{jobAddress}}{{/jobAddress}}',
      '',
      '{{#jobDescription}}Scope of Work:',
      '{{jobDescription}}{{/jobDescription}}',
    ].join('\n');
  }

  function getDefaultFooterTemplate() {
    return [
      '{{#customerName}}Prepared for: {{customerName}}{{/customerName}}',
      '{{#company}} | {{company}}{{/company}}',
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
          // Render inner content with variable substitution
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

  // ---- Field Population ----

  /**
   * Sets content in an editable field, handling both contenteditable divs
   * and textarea/input elements. Dispatches input events to trigger
   * any framework change detection.
   */
  function setFieldContent(field, content) {
    if (!field) return;

    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      field.value = content;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (
      field.getAttribute('contenteditable') === 'true' ||
      field.classList.contains('ql-editor') ||
      field.classList.contains('ProseMirror') ||
      field.getAttribute('role') === 'textbox'
    ) {
      // For rich text editors, use innerHTML to preserve formatting ability
      const htmlContent = content
        .split('\n')
        .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
        .join('');

      field.focus();
      field.innerHTML = htmlContent;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));

      // For ProseMirror-based editors, dispatch a more specific event
      field.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: content,
          bubbles: true,
          cancelable: true,
        })
      );
    } else {
      // Fallback: try setting textContent
      field.textContent = content;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Auto-Populate Logic ----

  async function autoPopulate(mode = 'both') {
    log('Starting auto-populate, mode:', mode);

    const jobInfo = extractJobInfo();
    const customerInfo = extractCustomerInfo();

    // Merge with any stored overrides from the popup
    const stored = await getStoredSettings();

    // Override extracted info with any manual entries from settings
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
        setFieldContent(fields.description, descContent);
        log('Description populated');
      } else {
        log('No description field found');
      }
    }

    if (mode === 'both' || mode === 'footer') {
      if (fields.footer) {
        const footerContent = renderTemplate(footerTemplate, data);
        setFieldContent(fields.footer, footerContent);
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
            <h4>Detected Job Info</h4>
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
            <h4>Detected Customer Info</h4>
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
                Fill Description Only
              </button>
              <button class="bb-btn bb-btn--secondary" id="bb-fill-footer">
                Fill Footer Only
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

    // Wire up events
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
    // Read values from panel inputs
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
      let messages = [];

      if (mode === 'both' || mode === 'description') {
        if (fields.description) {
          setFieldContent(fields.description, renderTemplate(descTemplate, data));
          messages.push('Description populated');
        } else {
          messages.push('No description field found on page');
        }
      }

      if (mode === 'both' || mode === 'footer') {
        if (fields.footer) {
          setFieldContent(fields.footer, renderTemplate(footerTemplate, data));
          messages.push('Footer populated');
        } else {
          messages.push('No footer field found on page');
        }
      }

      isPopulated = true;
      updateButtonState();

      if (statusEl) {
        const hasError = messages.some((m) => m.includes('not found'));
        statusEl.className = hasError ? 'bb-status bb-status--warning' : 'bb-status bb-status--success';
        statusEl.textContent = messages.join(' | ');
      }
    });
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- Auto-Detection & Polling ----

  /**
   * Polls for editable fields appearing on the page (SPAs may load them late).
   * Once fields are found, optionally auto-populates if enabled.
   */
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

      if (!isDocumentPage() && !isJobPage()) return;

      const fields = findEditableFields();
      if (fields.allEditable.length > 0 && !isPopulated) {
        const stored = await getStoredSettings();
        if (stored.autoPopulateEnabled !== false) {
          log('Editable fields found, auto-populating...');
          autoPopulate('both');
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    }, POLL_INTERVAL_MS);
  }

  // ---- MutationObserver ----

  const handleMutation = debounce(() => {
    // Re-check if we navigated to a new document page (SPA navigation)
    if (isDocumentPage() || isJobPage()) {
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
        isPopulated = false; // Reset for new page
        log('URL changed to:', lastUrl);
        handleMutation();
      }
    };

    // Watch for pushState/replaceState
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
        return true; // async response
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

    if (isDocumentPage() || isJobPage()) {
      createFloatingButton();
      startPolling();
    }

    setupObserver();
    setupUrlWatcher();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
