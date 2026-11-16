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
    if (href === path) a.classList.add('active');
  });
}

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');
  const btn = document.getElementById('menuBtn');
  if (!sidebar) return;

  const toggle = open => {
    sidebar.classList.toggle('open', open);
    if (backdrop) backdrop.style.display = open ? 'block' : 'none';
  };
  btn?.addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
  backdrop?.addEventListener('click', () => toggle(false));
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

document.addEventListener('DOMContentLoaded', () => {
  markActiveNav();
  setupSidebar();
});