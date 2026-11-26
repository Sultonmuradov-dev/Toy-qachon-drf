// Umumiy yordamchi funksiyalar (barcha sahifalar uchun)
function money(n) {
  return Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ') + " so'm";
}

function esc(value) {
  const d = document.createElement('div');
  d.textContent = value ?? '';
  return d.innerHTML;
}

function toast(message, type = 'ok') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function markActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || href === location.pathname) a.classList.add('active');
  });
}

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');
  const btn = document.getElementById('menuBtn');
  if (!sidebar) return;

  const open = () => {
    sidebar.classList.add('open');
    backdrop?.classList.add('show');
  };
  const close = () => {
    sidebar.classList.remove('open');
    backdrop?.classList.remove('show');
  };

  btn?.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  backdrop?.addEventListener('click', close);

  // Menyudagi havola bosilganda menyu yopiladi
  sidebar.querySelectorAll('a.nav-link').forEach(a => a.addEventListener('click', close));
}

function setupModal(modalId, openBtnId, cancelBtnId) {
  const modal = document.getElementById(modalId);
  if (!modal) return null;
  const open = () => modal.classList.add('open');
  const close = () => modal.classList.remove('open');
  document.getElementById(openBtnId)?.addEventListener('click', open);
  document.getElementById(cancelBtnId)?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  return { open, close };
}

// ---------- Foydalanuvchi menyusi (ism, tarif, chiqish) ----------
let currentUser = null;

function logoutNow() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  window.location.href = '/login/';
}

function ensureUserMenu(chip) {
  const existing = chip.closest('.user-menu-wrap');
  if (existing) return existing;

  const wrap = document.createElement('div');
  wrap.className = 'user-menu-wrap';
  chip.parentNode.insertBefore(wrap, chip);
  wrap.appendChild(chip);
  wrap.insertAdjacentHTML('beforeend', `
    <span class="plan-badge plan-free">Bepul</span>
    <div class="user-menu" hidden>
      <div class="user-menu-head">
        <div class="um-name"></div>
        <div class="muted um-phone"></div>
        <div class="um-plan"></div>
      </div>
      <a class="user-menu-item" href="/profile/">👤 Profil</a>
      <a class="user-menu-item" href="/plans/">⭐ Tarif va obuna</a>
      <a class="user-menu-item" href="/settings/">⚙️ Sozlamalar</a>
      <button type="button" class="user-menu-item um-logout">🚪 Chiqish</button>
    </div>`);

  const menu = wrap.querySelector('.user-menu');
  chip.style.cursor = 'pointer';
  chip.addEventListener('click', e => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  wrap.querySelector('.um-logout').addEventListener('click', logoutNow);
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) menu.hidden = true;
  });
  return wrap;
}

function fillUserMenu(wrap, user, name) {
  const plan = user.plan || 'free';
  const label = user.plan_label || 'Bepul';

  const badge = wrap.querySelector('.plan-badge');
  badge.textContent = label;
  badge.className = `plan-badge plan-${plan}`;

  wrap.querySelector('.um-name').textContent = name;
  wrap.querySelector('.um-phone').textContent = user.phone_number || '';

  let line = `Tarif: ${label}`;
  if (plan !== 'free' && user.plan_expires_at) {
    line += ` · ${new Date(user.plan_expires_at).toLocaleDateString('en-GB')} gacha`;
  }
  wrap.querySelector('.um-plan').textContent = line;
}

async function loadCurrentUser() {
  const token = localStorage.getItem('access');
  const chips = document.querySelectorAll('.user-chip');
  if (!token || !chips.length) return;

  try {
    const res = await fetch('/api/v1/users/me/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    currentUser = await res.json();
  } catch (_) {
    return;
  }

  const name = currentUser.first_name || currentUser.phone_number;
  chips.forEach(chip => {
    const wrap = ensureUserMenu(chip);
    chip.textContent = name;
    fillUserMenu(wrap, currentUser, name);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  markActiveNav();
  setupSidebar();
  loadCurrentUser();
});
