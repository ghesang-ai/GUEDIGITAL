/* ============================================
   GUEDIGITAL — Utils / Helper Functions
   ============================================ */

// Format angka ke Rupiah: 19000 -> "Rp19.000"
function formatRupiah(angka) {
  return 'Rp' + Number(angka).toLocaleString('id-ID');
}

// Format tanggal Indonesia: "29 Oktober 2025, 20:37"
function formatTanggal(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Format tanggal singkat: "29 Okt 2025"
function formatTanggalSingkat(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// Generate kode order unik: GUE-20251029-A3X9
function generateOrderCode() {
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.random().toString(36).substring(2,6).toUpperCase();
  return `GUE-${date}-${rand}`;
}

// Tampilkan toast notification (muncul di atas, auto hilang 3 detik)
function showToast(pesan, tipe = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipe} animate-slide-up`;
  toast.textContent = pesan;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Tampilkan loading overlay
function showLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = 'grid';
}

// Sembunyikan loading overlay
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = 'none';
}

// localStorage wrapper dengan JSON parse/stringify
function setStorage(key, value) {
  try { localStorage.setItem('gd_' + key, JSON.stringify(value)); } catch(e) {}
}
function getStorage(key) {
  try { return JSON.parse(localStorage.getItem('gd_' + key)); } catch { return null; }
}
function removeStorage(key) { localStorage.removeItem('gd_' + key); }

// Validasi nomor HP Indonesia: 08xxx, 628xxx, +628xxx
function validasiHP(hp) {
  const bersih = hp.replace(/[\s\-+]/g, '');
  return /^(08|628)\d{8,11}$/.test(bersih);
}

// Validasi email sederhana
function validasiEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Debounce untuk search input
function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Salin teks ke clipboard dengan feedback visual
async function salinTeks(teks, feedbackEl = null) {
  try {
    await navigator.clipboard.writeText(teks);
    showToast('Tersalin ke clipboard!', 'success');
    if (feedbackEl) {
      const asli = feedbackEl.textContent;
      feedbackEl.textContent = 'Tersalin ✓';
      setTimeout(() => { feedbackEl.textContent = asli; }, 2000);
    }
  } catch {
    showToast('Gagal menyalin. Coba salin manual.', 'error');
  }
}

// Render skeleton loading cards
function renderSkeletons(jumlah = 4, tipe = 'card') {
  return Array(jumlah).fill(0).map(() =>
    `<div class="skeleton" style="height:${tipe === 'card' ? '160px' : '72px'};border-radius:18px"></div>`
  ).join('');
}

// Render skeleton grid 2 kolom
function renderSkeletonGrid(jumlah = 4) {
  return `<div class="product-grid">${renderSkeletons(jumlah, 'card')}</div>`;
}

// Escape HTML untuk mencegah XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format nomor HP ke format internasional
function formatHP(hp) {
  let clean = hp.replace(/[\s\-+]/g, '');
  if (clean.startsWith('08')) clean = '628' + clean.slice(1);
  return clean;
}

// Cek apakah user sedang di jam malam (untuk greeting)
function sapaPengguna(nama = '') {
  const jam = new Date().getHours();
  let sapa = jam < 12 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 19 ? 'Selamat sore' : 'Selamat malam';
  return nama ? `${sapa}, ${nama}! 👋` : sapa;
}
