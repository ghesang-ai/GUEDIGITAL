/* ============================================
   GUEDIGITAL — Riwayat Order
   ============================================ */

let _historyFilter = 'all';

// Load riwayat order dari Supabase atau localStorage (guest)
async function loadHistoryPage() {
  const list = document.getElementById('history-list');
  if (!list) return;

  list.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding:0 16px">
    ${renderSkeletons(4, 'strip')}
  </div>`;

  try {
    if (!AppState.currentUser) {
      // Mode guest: ambil dari localStorage
      const localOrders = getStorage('guest_orders') || [];
      const filtered = filterOrders(localOrders, _historyFilter);
      list.innerHTML = filtered.length
        ? filtered.map(renderOrderCard).join('')
        : renderEmptyHistory();
      return;
    }

    // User login: ambil dari Supabase
    let query = _sb
      .from('orders')
      .select('*')
      .eq('user_id', AppState.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: orders, error } = await query;
    if (error) throw error;

    const filtered = filterOrders(orders, _historyFilter);
    list.innerHTML = filtered.length
      ? filtered.map(renderOrderCard).join('')
      : renderEmptyHistory();

  } catch (err) {
    console.error('loadHistoryPage error:', err);
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <p style="color:var(--muted)">Gagal memuat riwayat. Coba refresh.</p>
      <button class="btn btn-ghost" onclick="loadHistoryPage()" style="margin-top:12px">Coba Lagi</button>
    </div>`;
  }
}

// Filter array orders berdasarkan status
function filterOrders(orders, filter) {
  if (filter === 'all') return orders;
  return orders.filter(o => {
    const status = o.payment_status || o.fulfillment_status;
    if (filter === 'success') return ['paid', 'success'].includes(status);
    if (filter === 'pending') return ['pending', 'processing'].includes(status);
    if (filter === 'failed') return ['failed', 'expired'].includes(status);
    return true;
  });
}

// Template card order untuk history list
function renderOrderCard(order) {
  const statusConfig = {
    paid:       { cls: 'status-success', label: 'Sukses' },
    success:    { cls: 'status-success', label: 'Sukses' },
    pending:    { cls: 'status-pending', label: 'Pending' },
    processing: { cls: 'status-pending', label: 'Diproses' },
    failed:     { cls: 'status-fail',    label: 'Gagal' },
    expired:    { cls: 'status-fail',    label: 'Kadaluarsa' }
  };

  const status = order.fulfillment_status || order.payment_status || 'pending';
  const sc = statusConfig[status] || { cls: 'status-pending', label: 'Pending' };

  return `
    <div class="order-card-item animate-fade">
      <div class="order-top">
        <div class="order-icon">${order.product_icon || '🎮'}</div>
        <div class="order-info">
          <h4>${escapeHtml(order.product_name || '-')}</h4>
          <p>${escapeHtml(order.nominal_label || '-')} · ${formatTanggalSingkat(order.created_at)}</p>
        </div>
        <div class="order-status ${sc.cls}">
          ${sc.label}
        </div>
      </div>
      <div class="order-bottom">
        <div class="amount">${formatRupiah(order.total || 0)}</div>
        <div class="repeat" onclick="bukaDetailProduk(${order.product_id})" role="button">
          Top Up Lagi →
        </div>
      </div>
    </div>`;
}

// Empty state jika tidak ada order
function renderEmptyHistory() {
  return `<div class="empty-state">
    <div class="empty-state-icon">📋</div>
    <h3>Belum ada order</h3>
    <p>Mulai top up game favoritmu sekarang!</p>
    <button class="btn btn-primary" onclick="navigate('#home')">Lihat Produk</button>
  </div>`;
}

// Filter handler dari tab chips
function filterHistoryBy(status) {
  _historyFilter = status;

  // Update active chip
  document.querySelectorAll('.filter-chip[data-status]').forEach(c => {
    c.classList.toggle('active', c.dataset.status === status);
  });

  loadHistoryPage();
}
