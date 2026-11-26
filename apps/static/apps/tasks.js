// Vazifalar sahifasi — /api/v1/tasks/ bilan ishlaydi

const TASKS_API = '/api/v1/tasks/';
const PRIORITY_LABEL = { high: 'Yuqori', medium: "O'rta", low: 'Past' };
const PRIORITY_BADGE = { high: 'red', medium: 'amber', low: 'blue' };

let tasks = [];
let filterMode = 'all';
let editingTaskId = null;

const tid = id => document.getElementById(id);

async function taskApi(url = '', options = {}) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(TASKS_API + url, { ...options, headers });

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

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function isOverdue(t) {
  return !t.is_done && !!t.due_date && t.due_date < todayString();
}

async function loadTasks() {
  try {
    tasks = await taskApi('');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function filteredTasks() {
  const q = tid('taskSearch').value.trim().toLowerCase();
  return tasks.filter(t => {
    if (filterMode === 'pending' && t.is_done) return false;
    if (filterMode === 'done' && !t.is_done) return false;
    if (filterMode === 'overdue' && !isOverdue(t)) return false;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderStats() {
  const done = tasks.filter(t => t.is_done).length;
  const overdue = tasks.filter(isOverdue).length;
  tid('statTotal').textContent = tasks.length;
  tid('statDone').textContent = done;
  tid('statPending').textContent = tasks.length - done;
  tid('statOverdue').textContent = overdue;
}

function rowHtml(t) {
  const overdue = isOverdue(t);
  const titleStyle = t.is_done ? 'text-decoration:line-through; color:var(--muted);' : '';
  const sub = [
    t.due_date ? `Muddat: ${formatDate(t.due_date)}` : 'Muddat belgilanmagan',
    t.description ? esc(t.description) : '',
  ].filter(Boolean).join(' · ');

  return `
    <div class="task-row">
      <input type="checkbox" data-toggle="${t.id}" ${t.is_done ? 'checked' : ''} aria-label="Bajarildi">
      <div class="task-main">
        <div class="task-title" style="${titleStyle}">${esc(t.title)}</div>
        <div class="task-sub">${sub}</div>
      </div>
      ${overdue ? '<span class="badge red">Muddati o\'tgan</span>' : ''}
      <span class="badge ${PRIORITY_BADGE[t.priority] || ''}">${PRIORITY_LABEL[t.priority] || t.priority}</span>
      <div class="row-actions">
        <button class="btn btn-sm" data-edit="${t.id}">Tahrirlash</button>
        <button class="btn btn-sm btn-danger" data-delete="${t.id}">O'chirish</button>
      </div>
    </div>`;
}

function render() {
  renderStats();
  const list = filteredTasks();
  tid('taskList').innerHTML = list.map(rowHtml).join('');
  tid('taskEmpty').style.display = list.length ? 'none' : 'block';
}

// ---------- Modal ----------
function openTaskModal(task = null) {
  editingTaskId = task ? task.id : null;
  const form = tid('taskForm');
  form.reset();
  tid('taskError').textContent = '';
  tid('taskModalTitle').textContent = task ? 'Vazifani tahrirlash' : 'Yangi vazifa';

  if (task) {
    form.title.value = task.title;
    form.due_date.value = task.due_date || '';
    form.priority.value = task.priority;
    form.description.value = task.description || '';
  }
  tid('taskModal').classList.add('open');
}

function closeTaskModal() {
  tid('taskModal').classList.remove('open');
}

async function saveTask(e) {
  e.preventDefault();
  const form = tid('taskForm');
  const body = {
    title: form.title.value.trim(),
    due_date: form.due_date.value || null,
    priority: form.priority.value,
    description: form.description.value.trim(),
  };

  try {
    if (editingTaskId) {
      await taskApi(`${editingTaskId}/`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Vazifa yangilandi');
    } else {
      await taskApi('', { method: 'POST', body: JSON.stringify(body) });
      toast("Vazifa qo'shildi");
    }
    closeTaskModal();
    await loadTasks();
  } catch (err) {
    tid('taskError').textContent = err.message;
  }
}

// ---------- Bajarildi belgisi ----------
async function toggleTask(id, done) {
  try {
    await taskApi(`${id}/`, { method: 'PATCH', body: JSON.stringify({ is_done: done }) });
    const task = tasks.find(t => t.id === id);
    if (task) task.is_done = done;
    render();
  } catch (err) {
    toast(err.message, 'error');
    await loadTasks();
  }
}

// ---------- O'chirish ----------
async function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!confirm(`"${task ? task.title : 'Vazifa'}" ni o'chirmoqchimisiz?`)) return;

  try {
    await taskApi(`${id}/`, { method: 'DELETE' });
    toast("Vazifa o'chirildi");
    await loadTasks();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Standart vazifalarni yaratish ----------
async function generateTasks() {
  try {
    const data = await taskApi('generate/', { method: 'POST' });
    toast(data.created ? `${data.created} ta vazifa qo'shildi` : "Yangi vazifa yo'q, hammasi mavjud");
    await loadTasks();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Hodisalar ----------
tid('filterTabs').querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    tid('filterTabs').querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterMode = btn.dataset.filter;
    render();
  });
});

tid('taskSearch').addEventListener('input', render);

tid('addTaskBtn').addEventListener('click', () => openTaskModal());
tid('quickAddBtn').addEventListener('click', () => openTaskModal());
tid('generateBtn')?.addEventListener('click', generateTasks);
tid('cancelTaskBtn').addEventListener('click', closeTaskModal);
tid('taskModal').addEventListener('click', e => {
  if (e.target === tid('taskModal')) closeTaskModal();
});
tid('taskForm').addEventListener('submit', saveTask);

tid('taskList').addEventListener('change', e => {
  const cb = e.target.closest('[data-toggle]');
  if (cb) toggleTask(Number(cb.dataset.toggle), cb.checked);
});

tid('taskList').addEventListener('click', e => {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');

  if (editBtn) {
    const id = Number(editBtn.dataset.edit);
    openTaskModal(tasks.find(t => t.id === id));
  }
  if (delBtn) {
    deleteTask(Number(delBtn.dataset.delete));
  }
});

loadTasks();