// Login va register formalari — backend API ga ulangan

const API_BASE = '/api/v1';

// Telefon raqam maskasi: +998 (99) 123-45-67
function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);

  if (!digits) return '';
  let out = '+998 (' + digits.slice(0, 2);
  if (digits.length >= 2) out += ')';
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += '-' + digits.slice(5, 7);
  if (digits.length > 7) out += '-' + digits.slice(7, 9);
  return out;
}

// Backend formati: +998991234567
function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('998') ? digits.slice(3) : digits;
  return '+998' + local.slice(0, 9);
}

function isPhoneComplete(value) {
  return value.replace(/\D/g, '').length === 12; // 998 + 9 raqam
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || '';
}

// DRF xato javobini matnga aylantirish
function firstError(data) {
  if (!data || typeof data !== 'object') return 'Xatolik yuz berdi';
  if (data.detail) return data.detail;
  const key = Object.keys(data)[0];
  const value = data[key];
  return Array.isArray(value) ? value[0] : String(value);
}

const phoneInput = document.getElementById('phone_number');
if (phoneInput) {
  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });
  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value) phoneInput.value = '+998 (';
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value === '+998 (') phoneInput.value = '';
  });
}

// ---------- REGISTER ----------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const phone = phoneInput.value;
    const password = registerForm.password.value;
    const confirmPassword = registerForm.confirm_password.value;

    if (!isPhoneComplete(phone)) {
      setError('registerError', "Telefon raqamni to'liq kiriting");
      return;
    }
    if (password.length < 6) {
      setError('registerError', "Parol kamida 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (password !== confirmPassword) {
      setError('registerError', 'Parollar bir xil emas');
      return;
    }

    setError('registerError', '');
    try {
      const res = await fetch(`${API_BASE}/users/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: normalizePhone(phone),
          password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError('registerError', firstError(data));
        return;
      }
      window.location.href = '/login/';
    } catch (err) {
      setError('registerError', "Server bilan bog'lanib bo'lmadi");
    }
  });
}

// ---------- LOGIN ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const phone = phoneInput.value;
    const password = loginForm.password.value;

    if (!isPhoneComplete(phone)) {
      setError('loginError', "Telefon raqamni to'liq kiriting");
      return;
    }
    if (!password) {
      setError('loginError', 'Parolni kiriting');
      return;
    }

    setError('loginError', '');
    try {
      const res = await fetch(`${API_BASE}/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: normalizePhone(phone), // Django'da username = telefon
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError('loginError', "Telefon yoki parol noto'g'ri");
        return;
      }
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);
      window.location.href = '/index/';
    } catch (err) {
      setError('loginError', "Server bilan bog'lanib bo'lmadi");
    }
  });
}


// ---------- HIMOYA: token bo'lmasa login sahifasiga ----------
if (document.body.dataset.protected === 'true') {
  if (!localStorage.getItem('access')) {
    window.location.href = '/login/';
  }
}

// ---------- CHIQISH ----------
document.addEventListener('click', e => {
  if (e.target.closest('#logoutBtn')) {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    window.location.href = '/login/';
  }
});