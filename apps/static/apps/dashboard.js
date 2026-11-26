// Bosh sahifa — /api/v1/dashboard/ va /api/v1/users/me/ bilan ishlaydi

const DASH_API = '/api/v1';
const $ = id => document.getElementById(id);

async function api(path, options = {}) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(DASH_API + path, { ...options, headers });

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

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setBar(id, percent) {
  const el = $(id);
  if (el) el.style.width = `${Math.min(percent, 100)}%`;
}

function pct(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech';
}

// ---------- Bo'limlar ----------

function renderHeader(d) {
  const now = new Date();
  setText('today', now.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase());
  setText('greeting', `${greetingWord()}, ${d.user_name}`);
  setText('userChip', d.user_name);
}

function renderStats(d) {
  const g = d.guests;
  const b = d.budget;
  const t = d.tasks;

  setText('daysLeft', d.days_left === null ? '—' : Math.max(d.days_left, 0));
  setText('guestsTotal', g.total);
  setText('guestsSub', `${g.confirmed} tasdiqlangan`);
  setText('budgetSpent', money(b.spent));
  setText('budgetSub', `${pct(b.spent, b.planned)}% sarflangan`);
  setText('tasksPctCard', `${pct(t.done, t.total)}%`);
}

function renderSummary(d) {
  const b = d.budget;
  const t = d.tasks;
  const budgetPct = pct(b.spent, b.planned);
  const taskPct = pct(t.done, t.total);

  setText('budgetPct', `${budgetPct}%`);
  setBar('budgetBar', budgetPct);
  setText('budgetSub2', `${money(b.spent)} / ${money(b.planned)}`);

  setText('taskPct', `${taskPct}%`);
  setBar('taskBar', taskPct);
  setText('taskSub', `${t.done} / ${t.total} vazifa bajarildi`);

  setText('pendingCount', t.pending);
  setText('monthCount', t.this_month);
}

function renderAlerts(d) {
  const box = $('alerts');
  const list = d.alerts || [];

  if (!list.length) {
    setText('alertCount', 'Hammasi joyida');
    box.innerHTML = '';
    return;
  }

  setText('alertCount', `${list.length} ta narsa e'tibor talab qiladi`);
  box.innerHTML = list.map(a => `
    <div class="alert-item ${a.type === 'amber' ? 'amber' : ''}">
      <span>⚠ ${esc(a.text)}</span><span>›</span>
    </div>`).join('');
}

function renderWedding(d) {
  const box = $('weddingInfo');

  if (d.days_left === null) {
    box.innerHTML = `<p class="muted">To'y sanasi hali kiritilmagan. Pastdan sanani tanlang.</p>`;
    return;
  }

  const badge = d.days_left >= 0
    ? `<span class="badge blue">${d.days_left} kun</span>`
    : `<span class="badge">O'tib ketgan</span>`;

  box.innerHTML = `
    <div class="wedding">
      <div class="wedding-icon">💍</div>
      <div class="wedding-info">
        <b>To'y kuni</b>
        <span class="muted">${formatDate(d.wedding_day)}</span>
      </div>
      ${badge}
    </div>`;

  $('weddingDate').value = d.wedding_day;
}

function renderPriorityTasks(d) {
  const box = $('priorityTasks');
  const list = d.priority_tasks || [];

  if (!list.length) {
    box.innerHTML = `<p class="muted">Vazifalar hali qo'shilmagan. Vazifalar moduli tayyor bo'lgach shu yerda ko'rinadi.</p>`;
    return;
  }

  box.innerHTML = list.map(t => `
    <div class="task-row">
      <input type="checkbox" aria-label="Bajarildi">
      <div class="task-main">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-sub">${esc(t.sub || '')}</div>
      </div>
      ${t.overdue ? '<span class="badge red">Muddati o\'tgan</span>' : ''}
      <span class="badge ${t.priority === 'high' ? 'red' : 'amber'}">${t.priority === 'high' ? 'Yuqori' : "O'rta"}</span>
    </div>`).join('');
}

function renderDashboard(d) {
  renderHeader(d);
  renderStats(d);
  renderSummary(d);
  renderAlerts(d);
  renderWedding(d);
  renderPriorityTasks(d);
}

// ---------- Yuklash ----------

async function loadDashboard() {
  try {
    const data = await api('/dashboard/');
    renderDashboard(data);
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- To'y sanasini saqlash ----------

$('saveWeddingBtn').addEventListener('click', async () => {
  const value = $('weddingDate').value;
  if (!value) {
    toast("Avval sanani tanlang", 'error');
    return;
  }
  try {
    await api('/users/me/', { method: 'PATCH', body: JSON.stringify({ wedding_day: value }) });
    toast("To'y sanasi saqlandi");
    await loadDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
});

loadDashboard();


function renderPlanBanner(d) {
  const box = $('planBanner');
  if (!box || !d.plan) return;

  if (d.plan.name !== 'free') {
    const until = d.plan.expires_at ? ` · muddati: ${formatDate(d.plan.expires_at.slice(0, 10))}` : '';
    box.innerHTML = `
      <div class="plan-banner plan-banner-active">
        <span>Tarifingiz: <b>${esc(d.plan.label)}</b>${until}</span>
        <a class="btn btn-sm" href="/plans/">Tarifni ko'rish</a>
      </div>`;
    return;
  }

  const u = d.plan.usage;
  box.innerHTML = `
    <div class="plan-banner">
      <span><b>Bepul tarif</b>
        <span class="muted"> · mehmonlar ${u.guests.used}/${u.guests.limit},
        byudjet ${u.budget_items.used}/${u.budget_items.limit},
        vazifalar ${u.tasks.used}/${u.tasks.limit}</span>
      </span>
      <a class="btn btn-gold btn-sm" href="/plans/">Premium olish</a>
    </div>`;
}