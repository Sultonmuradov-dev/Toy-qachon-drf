// Sozlamalar sahifasi — profil, parol va chiqish

const SETTINGS_API = '/api/v1';
const sid = id => document.getElementById(id);

async function settingsApi(path, method = 'GET', body = null) {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(SETTINGS_API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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

function fillProfile(user) {
  const form = sid('profileForm');
  const name = user.first_name || user.phone_number;

  form.first_name.value = user.first_name || '';
  form.last_name.value = user.last_name || '';
  form.wedding_day.value = user.wedding_day || '';
  form.language.value = user.language || 'uz_latin';
  form.telegram_id.value = user.telegram_id || '';

  sid('userChip').textContent = name;
  sid('accountName').textContent = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
  sid('accountPhone').textContent = user.phone_number || '';
  sid('avatarInitial').textContent = (user.first_name || 'U')[0].toUpperCase();
}

async function loadProfile() {
  try {
    fillProfile(await settingsApi('/users/me/'));
  } catch (err) {
    toast(err.message, 'error');
  }
}

// Profilni saqlash
sid('profileForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = sid('profileForm');
  sid('profileError').textContent = '';

  const body = {
    first_name: form.first_name.value.trim(),
    last_name: form.last_name.value.trim(),
    wedding_day: form.wedding_day.value || null,
    language: form.language.value,
    telegram_id: form.telegram_id.value ? Number(form.telegram_id.value) : null,
  };

  try {
    fillProfile(await settingsApi('/users/me/', 'PATCH', body));
    toast('Ma\'lumotlar saqlandi');
  } catch (err) {
    sid('profileError').textContent = err.message;
  }
});

// Parolni o'zgartirish
sid('passwordForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = sid('passwordForm');
  sid('passwordError').textContent = '';

  try {
    await settingsApi('/users/change-password/', 'POST', {
      old_password: form.old_password.value,
      new_password: form.new_password.value,
      confirm_password: form.confirm_password.value,
    });
    form.reset();
    toast("Parol o'zgartirildi");
  } catch (err) {
    sid('passwordError').textContent = err.message;
  }
});

// Chiqish
sid('logoutBtn2').addEventListener('click', () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  window.location.href = '/login/';
});

loadProfile();