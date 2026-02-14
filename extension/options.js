// Better Boss — DocFill v2.0 Options
// https://better-boss.ai

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  const loginScreen = $('login-screen');
  const settingsScreen = $('settings-screen');
  const loginForm = $('login-form');

  const pAvatar = $('p-avatar');
  const pName = $('p-name');
  const pCompany = $('p-company');

  const profileEdit = $('profile-edit');
  const profileSaved = $('profile-saved');

  // ---- Helpers ----

  function initials(n) {
    if (!n) return 'BB';
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
  }

  function flash(el) {
    el.classList.add('saved--show');
    setTimeout(() => el.classList.remove('saved--show'), 2000);
  }

  function safeSave(data, cb) {
    try {
      chrome.storage.local.set(data, () => {
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

  function showLogin() {
    loginScreen.style.display = 'block';
    settingsScreen.style.display = 'none';
  }

  function showSettings(p) {
    loginScreen.style.display = 'none';
    settingsScreen.style.display = 'block';
    pAvatar.textContent = initials(p.ownerName);
    pName.textContent = p.ownerName || '\u2014';
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

  chrome.storage.local.get(null, (r) => {
    if (chrome.runtime.lastError) {
      // Try sync storage (v1 migration)
      chrome.storage.sync.get(null, (sr) => {
        if (sr && sr.profile && sr.profile.ownerName) {
          showSettings(sr.profile);
        } else {
          showLogin();
        }
      });
      return;
    }
    const p = r.profile;
    if (p && p.ownerName) {
      showSettings(p);
    } else {
      showLogin();
    }
  });

  // ---- Login ----

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
      ownerName: $('l-name').value.trim(),
      bizEmail: $('l-email').value.trim(),
      bizName: $('l-company').value.trim(),
      bizPhone: $('l-phone').value.trim(),
      bizAddress: $('l-address').value.trim(),
      bizWebsite: $('l-website').value.trim(),
      bizLicense: $('l-license').value.trim(),
    };
    safeSave({ profile }, () => showSettings(profile));
  });

  // ---- Profile Edit ----

  $('btn-edit').addEventListener('click', () => {
    profileEdit.style.display = 'block';
    profileEdit.scrollIntoView({ behavior: 'smooth' });
  });

  $('cancel-profile').addEventListener('click', () => {
    profileEdit.style.display = 'none';
  });

  $('save-profile').addEventListener('click', () => {
    const profile = {
      ownerName: $('p-fname').value.trim(),
      bizEmail: $('p-femail').value.trim(),
      bizName: $('p-fcompany').value.trim(),
      bizPhone: $('p-fphone').value.trim(),
      bizAddress: $('p-faddress').value.trim(),
      bizWebsite: $('p-fwebsite').value.trim(),
      bizLicense: $('p-flicense').value.trim(),
    };
    safeSave({ profile }, () => {
      pAvatar.textContent = initials(profile.ownerName);
      pName.textContent = profile.ownerName || '\u2014';
      pCompany.textContent = profile.bizName || '';
      profileEdit.style.display = 'none';
      flash(profileSaved);
    });
  });

  // ---- Logout ----

  $('btn-logout').addEventListener('click', () => {
    if (!confirm('Log out? Your templates and snippets stay, but your profile will be cleared.')) return;
    chrome.storage.local.remove('profile', () => showLogin());
  });

  // ---- Export ----

  $('btn-export').addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'better-boss-docfill-backup.json';
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
