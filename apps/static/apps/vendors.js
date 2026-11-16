// Vendorlar sahifasi — /api/v1/vendors/ bilan ishlaydi

const VENDORS_API = '/api/v1/vendors/';
const CATEGORY_ICON = { venue: '🏛', photo: '📸', decor: '💐', bridal: '👗', music: '🎵', catering: '🍽' };
const CATEGORY_LABEL = {
  venue: "To'yxona", photo: 'Fotograf va video', decor: 'Dekorator',
  bridal: 'Kelinlik salon', music: 'Musiqachilar', catering: 'Oshxona xizmati',
};

let vendors = [];
let activeCategory = 'all';

const vid = id => document.getElementById(id);

async function vendorApi(url = '') {
  const token = localStorage.getItem('access');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(VENDORS_API + url, { headers });

  if (res.status === 401) {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.href = '/login/';
    throw new Error('Sessiya tugagan, qayta kiring');
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) throw new Error(`Server xatosi: ${res.status}`);
  return data;
}

function fmtNum(n) {
  return Number(n).toLocaleString('en-US').replace(/,/g, ' ');
}

function priceText(v) {
  if (v.price_min == null && v.price_max == null) return "Narx so'ralsin";
  if (v.price_max == null) return `${fmtNum(v.price_min)} so'mdan`;
  if (v.price_min == null) return `${fmtNum(v.price_max)} so'mgacha`;
  return `${fmtNum(v.price_min)} – ${fmtNum(v.price_max)} so'm`;
}

// Narx filtri: "lo-hi" formatida, hi bo'sh bo'lsa cheksiz
function priceMatch(v, range) {
  if (!range) return true;
  const [lo, hi] = range.split('-').map(x => (x === '' ? null : Number(x)));
  const vMin = v.price_min ?? 0;
  const vMax = v.price_max ?? vMin;
  if (hi !== null && vMin > hi) return false;
  if (lo !== null && vMax < lo) return false;
  return true;
}

function filteredVendors() {
  const q = vid('vendorSearch').value.trim().toLowerCase();
  const price = vid('priceFilter').value;

  return vendors.filter(v =>
    (activeCategory === 'all' || v.category === activeCategory) &&
    (!q || v.name.toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q)) &&
    priceMatch(v, price)
  );
}

function cardHtml(v) {
  const cover = v.cover_image
    ? `<img class="vendor-cover" src="${esc(v.cover_image)}" alt="${esc(v.name)}">`
    : `<div class="vendor-cover vendor-cover-empty">${CATEGORY_ICON[v.category] || '🏛'}</div>`;

  const phone = v.phone_number
    ? `<a class="btn btn-sm" href="tel:${esc(v.phone_number)}">Qo'ng'iroq</a>` : '';
  const insta = v.instagram_url
    ? `<a class="btn btn-sm" href="${esc(v.instagram_url)}" target="_blank" rel="noopener">Instagram</a>` : '';

  return `
    <div class="card vendor">
      ${cover}
      <div class="vendor-name">${esc(v.name)}</div>
      <div class="muted">${esc(CATEGORY_LABEL[v.category] || v.category)}${v.city ? ' · ' + esc(v.city) : ''}</div>
      <div class="vendor-meta">
        <span class="badge amber">★ ${Number(v.rating || 0).toFixed(1)}</span>
        <span class="badge">${esc(priceText(v))}</span>
      </div>
      ${v.description ? `<p class="muted vendor-desc">${esc(v.description)}</p>` : ''}
      <div class="vendor-actions">${phone}${insta}</div>
    </div>`;
}

function render() {
  const list = filteredVendors();
  vid('vendorGrid').innerHTML = list.map(cardHtml).join('');
  vid('vendorEmpty').style.display = list.length ? 'none' : 'block';
}

async function loadVendors() {
  try {
    vendors = await vendorApi('');
    render();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- Hodisalar ----------
vid('categoryTabs').querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    vid('categoryTabs').querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    render();
  });
});

vid('vendorSearch').addEventListener('input', render);
vid('priceFilter').addEventListener('change', render);

loadVendors();