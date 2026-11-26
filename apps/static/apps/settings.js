// Sozlamalar sahifasi — til, parol va tarif holati

const SETTINGS_API = '/api/v1';
const sEl = id => document.getElementById(id);

async function settingsApi(path, options = {}) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(SETTINGS_API + path, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.href = '/login/';
    throw new Error('Sessiya tugagan, qayta kiring');
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) {
    const msg = data && typeof data === 'object' ? Object.values(data).flat().join(' ') : '';
    throw new Error(msg || `Server xatosi: ${res.status}`);
  }
  return data;
}

let currentLanguage = null;

function renderSettings(u) {
  currentLanguage = u.language;
  const radio = document.querySelector(`#langOptions input[value="${u.language}"]`);
  if (radio) radio.checked = true;

  const chip = sEl('userChip');
  if (chip) chip.textContent = u.first_name || u.phone_number;

  const isPaid = u.plan && u.plan !== 'free';
  let text = isPaid ? `Sizda ${u.plan_label} tarif faol.` : 'Hozir siz bepul tarifdasiz.';
  if (isPaid && u.plan_expires_at) {
    const [y, m, d] = u.plan_expires_at.slice(0, 10).split('-');
    text += ` Muddati: ${d}.${m}.${y} gacha.`;
  }
  sEl('premiumStatus').textContent = text;
  sEl('premiumBtn').textContent = isPaid ? 'Tarifni boshqarish' : "Premium'ga o'tish";
}

// ---------- Til ----------
async function changeLanguage(e) {
  const value = e.target.value;
  try {
    const u = await settingsApi('/users/me/', {
      method: 'PATCH',
      body: JSON.stringify({ language: value }),
    });
    currentLanguage = u.language;
    toast('Til saqlandi');
  } catch (err) {
    toast(err.message, 'error');
    // xato bo'lsa, avvalgi tanlovga qaytaramiz
    const prev = document.querySelector(`#langOptions input[value="${currentLanguage}"]`);
    if (prev) prev.checked = true;
  }
}

// ---------- Parol ----------
async function changePassword(e) {
  e.preventDefault();
  const f = e.target;
  const err = sEl('passwordError');
  const btn = sEl('passwordSave');
  err.textContent = '';

  if (f.new_password.value !== f.confirm_password.value) {
    err.textContent = 'Yangi parollar bir xil emas';
    return;
  }
  if (f.new_password.value === f.old_password.value) {
    err.textContent = "Yangi parol joriy paroldan farq qilishi kerak";
    return;
  }

  btn.disabled = true;
  try {
    await settingsApi('/users/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: f.old_password.value,
        new_password: f.new_password.value,
        confirm_password: f.confirm_password.value,
      }),
    });
    f.reset();
    toast("Parol o'zgartirildi");
  } catch (e2) {
    err.textContent = e2.message;
  } finally {
    btn.disabled = false;
  }
}

async function loadSettings() {
  try {
    renderSettings(await settingsApi('/users/me/'));
  } catch (err) {
    toast(err.message, 'error');
  }
}

document.querySelectorAll('#langOptions input[name="language"]')
  .forEach(r => r.addEventListener('change', changeLanguage));
sEl('passwordForm').addEventListener('submit', changePassword);
loadSettings();
