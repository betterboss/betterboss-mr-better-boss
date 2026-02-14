// Better Boss DocFill v3.0 — Options
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  function initials(n) {
    if (!n) return 'BB';
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }

  function flash(el) { el.classList.add('saved--show'); setTimeout(() => el.classList.remove('saved--show'), 2000); }

  // Load
  chrome.storage.local.get(['profile'], (r) => {
    const p = r.profile;
    if (p && p.ownerName) {
      showMain(p);
    } else {
      $('setup').style.display = 'block';
    }
  });

  function showMain(p) {
    $('setup').style.display = 'none';
    $('main').style.display = 'block';
    $('avatar').textContent = initials(p.ownerName);
    $('p-name').textContent = p.ownerName || '—';
    $('p-company').textContent = p.bizName || '';
    $('e-name').value = p.ownerName || '';
    $('e-email').value = p.bizEmail || '';
    $('e-company').value = p.bizName || '';
    $('e-phone').value = p.bizPhone || '';
    $('e-website').value = p.bizWebsite || '';
    $('e-license').value = p.bizLicense || '';
  }

  // Setup form
  $('setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
      ownerName: $('s-name').value.trim(),
      bizEmail: $('s-email').value.trim(),
      bizName: $('s-company').value.trim(),
      bizPhone: $('s-phone').value.trim(),
      bizWebsite: $('s-website').value.trim(),
      bizLicense: $('s-license').value.trim(),
    };
    chrome.storage.local.set({ profile }, () => showMain(profile));
  });

  // Edit profile
  $('edit-btn').addEventListener('click', () => {
    $('edit-section').style.display = 'block';
    $('edit-section').scrollIntoView({ behavior: 'smooth' });
  });
  $('cancel-btn').addEventListener('click', () => $('edit-section').style.display = 'none');
  $('save-btn').addEventListener('click', () => {
    const profile = {
      ownerName: $('e-name').value.trim(),
      bizEmail: $('e-email').value.trim(),
      bizName: $('e-company').value.trim(),
      bizPhone: $('e-phone').value.trim(),
      bizWebsite: $('e-website').value.trim(),
      bizLicense: $('e-license').value.trim(),
    };
    chrome.storage.local.set({ profile }, () => {
      $('avatar').textContent = initials(profile.ownerName);
      $('p-name').textContent = profile.ownerName || '—';
      $('p-company').textContent = profile.bizName || '';
      $('edit-section').style.display = 'none';
      flash($('saved'));
    });
  });

  // Export
  $('export-btn').addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'better-boss-docfill-backup.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });

  // Import
  $('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid');
        chrome.storage.local.set(data, () => { alert('Imported! Reloading…'); location.reload(); });
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  });
});
