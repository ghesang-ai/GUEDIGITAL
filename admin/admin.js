/* ============================================
   GUEDIGITAL — Admin Panel JS
   ============================================ */

// Inisialisasi Supabase menggunakan config inject
const { createClient: createAdminClient } = supabase;
const _sbAdmin = createAdminClient(
  window.__CONFIG__?.SUPABASE_URL || '',
  window.__CONFIG__?.SUPABASE_ANON_KEY || ''
);

// Cek apakah user adalah admin
async function checkAdminAuth() {
  const { data: { session } } = await _sbAdmin.auth.getSession();
  if (!session) {
    window.location.href = '/admin/login.html';
    return false;
  }

  // Cek is_admin dari tabel profiles
  const { data: profile } = await _sbAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  if (!isAdmin) {
    alert('Akses ditolak. Kamu bukan admin.');
    await _sbAdmin.auth.signOut();
    window.location.href = '/';
    return false;
  }

  return true;
}

// Format Rupiah
function fRp(angka) {
  return 'Rp' + Number(angka || 0).toLocaleString('id-ID');
}

// Format tanggal singkat
function fTgl(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Load statistik dashboard
async function loadDashboardStats() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [{ data: todayOrders }, { data: allOrders }, { count: pendingCount }] = await Promise.all([
      _sbAdmin.from('orders').select('total, payment_status').gte('created_at', today + 'T00:00:00'),
      _sbAdmin.from('orders').select('total, payment_status').order('created_at', { ascending: false }).limit(10),
      _sbAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('fulfillment_status', 'processing')
    ]);

    const sukses = (todayOrders || []).filter(o => o.payment_status === 'paid');
    const revenue = sukses.reduce((s, o) => s + o.total, 0);
    const pending = (todayOrders || []).filter(o => o.payment_status === 'pending').length;

    const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
    setEl('stat-orders', todayOrders?.length || 0);
    setEl('stat-revenue', fRp(revenue));
    setEl('stat-pending', pendingCount || 0);
    setEl('stat-total', allOrders?.length || 0);

    // Render tabel order terbaru
    const tbody = document.getElementById('recent-orders-body');
    if (tbody && allOrders) {
      tbody.innerHTML = allOrders.map(o => `
        <tr>
          <td><code style="font-size:11px;background:#f0f4f8;padding:2px 6px;border-radius:6px">${o.order_code || '-'}</code></td>
          <td>${o.product_name || '-'}</td>
          <td>${o.nominal_label || '-'}</td>
          <td>${fRp(o.total)}</td>
          <td><span class="status-badge ${o.payment_status}">${o.payment_status}</span></td>
          <td style="font-size:11px;color:#667085">${fTgl(o.created_at)}</td>
        </tr>`).join('');
    }
  } catch (err) {
    console.error('loadDashboardStats error:', err);
  }
}

// Load semua order untuk halaman orders
async function loadAllOrders(filters = {}) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#667085">Memuat...</td></tr>';

  try {
    let query = _sbAdmin.from('orders').select('*').order('created_at', { ascending: false }).limit(100);

    if (filters.status) query = query.eq('payment_status', filters.status);
    if (filters.search) query = query.ilike('order_code', `%${filters.search}%`);

    const { data: orders, error } = await query;
    if (error) throw error;

    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#667085">Tidak ada order.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><code style="font-size:11px;background:#f0f4f8;padding:3px 8px;border-radius:6px;cursor:pointer" onclick="navigator.clipboard.writeText('${o.order_code}')">${o.order_code}</code></td>
        <td>
          <div style="font-weight:700;font-size:13px">${escHtml(o.product_name)}</div>
          <div style="font-size:11px;color:#667085">${escHtml(o.nominal_label)}</div>
        </td>
        <td style="font-size:12px">${escHtml(o.target_id || '-')}</td>
        <td style="font-weight:700">${fRp(o.total)}</td>
        <td><span class="status-badge ${o.payment_status}">${o.payment_status}</span></td>
        <td><span class="status-badge ${o.fulfillment_status}">${o.fulfillment_status}</span></td>
        <td style="font-size:11px;color:#667085">${fTgl(o.created_at)}</td>
      </tr>`).join('');

  } catch (err) {
    console.error('loadAllOrders error:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--red)">Gagal memuat data.</td></tr>';
  }
}

// Load produk untuk admin
async function loadAdminProducts() {
  const list = document.getElementById('admin-products-list');
  if (!list) return;

  try {
    const { data: produk } = await _sbAdmin
      .from('products')
      .select('*, nominals(*)')
      .order('sort_order');

    if (!produk?.length) {
      list.innerHTML = '<p style="color:#667085;padding:16px">Belum ada produk.</p>';
      return;
    }

    list.innerHTML = produk.map(p => `
      <div class="admin-product-card" style="background:white;border:1.5px solid #e6ebf2;border-radius:16px;padding:16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:32px">${p.icon || '🎮'}</span>
            <div>
              <h3 style="font-size:15px;font-weight:900;margin-bottom:2px">${escHtml(p.name)}</h3>
              <span style="font-size:11px;background:#eef3fb;padding:2px 8px;border-radius:6px;font-weight:700;color:#3157ff">${p.category}</span>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:700">
            <input type="checkbox" ${p.is_active ? 'checked' : ''} onchange="toggleProdukAktif(${p.id}, this.checked)">
            Aktif
          </label>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${(p.nominals || []).sort((a,b) => a.sort_order - b.sort_order).map(n => `
            <div style="background:#f7f9fc;border-radius:10px;padding:10px;font-size:12px">
              <div style="font-weight:800;margin-bottom:2px">${escHtml(n.label)}</div>
              <div style="color:#3157ff;font-weight:700">${fRp(n.price)}</div>
              <div style="color:#667085;margin-top:4px">Stok: <span style="font-weight:700;color:${n.stock < 10 ? '#ff4d6d' : '#16c784'}">${n.stock}</span></div>
            </div>`).join('')}
        </div>
      </div>`).join('');

  } catch (err) {
    console.error('loadAdminProducts error:', err);
    list.innerHTML = '<p style="color:var(--red)">Gagal memuat produk.</p>';
  }
}

// Toggle aktif/nonaktif produk
async function toggleProdukAktif(productId, isActive) {
  const { error } = await _sbAdmin
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId);

  if (error) {
    alert('Gagal mengubah status produk.');
  } else {
    showAdminToast(isActive ? 'Produk diaktifkan' : 'Produk dinonaktifkan', 'success');
  }
}

// Tandai order sebagai sukses (manual fulfillment)
async function tandaiOrderSukses(orderId) {
  const { error } = await _sbAdmin
    .from('orders')
    .update({ fulfillment_status: 'success' })
    .eq('id', orderId);

  if (error) {
    alert('Gagal mengupdate order.');
  } else {
    showAdminToast('Order ditandai sukses', 'success');
    loadAllOrders();
  }
}

// Escape HTML sederhana
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Toast untuk admin
function showAdminToast(pesan, tipe = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;top:20px;right:20px;background:${tipe === 'success' ? '#16c784' : '#101828'};color:white;padding:12px 20px;border-radius:12px;font-weight:700;font-size:13px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.15)`;
  toast.textContent = pesan;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Init saat DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkAdminAuth();
  if (!ok) return;

  // Load konten sesuai halaman
  if (document.getElementById('stat-orders')) loadDashboardStats();
  if (document.getElementById('orders-tbody')) loadAllOrders();
  if (document.getElementById('admin-products-list')) loadAdminProducts();
});
