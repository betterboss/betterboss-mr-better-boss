// =============================================================================
// BetterBoss Auto-Populate — Options Page Script
// Manages template customization and extension settings
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const autoToggle = document.getElementById('auto-toggle');
  const descTemplate = document.getElementById('desc-template');
  const footerTemplate = document.getElementById('footer-template');
  const saveBtn = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');
  const resetDescBtn = document.getElementById('reset-desc');
  const resetFooterBtn = document.getElementById('reset-footer');

  // ---- Default Templates ----

  // Default uses JobTread's plaintext markdown: *bold* ^italic^ ## headings - bullets
  const DEFAULT_DESC_TEMPLATE = [
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
    '// ... (full agreement template — customize in options)',
    '##20) Acceptance & Signature',
    'This Agreement is binding upon Client\'s signature below. *Better Boss\' acceptance is deemed upon (a) commencement of services or (b) receipt of the first payment.* No additional Provider signature required.',
  ].join('\n');

  const DEFAULT_FOOTER_TEMPLATE = [
    '{{#customerName}}*Prepared for:* {{customerName}}{{/customerName}}',
    '{{#company}} | *{{company}}*{{/company}}',
    '{{#jobName}} | Project: {{jobName}}{{/jobName}}',
    '{{#jobNumber}} | Job #{{jobNumber}}{{/jobNumber}}',
  ].join('');

  // ---- Load Settings ----

  chrome.storage.sync.get(
    ['autoPopulateEnabled', 'descriptionTemplate', 'footerTemplate'],
    (result) => {
      autoToggle.checked = result.autoPopulateEnabled !== false;
      descTemplate.value = result.descriptionTemplate || DEFAULT_DESC_TEMPLATE;
      footerTemplate.value = result.footerTemplate || DEFAULT_FOOTER_TEMPLATE;
    }
  );

  // ---- Save Settings ----

  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set(
      {
        autoPopulateEnabled: autoToggle.checked,
        descriptionTemplate: descTemplate.value,
        footerTemplate: footerTemplate.value,
      },
      () => {
        savedMsg.classList.add('options__saved--visible');
        setTimeout(() => {
          savedMsg.classList.remove('options__saved--visible');
        }, 2000);
      }
    );
  });

  // ---- Reset Templates ----

  resetDescBtn.addEventListener('click', () => {
    descTemplate.value = DEFAULT_DESC_TEMPLATE;
  });

  resetFooterBtn.addEventListener('click', () => {
    footerTemplate.value = DEFAULT_FOOTER_TEMPLATE;
  });

  // ---- Variable Tags — Click to Insert ----

  document.querySelectorAll('.tag[data-var]').forEach((tag) => {
    tag.addEventListener('click', () => {
      const variable = `{{${tag.dataset.var}}}`;
      // Insert at cursor position in description template
      const textarea = descTemplate;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      textarea.value = text.substring(0, start) + variable + text.substring(end);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    });
  });
});
