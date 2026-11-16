// Byudjet sahifasi — /api/v1/budget/ bilan ishlaydi

const BUDGET_API = '/api/v1/budget/';
const PALETTE = ['#c9962b', '#3b7fd0', '#2f9e6b', '#d99a1e', '#9b59b6', '#b9b2a6'];

let budgetItems = [];
let budgetEditingId = null;

const bid = id => document.getElementById(id);

async function budgetApi(url = '', options = {}) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BUDGET_API + url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.href = '/login/';
    throw new Error('Sessiya tugagan, qayta kiring');
  }
  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) {
    const msg = data && typeof data === 'object' ? Object.values(data).flat().join(' ') : '';
    throw new Error(msg || `Server xatosi: ${res.status}`);
  }
  return data;
}

function sum(key) {
  return budgetItems.reduce((total, item) => total + (item[key] || 0), 0);
}

async function loadBudget() {
  try {
    budgetItems = await budgetApi('');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function render() {
  const planned = sum('planned_amount');
  const spent = sum('spent_amount');
  const left = planned - spent;
  const pct = planned ? Math.round((spent / planned) * 100) : 0;

  bid('budgetTotal').textContent = money(planned);
  bid('budgetSpent').textContent = money(spent);
  bid('budgetLeft').textContent = money(left);
  bid('budgetPct').textContent = `${pct}%`;

  renderCategories();
  renderDistribution(planned);
  renderTable();
}

function renderCategories() {
  const box = bid('categoryList');
  if (!budgetItems.length) {
    box.innerHTML = '<p class="muted">Hali kategoriya yo\'q</p>';
    return;
  }

  box.innerHTML = budgetItems.map(item => {
    const pct = item.planned_amount ? Math.round((item.spent_amount / item.planned_amount) * 100) : 0;
    const over = item.spent_amount > item.planned_amount;
    return `
      <div class="bar-block">
        <div class="bar-top">
          <span>${esc(item.category)}</span>
          <b>${money(item.spent_amount)} / ${money(item.planned_amount)}</b>
        </div>
        <div class="progress ${over ? 'red' : ''}"><span style="width:${Math.min(pct, 100)}%"></span></div>
        <small class="muted">${over ? "Byudjetdan oshib ketdi" : `${pct}% sarflangan`}</small>
      </div>`;
  }).join('');
}

function renderDistribution(planned) {
  const box = bid('distribution');
  if (!budgetItems.length || !planned) {
    box.innerHTML = '<li class="muted">Ma\'lumot yo\'q</li>';
    return;
  }

  box.innerHTML = budgetItems.map((item, i) => {
    const share = Math.round((item.planned_amount / planned) * 100);
    return `<li><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${PALETTE[i % PALETTE.length]};margin-right:8px;"></span>${esc(item.category)} — ${share}%</li>`;
  }).join('');
}

function renderTable() {
  const rows = bid('budgetRows');
  const empty = bid('budgetEmpty');

  if (!budgetItems.length) {
    rows.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  rows.innerHTML = budgetItems.map(item => {
    const left = item.planned_amount - item.spent_amount;
    return `
      <tr>
        <td>${esc(item.category)}</td>
        <td>${money(item.planned_amount)}</td>
        <td>${money(item.spent_amount)}</td>
        <td>${left < 0 ? `<span class="badge red">${money(left)}</span>` : money(left)}</td>
        <td class="muted">${esc(item.note || '—')}</td>
        <td class="actions">
          <div class="row-actions">
            <button class="btn btn-sm" data-edit="${item.id}">Tahrirlash</button>
            <button class="btn btn-sm btn-danger" data-delete="${item.id}">O'chirish</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ---------- Modal ----------
function openBudgetModal(item = null) {
  budgetEditingId = item ? item.id : null;
  const form = bid('budgetForm');
  form.reset();
  bid('budgetError').textContent = '';
  bid('budgetModalTitle').textContent = item ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya';

  if (item) {
    form.category.value = item.category;
    form.planned_amount.value = item.planned_amount;
    form.spent_amount.value = item.spent_amount;
    form.note.value = item.note || '';
  }
  bid('budgetModal').classList.add('open');
}

function closeBudgetModal() {
  bid('budgetModal').classList.remove('open');
}

// ---------- Saqlash ----------
async function saveBudget(e) {
  e.preventDefault();
  const form = bid('budgetForm');
  const body = {
    category: form.category.value.trim(),
    planned_amount: Number(form.planned_amount.value),
    spent_amount: Number(form.spent_amount.value),
    note: form.note.value.trim(),
  };

  try {
    if (budgetEditingId) {
      await budgetApi(`${budgetEditingId}/`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Kategoriya yangilandi');
    } else {
      await budgetApi('', { method: 'POST', body: JSON.stringify(body) });
      toast("Kategoriya qo'shildi");
    }
    closeBudgetModal();
    await loadBudget();
  } catch (err) {
    bid('budgetError').textContent = err.message;
  }
}

// ---------- O'chirish ----------
async function deleteBudget(id) {
  const item = budgetItems.find(i => i.id === id);
  if (!confirm(`"${item ? item.category : 'Kategoriya'}" ni o'chirmoqchimisiz?`)) return;

  try {
    await budgetApi(`${id}/`, { method: 'DELETE' });
    toast("Kategoriya o'chirildi");
    await loadBudget();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Hodisalar ----------
bid('addBudgetBtn').addEventListener('click', () => openBudgetModal());
bid('quickAddBtn').addEventListener('click', () => openBudgetModal());
bid('cancelBudgetBtn').addEventListener('click', closeBudgetModal);
bid('budgetModal').addEventListener('click', e => {
  if (e.target === bid('budgetModal')) closeBudgetModal();
});
bid('budgetForm').addEventListener('submit', saveBudget);

bid('budgetRows').addEventListener('click', e => {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');

  if (editBtn) {
    const id = Number(editBtn.dataset.edit);
    openBudgetModal(budgetItems.find(i => i.id === id));
  }
  if (delBtn) {
    deleteBudget(Number(delBtn.dataset.delete));
  }
});

loadBudget();