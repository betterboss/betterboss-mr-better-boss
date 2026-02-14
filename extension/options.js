// =============================================================================
// Better Boss DocFill — Options Page Script
// Handles login (business profile setup), profile editing, and template config
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ---- Element References ----

  const loginScreen = document.getElementById('login-screen');
  const settingsScreen = document.getElementById('settings-screen');

  // Login form
  const loginForm = document.getElementById('login-form');

  // Profile bar (logged-in header)
  const profileAvatar = document.getElementById('profile-avatar');
  const profileDisplayName = document.getElementById('profile-display-name');
  const profileDisplayCompany = document.getElementById('profile-display-company');
  const btnEditProfile = document.getElementById('btn-edit-profile');
  const btnLogout = document.getElementById('btn-logout');

  // Profile edit section
  const profileEditSection = document.getElementById('profile-edit-section');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const cancelProfileBtn = document.getElementById('cancel-profile-btn');
  const profileSavedMsg = document.getElementById('profile-saved-msg');

  // Template fields
  const descTemplate = document.getElementById('desc-template');
  const footerTemplate = document.getElementById('footer-template');
  const saveBtn = document.getElementById('save-btn');
  const savedMsg = document.getElementById('saved-msg');
  const resetDescBtn = document.getElementById('reset-desc');
  const resetFooterBtn = document.getElementById('reset-footer');

  // ---- Default Templates ----

  const DEFAULT_DESC_TEMPLATE = `*JobTread Implementation Agreement \u2014 *^{{company}}^**
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

  const DEFAULT_FOOTER_TEMPLATE =
    '{{#customerName}}*Prepared for:* {{customerName}}{{/customerName}}' +
    '{{#company}} | *{{company}}*{{/company}}' +
    '{{#jobName}} | Project: {{jobName}}{{/jobName}}' +
    '{{#jobNumber}} | Job #{{jobNumber}}{{/jobNumber}}' +
    '\n{{#bizName}}*{{bizName}}*{{/bizName}}' +
    '{{#bizPhone}} | {{bizPhone}}{{/bizPhone}}' +
    '{{#bizEmail}} | {{bizEmail}}{{/bizEmail}}' +
    '{{#bizWebsite}} | {{bizWebsite}}{{/bizWebsite}}' +
    '{{#bizLicense}} | Lic #{{bizLicense}}{{/bizLicense}}';

  // ---- Helpers ----

  function getInitials(name) {
    if (!name) return 'BB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  function flashSaved(el) {
    el.classList.add('options__saved--visible');
    setTimeout(() => el.classList.remove('options__saved--visible'), 2000);
  }

  // ---- Screen Management ----

  function showLoginScreen() {
    loginScreen.style.display = 'block';
    settingsScreen.style.display = 'none';
  }

  function showSettingsScreen(profile) {
    loginScreen.style.display = 'none';
    settingsScreen.style.display = 'block';

    // Populate profile bar
    profileAvatar.textContent = getInitials(profile.ownerName);
    profileDisplayName.textContent = profile.ownerName || 'User';
    profileDisplayCompany.textContent = profile.bizName || '';

    // Populate profile edit fields
    document.getElementById('profile-name').value = profile.ownerName || '';
    document.getElementById('profile-email').value = profile.bizEmail || '';
    document.getElementById('profile-company').value = profile.bizName || '';
    document.getElementById('profile-phone').value = profile.bizPhone || '';
    document.getElementById('profile-address').value = profile.bizAddress || '';
    document.getElementById('profile-website').value = profile.bizWebsite || '';
    document.getElementById('profile-license').value = profile.bizLicense || '';
  }

  // ---- Load Everything ----

  chrome.storage.sync.get(null, (result) => {
    const profile = result.profile || null;

    if (!profile || !profile.ownerName) {
      showLoginScreen();
    } else {
      showSettingsScreen(profile);
    }

    // Load templates
    descTemplate.value = result.descriptionTemplate || DEFAULT_DESC_TEMPLATE;
    footerTemplate.value = result.footerTemplate || DEFAULT_FOOTER_TEMPLATE;
  });

  // ---- Login Form Submit ----

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const profile = {
      ownerName: document.getElementById('login-name').value.trim(),
      bizEmail: document.getElementById('login-email').value.trim(),
      bizName: document.getElementById('login-company').value.trim(),
      bizPhone: document.getElementById('login-phone').value.trim(),
      bizAddress: document.getElementById('login-address').value.trim(),
      bizWebsite: document.getElementById('login-website').value.trim(),
      bizLicense: document.getElementById('login-license').value.trim(),
    };

    chrome.storage.sync.set({ profile }, () => {
      showSettingsScreen(profile);
    });
  });

  // ---- Profile Edit ----

  btnEditProfile.addEventListener('click', () => {
    profileEditSection.style.display = 'block';
    profileEditSection.scrollIntoView({ behavior: 'smooth' });
  });

  cancelProfileBtn.addEventListener('click', () => {
    profileEditSection.style.display = 'none';
  });

  saveProfileBtn.addEventListener('click', () => {
    const profile = {
      ownerName: document.getElementById('profile-name').value.trim(),
      bizEmail: document.getElementById('profile-email').value.trim(),
      bizName: document.getElementById('profile-company').value.trim(),
      bizPhone: document.getElementById('profile-phone').value.trim(),
      bizAddress: document.getElementById('profile-address').value.trim(),
      bizWebsite: document.getElementById('profile-website').value.trim(),
      bizLicense: document.getElementById('profile-license').value.trim(),
    };

    chrome.storage.sync.set({ profile }, () => {
      // Update profile bar
      profileAvatar.textContent = getInitials(profile.ownerName);
      profileDisplayName.textContent = profile.ownerName || 'User';
      profileDisplayCompany.textContent = profile.bizName || '';
      profileEditSection.style.display = 'none';
      flashSaved(profileSavedMsg);
    });
  });

  // ---- Logout ----

  btnLogout.addEventListener('click', () => {
    if (confirm('Log out? Your templates will be kept, but your profile will be cleared.')) {
      chrome.storage.sync.remove('profile', () => {
        showLoginScreen();
      });
    }
  });

  // ---- Save Templates ----

  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set(
      {
        descriptionTemplate: descTemplate.value,
        footerTemplate: footerTemplate.value,
      },
      () => flashSaved(savedMsg)
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
