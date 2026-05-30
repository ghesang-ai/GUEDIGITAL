/* ============================================
   GUEDIGITAL — Payment & Success Page
   ============================================ */

// Countdown timer untuk halaman payment QRIS
function startQrisTimer(durasiMenit = 15) {
  if (AppState.qrisTimer) clearInterval(AppState.qrisTimer);
  let sisa = durasiMenit * 60;

  const timerEl = document.getElementById('pay-timer');
  const progressEl = document.getElementById('pay-progress');

  const tick = () => {
    const m = Math.floor(sisa / 60);
    const s = sisa % 60;

    if (timerEl) {
      timerEl.textContent = `⏱ Berlaku: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      timerEl.style.color = sisa <= 60 ? 'var(--red)' : sisa <= 300 ? 'var(--orange)' : 'var(--cyan)';
    }

    // Update progress bar
    if (progressEl) {
      const pct = (sisa / (durasiMenit * 60)) * 100;
      progressEl.style.width = pct + '%';
      progressEl.style.background = sisa <= 60 ? 'var(--red)' : sisa <= 300 ? 'var(--orange)' : 'var(--cyan)';
    }

    if (sisa <= 0) {
      clearInterval(AppState.qrisTimer);
      if (timerEl) timerEl.textContent = '⚠️ Waktu habis — QR kadaluarsa';
      showToast('Waktu pembayaran habis. Silakan ulangi order.', 'error');
    }
    sisa--;
  };

  tick();
  AppState.qrisTimer = setInterval(tick, 1000);
}

// Hentikan timer
function stopQrisTimer() {
  if (AppState.qrisTimer) {
    clearInterval(AppState.qrisTimer);
    AppState.qrisTimer = null;
  }
}

// Render konten halaman sukses
function renderSuccessPage() {
  const od = AppState.orderData;

  const setEl = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  setEl('suc-ordercode', od.orderCode || '-');
  setEl('suc-prod', od.productName || '-');
  setEl('suc-nom', od.nominalLabel || '-');
  setEl('suc-uid', od.targetId || '-');
  setEl('suc-total', formatRupiah(od.total || 0));
  setEl('suc-method', formatMetodeBayar(od.paymentMethod));
  setEl('suc-time', formatTanggal(new Date().toISOString()));

  // Tampilkan/sembunyikan elemen voucher code
  const voucherSection = document.getElementById('suc-voucher-section');
  const voucherCode = document.getElementById('suc-voucher-code');
  if (voucherSection && voucherCode) {
    if (od.voucherCode) {
      voucherSection.style.display = 'block';
      voucherCode.textContent = od.voucherCode;
    } else {
      voucherSection.style.display = 'none';
    }
  }

  // Tampilkan/sembunyikan baris UID
  const uidRow = document.getElementById('suc-uid-row');
  if (uidRow) uidRow.style.display = od.targetId ? 'flex' : 'none';

  // Stop timer jika masih berjalan
  stopQrisTimer();

  // Simpan di localStorage untuk guest
  if (!AppState.currentUser) {
    simpanOrderGuest({
      order_code: od.orderCode,
      product_name: od.productName,
      nominal_label: od.nominalLabel,
      product_id: od.productId,
      total: od.total,
      payment_status: 'paid',
      fulfillment_status: 'processing'
    });
  }
}

// Format nama metode pembayaran ke label yang ramah
function formatMetodeBayar(method) {
  const map = {
    qris: 'QRIS',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    ovo: 'OVO',
    dana: 'DANA',
    bank_transfer: 'Transfer Bank',
    bca_va: 'BCA Virtual Account',
    bni_va: 'BNI Virtual Account',
    mandiri_va: 'Mandiri Virtual Account',
    credit_card: 'Kartu Kredit'
  };
  return map[method?.toLowerCase()] || (method?.toUpperCase() || 'QRIS');
}

// Render halaman payment — tampilkan info order yang sedang pending
function renderPaymentPage() {
  const od = AppState.orderData;

  const setEl = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  setEl('pay-amount', formatRupiah(od.total || 0));
  setEl('pay-product', `${od.productName} — ${od.nominalLabel}`);
  setEl('pay-ordercode', od.orderCode || '-');

  // Mulai countdown
  startQrisTimer(15);
}
