// Mehmonlar sahifasi — /api/v1/guests/ bilan ishlaydi

const GUESTS_API = '/api/v1/guests/';

const SIDE_LABEL = { bridge: 'Kelin tomoni', groom: 'Kuyov tomoni' };
const GROUP_LABEL = { family: 'Oila', friends: "Do'stlar", colleagues: 'Hamkasblar' };
const STATUS_LABEL = { invited: 'Taklif qilindi', confirmed: 'Tasdiqlandi', declined: 'Kelmaydi' };
const STATUS_BADGE = { invited: 'blue', confirmed: 'green', declined: 'red' };

let guests = [];
let currentStatus = 'all';
let editingId = null;

const $ = id => document.getElementById(id);

// API so'rovi (JWT token bilan)
async function guestApi(url = '', options = {}) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(GUESTS_API + url, { ...options, headers });

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

  if (!res.ok) throw new Error(firstError(data) || `Server xatosi: ${res.status}`);
  return data;
}

async function loadGuests() {
  try {
    guests = await guestApi('');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function filteredGuests() {
  const q = $('search').value.trim().toLowerCase();
  const side = $('sideFilter').value;

  return guests.filter(g =>
    (currentStatus === 'all' || g.status === currentStatus) &&
    (!side || g.side === side) &&
    (!q || g.full_name.toLowerCase().includes(q) || (g.phone_number || '').includes(q))
  );
}

function renderStats() {
  const count = s => guests.filter(g => g.status === s).length;
  $('sTotal').textContent = guests.length;
  $('sConfirmed').textContent = count('confirmed');
  $('sInvited').textContent = count('invited');
  $('sDeclined').textContent = count('declined');
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function rowHtml(g) {
  return `
    <tr>
      <td><span class="avatar">${esc(initials(g.full_name))}</span>${esc(g.full_name)}</td>
      <td>${esc(g.phone_number || '—')}</td>
      <td>${esc(SIDE_LABEL[g.side] || g.side)}</td>
      <td>${esc(GROUP_LABEL[g.group] || g.group)}</td>
      <td><span class="badge ${STATUS_BADGE[g.status] || ''}">${esc(STATUS_LABEL[g.status] || g.status)}</span></td>
      <td class="actions">
        <div class="row-actions">
          <button class="btn btn-sm" data-edit="${g.id}">Tahrirlash</button>
          <button class="btn btn-sm btn-danger" data-delete="${g.id}">O'chirish</button>
        </div>
      </td>
    </tr>`;
}

function render() {
  renderStats();
  const list = filteredGuests();
  $('guestRows').innerHTML = list.map(rowHtml).join('');
  $('emptyState').style.display = list.length ? 'none' : 'block';
}

// ---------- Modal ----------
function openModal(guest = null) {
  editingId = guest ? guest.id : null;
  const form = $('guestForm');
  form.reset();
  $('guestError').textContent = '';
  $('modalTitle').textContent = guest ? 'Mehmonni tahrirlash' : 'Yangi mehmon';

  if (guest) {
    form.full_name.value = guest.full_name;
    form.phone_number.value = guest.phone_number ? formatPhone(guest.phone_number) : '';
    form.side.value = guest.side;
    form.group.value = guest.group;
    form.status.value = guest.status;
  }
  $('guestModal').classList.add('open');
}

function closeModal() {
  $('guestModal').classList.remove('open');
}

// ---------- Saqlash (qo'shish yoki tahrirlash) ----------
async function saveGuest(e) {
  e.preventDefault();
  const form = $('guestForm');
  const raw = form.phone_number.value.trim();
  const digits = raw.replace(/\D/g, '');

  let phone = '';
  if (digits.length > 3) {
    if (!isPhoneComplete(raw)) {
      $('guestError').textContent = "Telefon raqamni to'liq kiriting";
      return;
    }
    phone = normalizePhone(raw);
  }

  const body = {
    full_name: form.full_name.value.trim(),
    phone_number: phone,
    side: form.side.value,
    group: form.group.value,
    status: form.status.value,
  };

  try {
    if (editingId) {
      await guestApi(`${editingId}/`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Mehmon yangilandi');
    } else {
      await guestApi('', { method: 'POST', body: JSON.stringify(body) });
      toast("Mehmon qo'shildi");
    }
    closeModal();
    await loadGuests();
  } catch (err) {
    $('guestError').textContent = err.message;
  }
}

// ---------- O'chirish ----------
async function deleteGuest(id) {
  const guest = guests.find(g => g.id === id);
  if (!confirm(`"${guest ? guest.full_name : 'Mehmon'}" ni o'chirmoqchimisiz?`)) return;

  try {
    await guestApi(`${id}/`, { method: 'DELETE' });
    toast("Mehmon o'chirildi");
    await loadGuests();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Hodisalar ----------
document.querySelectorAll('#statusTabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#statusTabs .tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    render();
  });
});

$('search').addEventListener('input', render);
$('sideFilter').addEventListener('change', render);

$('addGuestBtn').addEventListener('click', () => openModal());
$('quickAddBtn').addEventListener('click', () => openModal());
$('cancelBtn').addEventListener('click', closeModal);
$('guestModal').addEventListener('click', e => {
  if (e.target === $('guestModal')) closeModal();
});

$('guestForm').addEventListener('submit', saveGuest);

$('guestRows').addEventListener('click', e => {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');

  if (editBtn) {
    const id = Number(editBtn.dataset.edit);
    openModal(guests.find(g => g.id === id));
  }
  if (delBtn) {
    deleteGuest(Number(delBtn.dataset.delete));
  }
});

loadGuests();