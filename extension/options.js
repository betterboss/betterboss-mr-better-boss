// Better Boss — DocFill Options · mybetterboss.ai

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  const loginScreen   = $('login-screen');
  const settingsScreen = $('settings-screen');
  const loginForm     = $('login-form');

  const pAvatar  = $('p-avatar');
  const pName    = $('p-name');
  const pCompany = $('p-company');

  const profileEdit   = $('profile-edit');
  const profileSaved  = $('profile-saved');
  const descTpl       = $('desc-tpl');
  const footerTpl     = $('footer-tpl');
  const tplSaved      = $('tpl-saved');

  // ---- Default Templates ----

  const DEF_DESC = `*JobTread Implementation Agreement \u2014 *^{{company}}^**
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

  const DEF_FOOTER =
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

  function initials(n) {
    if (!n) return 'BB';
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : p[0].substring(0,2).toUpperCase();
  }

  function flash(el) {
    el.classList.add('saved--show');
    setTimeout(() => el.classList.remove('saved--show'), 2000);
  }

  function safeSave(data, cb) {
    try {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          alert('Save failed: ' + chrome.runtime.lastError.message);
        } else if (cb) {
          cb();
        }
      });
    } catch (e) {
      alert('Save error: ' + e.message);
    }
  }

  // ---- Screens ----

  function showLogin() { loginScreen.style.display = 'block'; settingsScreen.style.display = 'none'; }
  function showSettings(p) {
    loginScreen.style.display = 'none';
    settingsScreen.style.display = 'block';
    pAvatar.textContent = initials(p.ownerName);
    pName.textContent = p.ownerName || '—';
    pCompany.textContent = p.bizName || '';
    $('p-fname').value = p.ownerName || '';
    $('p-femail').value = p.bizEmail || '';
    $('p-fcompany').value = p.bizName || '';
    $('p-fphone').value = p.bizPhone || '';
    $('p-faddress').value = p.bizAddress || '';
    $('p-fwebsite').value = p.bizWebsite || '';
    $('p-flicense').value = p.bizLicense || '';
  }

  // ---- Load ----

  chrome.storage.sync.get(null, (r) => {
    if (chrome.runtime.lastError) {
      alert('Could not load settings: ' + chrome.runtime.lastError.message);
      return;
    }
    const p = r.profile;
    if (p && p.ownerName) { showSettings(p); } else { showLogin(); }
    descTpl.value = r.descriptionTemplate || DEF_DESC;
    footerTpl.value = r.footerTemplate || DEF_FOOTER;
  });

  // ---- Login ----

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
      ownerName: $('l-name').value.trim(),
      bizEmail:  $('l-email').value.trim(),
      bizName:   $('l-company').value.trim(),
      bizPhone:  $('l-phone').value.trim(),
      bizAddress:$('l-address').value.trim(),
      bizWebsite:$('l-website').value.trim(),
      bizLicense:$('l-license').value.trim(),
    };
    safeSave({ profile }, () => showSettings(profile));
  });

  // ---- Profile Edit ----

  $('btn-edit').addEventListener('click', () => {
    profileEdit.style.display = 'block';
    profileEdit.scrollIntoView({ behavior: 'smooth' });
  });
  $('cancel-profile').addEventListener('click', () => { profileEdit.style.display = 'none'; });

  $('save-profile').addEventListener('click', () => {
    const profile = {
      ownerName: $('p-fname').value.trim(),
      bizEmail:  $('p-femail').value.trim(),
      bizName:   $('p-fcompany').value.trim(),
      bizPhone:  $('p-fphone').value.trim(),
      bizAddress:$('p-faddress').value.trim(),
      bizWebsite:$('p-fwebsite').value.trim(),
      bizLicense:$('p-flicense').value.trim(),
    };
    safeSave({ profile }, () => {
      pAvatar.textContent = initials(profile.ownerName);
      pName.textContent = profile.ownerName || '—';
      pCompany.textContent = profile.bizName || '';
      profileEdit.style.display = 'none';
      flash(profileSaved);
    });
  });

  // ---- Logout ----

  $('btn-logout').addEventListener('click', () => {
    if (!confirm('Log out? Your templates stay, but your profile will be cleared.')) return;
    chrome.storage.sync.remove('profile', () => showLogin());
  });

  // ---- Templates ----

  $('save-tpl').addEventListener('click', () => {
    safeSave({ descriptionTemplate: descTpl.value, footerTemplate: footerTpl.value }, () => flash(tplSaved));
  });

  $('reset-desc').addEventListener('click', () => { descTpl.value = DEF_DESC; });
  $('reset-footer').addEventListener('click', () => { footerTpl.value = DEF_FOOTER; });

  // ---- Tags ----

  document.querySelectorAll('.tag[data-v]').forEach(tag => {
    tag.addEventListener('click', () => {
      const v = `{{${tag.dataset.v}}}`;
      const ta = descTpl;
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.value = ta.value.substring(0, s) + v + ta.value.substring(e);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = s + v.length;
    });
  });

  // ---- Export ----

  $('btn-export').addEventListener('click', () => {
    chrome.storage.sync.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'betterboss-docfill-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // ---- Import ----

  $('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid format');
        safeSave(data, () => {
          alert('Data imported! Reloading settings...');
          window.location.reload();
        });
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
});
