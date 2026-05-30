/* ============================================
   GUEDIGITAL — Order Flow & Validasi
   ============================================ */

// Validasi input dan lanjut ke halaman checkout
function lanjutCheckout() {
  const p = AppState.selectedProduct;
  const n = AppState.selectedNominal;

  if (!n) {
    showToast('Pilih nominal terlebih dahulu.', 'error');
    return;
  }

  const uid = document.getElementById('uid-input')?.value?.trim();
  const server = document.getElementById('server-select')?.value;
  const kontak = document.getElementById('kontak-input')?.value?.trim();

  if (p.needs_user_id && !uid) {
    showToast('Masukkan User ID kamu terlebih dahulu.', 'error');
    document.getElementById('uid-input')?.focus();
    return;
  }

  if (kontak && !validasiHP(kontak) && !validasiEmail(kontak)) {
    showToast('Format nomor WA atau email tidak valid.', 'error');
    document.getElementById('kontak-input')?.focus();
    return;
  }

  const adminFee = 1000;
  AppState.orderData = {
    productId: p.id,
    nominalId: n.id,
    productName: p.name,
    nominalLabel: n.label,
    targetId: uid || null,
    targetServer: (p.needs_server && server) ? server : null,
    contact: kontak || null,
    price: n.price,
    adminFee,
    total: n.price + adminFee,
    productIcon: p.icon || '🎮'
  };

  renderCheckoutPage();
  window.location.hash = '#checkout';
}

// Render konten halaman checkout
function renderCheckoutPage() {
  const od = AppState.orderData;
  const p = AppState.selectedProduct;

  const setEl = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  setEl('co-icon', p.icon || '🎮');
  setEl('co-name', od.productName);
  setEl('co-nominal', od.nominalLabel);
  setEl('co2-name', od.productName);
  setEl('co2-nominal', od.nominalLabel);
  setEl('co2-uid', od.targetId || '-');
  setEl('co2-server', od.targetServer || '-');
  setEl('co2-price', formatRupiah(od.price));
  setEl('co2-admin', formatRupiah(od.adminFee));
  setEl('co2-total', formatRupiah(od.total));

  // Sembunyikan baris server jika tidak relevan
  const serverRow = document.getElementById('co2-server-row');
  if (serverRow) serverRow.style.display = od.targetServer ? 'flex' : 'none';

  const uidRow = document.getElementById('co2-uid-row');
  if (uidRow) uidRow.style.display = od.targetId ? 'flex' : 'none';

  // Reset ke pilihan pembayaran default (QRIS)
  initPaymentItems();
}

// Inisialisasi payment items — pilih QRIS sebagai default
function initPaymentItems() {
  const items = document.querySelectorAll('.pay-item');
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === 0);
    item.addEventListener('click', () => {
      items.forEach(it => it.classList.remove('selected'));
      item.classList.add('selected');
      AppState.orderData.paymentMethod = item.dataset.method;
    });
  });

  // Set default method
  if (items[0]) AppState.orderData.paymentMethod = items[0].dataset.method || 'qris';
}

// Proses checkout — panggil Netlify Function create-order
async function prosesCheckout() {
  const payEl = document.querySelector('.pay-item.selected');
  const method = payEl?.dataset?.method || 'qris';
  AppState.orderData.paymentMethod = method;

  showLoading();
  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...AppState.orderData,
        userId: AppState.currentUser?.id || null
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Server error. Coba lagi.');
    }

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Gagal membuat order.');

    AppState.orderData.orderId = result.orderId;
    AppState.orderData.orderCode = result.orderCode;
    AppState.orderData.snapToken = result.snapToken;

    // Buka Midtrans Snap payment popup
    if (window.snap) {
      window.snap.pay(result.snapToken, {
        onSuccess: (r) => handlePaymentResult('success', r),
        onPending: (r) => handlePaymentResult('pending', r),
        onError: (r) => handlePaymentResult('error', r),
        onClose: () => showToast('Pembayaran dibatalkan.', 'info')
      });
    } else {
      throw new Error('Modul pembayaran belum siap. Refresh halaman.');
    }

  } catch (err) {
    showToast(err.message || 'Gagal memproses pesanan.', 'error');
  } finally {
    hideLoading();
  }
}

// Handle hasil pembayaran dari Midtrans Snap callback
function handlePaymentResult(status, result) {
  if (status === 'success') {
    AppState.orderData.transactionId = result.transaction_id;
    AppState.orderData.paymentMethod = result.payment_type || AppState.orderData.paymentMethod;
    renderSuccessPage();
    window.location.hash = '#success';
  } else if (status === 'pending') {
    window.location.hash = '#payment';
    startQrisTimer();
  } else {
    const pesan = result?.status_message || 'Pembayaran gagal. Silakan coba lagi.';
    showToast('Gagal: ' + pesan, 'error');
  }
}

// Simpan order ke localStorage untuk guest (cadangan)
function simpanOrderGuest(orderData) {
  const existing = getStorage('guest_orders') || [];
  existing.unshift({
    ...orderData,
    created_at: new Date().toISOString()
  });
  // Simpan max 20 order terakhir
  setStorage('guest_orders', existing.slice(0, 20));
}
