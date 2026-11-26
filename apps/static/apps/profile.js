// Profil sahifasi — /api/v1/users/me/ va /api/v1/dashboard/ bilan ishlaydi

const PROFILE_API = '/api/v1';
const pEl = id => document.getElementById(id);

async function profileApi(path, options = {}) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(PROFILE_API + path, { ...options, headers });

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

function pSetText(id, value) {
  const el = pEl(id);
  if (el) el.textContent = value;
}

// '2027-02-11' yoki '2026-11-26T10:00:00Z' -> '11.02.2027'
function pDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

// Bugundan to'y sanasigacha necha kun (mahalliy vaqt bo'yicha)
function daysUntil(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}

function displayName(u) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return full || u.phone_number;
}

function initialsOf(u) {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  if (!parts.length) return (u.phone_number || '').slice(-2);
  return parts.map(p => p.trim()[0] || '').join('').toUpperCase().slice(0, 2);
}

function prettyPhone(phone) {
  return typeof formatPhone === 'function' ? formatPhone(phone || '') : (phone || '');
}

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

// ---------- Profil kartasi ----------
function renderProfile(u) {
  pSetText('pAvatar', initialsOf(u));
  pSetText('pName', displayName(u));
  pSetText('pPhone', prettyPhone(u.phone_number));
  pSetText('userChip', u.first_name || prettyPhone(u.phone_number));

  const plan = pEl('pPlan');
  const isPaid = u.plan && u.plan !== 'free';
  plan.textContent = isPaid ? `${u.plan_label} tarif` : 'Bepul tarif';
  plan.className = 'badge ' + (isPaid ? 'amber' : '');
  pSetText('pPlanUntil', isPaid && u.plan_expires_at ? `${pDate(u.plan_expires_at)} gacha` : '');

  pSetText('pWedding', pDate(u.wedding_day));
  pSetText('pJoined', pDate(u.date_joined));
  pSetText('pTg', u.telegram_id ? String(u.telegram_id) : 'Ulanmagan');

  if (!u.wedding_day) {
    pSetText('pDays', '—');
    pSetText('pDaysLabel', "To'y sanasi hali kiritilmagan");
  } else {
    const left = daysUntil(u.wedding_day);
    if (left > 0) {
      pSetText('pDays', left);
      pSetText('pDaysLabel', "kun qoldi to'yingizgacha");
    } else if (left === 0) {
      pSetText('pDays', 'Bugun!');
      pSetText('pDaysLabel', "To'yingiz muborak bo'lsin!");
    } else {
      pSetText('pDays', Math.abs(left));
      pSetText('pDaysLabel', "kun oldin to'y bo'lib o'tdi");
    }
  }
}

function fillForm(u) {
  const f = pEl('profileForm');
  f.first_name.value = u.first_name || '';
  f.last_name.value = u.last_name || '';
  f.wedding_day.value = u.wedding_day || '';
  f.telegram_id.value = u.telegram_id || '';
  pEl('pPhoneInput').value = prettyPhone(u.phone_number);
}

// ---------- Tayyorgarlik holati ----------
function setSummary(key, percent, sub) {
  pSetText(`sum${key}Pct`, `${percent}%`);
  const bar = pEl(`sum${key}Bar`);
  if (bar) bar.style.width = `${Math.min(percent, 100)}%`;
  pSetText(`sum${key}Sub`, sub);
}

function renderSummary(d) {
  const g = d.guests, b = d.budget, t = d.tasks;
  setSummary('Guests', pct(g.confirmed, g.total), `${g.confirmed} / ${g.total} mehmon`);

  const budgetPct = pct(b.spent, b.planned);
  setSummary('Budget', budgetPct, `${money(b.spent)} / ${money(b.planned)}`);
  const budgetBar = pEl('sumBudgetBar')?.parentElement;
  if (budgetBar) budgetBar.classList.toggle('red', budgetPct > 100);

  setSummary('Tasks', pct(t.done, t.total), `${t.done} / ${t.total} vazifa`);
}

// ---------- Saqlash ----------
async function saveProfile(e) {
  e.preventDefault();
  const f = e.target;
  const btn = pEl('profileSave');
  pSetText('profileError', '');

  const tg = f.telegram_id.value.trim();
  if (tg && !/^\d{5,15}$/.test(tg)) {
    pSetText('profileError', "Telegram ID faqat raqamlardan iborat bo'lishi kerak");
    return;
  }

  const body = {
    first_name: f.first_name.value.trim(),
    last_name: f.last_name.value.trim(),
    wedding_day: f.wedding_day.value || null,
    telegram_id: tg ? Number(tg) : null,
  };

  btn.disabled = true;
  try {
    const u = await profileApi('/users/me/', { method: 'PATCH', body: JSON.stringify(body) });
    renderProfile(u);
    fillForm(u);
    toast('Profil saqlandi');
  } catch (err) {
    pSetText('profileError', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function loadProfile() {
  try {
    const u = await profileApi('/users/me/');
    renderProfile(u);
    fillForm(u);
  } catch (err) {
    toast(err.message, 'error');
  }
  try {
    renderSummary(await profileApi('/dashboard/'));
  } catch (err) {
    toast(err.message, 'error');
  }
}

pEl('profileForm').addEventListener('submit', saveProfile);
loadProfile();
