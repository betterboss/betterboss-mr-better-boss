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

  const DEFAULT_DESC_TEMPLATE = [
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

  const DEFAULT_FOOTER_TEMPLATE = [
    '{{#customerName}}Prepared for: {{customerName}}{{/customerName}}',
    '{{#company}} | {{company}}{{/company}}',
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
