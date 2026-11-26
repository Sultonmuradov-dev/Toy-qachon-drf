// Tariflar: joriy tarifni belgilaydi, joriy va qamrab olingan tugmalarni o'chiradi

const RANK = { free: 0, premium: 1, vip: 2 };
const pl = id => document.getElementById(id);

// O'chirilgan tugma hech qayerga o'tkazmaydi
document.addEventListener('click', e => {
  if (e.target.closest('.is-disabled')) e.preventDefault();
});

function disableButton(btn, text) {
  btn.textContent = text;
  btn.classList.add('is-disabled');
  btn.removeAttribute('href');
  btn.setAttribute('aria-disabled', 'true');
}

async function markCurrentPlan() {
  const label = pl('currentPlanText');
  if (!label) return;

  let plan = 'free';
  try {
    const res = await authFetch('/api/v1/users/me/');
    if (!res.ok) return;
    const user = await res.json();
    plan = user.plan || 'free';
    label.textContent = user.plan_label || 'Bepul';
  } catch (_) {
    return;
  }

  document.querySelectorAll('.plan-card').forEach(card => {
    const key = card.dataset.plan;
    const btn = card.querySelector('[data-plan-btn]');
    if (!btn) return;

    if (key === plan) {
      card.classList.add('plan-current');
      disableButton(btn, 'Joriy tarif');
    } else if (RANK[key] < RANK[plan]) {
      disableButton(btn, 'Qamrab olingan');
    }
  });
}

markCurrentPlan();

// ---------- Muddat tanlovi va dinamik narx ----------
const fmt = n => Number(n).toLocaleString('en-US').replace(/,/g, ' ');

async function setupTermPicker() {
  const picker = pl('termPicker');
  const summary = pl('termSummary');
  const priceBox = pl('premiumPrice');
  if (!picker || !summary || !priceBox) return;

  let terms = [];
  try {
    const res = await fetch('/api/v1/plans/prices/');
    terms = (await res.json()).terms;
  } catch (_) {
    return;
  }

  let selected = terms[0];

  const render = () => {
    picker.innerHTML = terms.map(t => `
      <button type="button" class="term-btn ${t.key === selected.key ? 'is-active' : ''}" data-key="${t.key}">
        ${t.label}${t.discount ? ` <span class="save">-${t.discount}%</span>` : ''}
      </button>`).join('');

    priceBox.textContent = `${fmt(selected.total)} so'm`;

    summary.innerHTML = selected.discount
      ? `<span class="old">${fmt(selected.old_total)} so'm</span>
         <b>${fmt(selected.total)} so'm</b>
         <span class="muted">· oyiga ~${fmt(selected.per_month)} so'm · ${selected.discount}% chegirma</span>`
      : `<b>${fmt(selected.total)} so'm</b> <span class="muted">· ${selected.months} oy</span>`;
  };

  picker.addEventListener('click', e => {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    selected = terms.find(t => t.key === btn.dataset.key);
    render();
  });

  render();
}

setupTermPicker();