/* ============================================
   GUEDIGITAL — Products: Fetch & Render
   ============================================ */

// Load dan render semua produk di homepage
async function loadHomeProducts() {
  const gameGrid = document.getElementById('grid-game');
  const giftGrid = document.getElementById('grid-gift');
  const featList = document.getElementById('list-featured');

  if (gameGrid) gameGrid.innerHTML = renderSkeletons(4);
  if (giftGrid) giftGrid.innerHTML = renderSkeletons(2);
  if (featList) featList.innerHTML = renderSkeletons(2, 'strip');

  try {
    const { data: produk, error } = await _sb
      .from('products')
      .select('*, nominals(*)')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    const games = produk.filter(p => p.category === 'game');
    const gifts = produk.filter(p => p.category === 'gift_card');
    const consoles = produk.filter(p => p.category === 'console');

    if (gameGrid) {
      gameGrid.innerHTML = games.length
        ? games.map(renderProductCard).join('')
        : '<p style="color:var(--muted);font-size:14px;padding:16px">Belum ada produk game.</p>';
    }

    if (giftGrid) {
      giftGrid.innerHTML = gifts.length
        ? gifts.map(renderProductCard).join('')
        : '<p style="color:var(--muted);font-size:14px;padding:16px">Belum ada gift card.</p>';
    }

    if (featList) {
      featList.innerHTML = consoles.length
        ? consoles.map(renderFeaturedStrip).join('')
        : '';
    }

  } catch (err) {
    console.error('loadHomeProducts error:', err);
    showToast('Gagal memuat produk. Coba refresh halaman.', 'error');
    if (gameGrid) gameGrid.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:16px">Gagal memuat. Refresh halaman.</p>';
  }
}

// Template card produk (2-column grid)
function renderProductCard(p) {
  const nominals = p.nominals || [];
  const minHarga = nominals.length
    ? formatRupiah(Math.min(...nominals.map(n => n.price)))
    : '-';

  const imgContent = p.image_url
    ? `<img src="${p.image_url}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:16px 16px 0 0;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';

  return `
    <div class="pcard animate-fade" onclick="bukaDetailProduk(${p.id})"
         role="button" tabindex="0" aria-label="Top up ${escapeHtml(p.name)}">
      <div class="pcard-img" style="${p.image_url ? 'font-size:0;' : ''}">
        <span class="pbadge hot">HOT</span>
        ${imgContent}
        <span style="${p.image_url ? 'display:none;' : ''}">${p.icon || '🎮'}</span>
      </div>
      <h4>${escapeHtml(p.name)}</h4>
      <small>${escapeHtml(p.description || '')}</small>
      <div class="price">Mulai ${minHarga}</div>
    </div>`;
}

// Template strip featured (full width) untuk console/PC
function renderFeaturedStrip(p) {
  const nominals = p.nominals || [];
  const minHarga = nominals.length
    ? formatRupiah(Math.min(...nominals.map(n => n.price)))
    : '-';

  return `
    <div class="featured-strip animate-fade" onclick="bukaDetailProduk(${p.id})"
         role="button" tabindex="0" aria-label="Top up ${escapeHtml(p.name)}">
      <div class="feat-icon" style="${p.image_url ? 'padding:0;overflow:hidden;' : ''}">
        ${p.image_url
          ? `<img src="${p.image_url}" alt="${escapeHtml(p.name)}" style="width:52px;height:52px;object-fit:cover;border-radius:12px;">`
          : (p.icon || '🎮')}
      </div>
      <div class="feat-info">
        <h4>${escapeHtml(p.name)}</h4>
        <p>${escapeHtml(p.description || '')}</p>
        <div class="price">Mulai ${minHarga}</div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="#b4c0d2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </div>`;
}

// Buka halaman detail produk
async function bukaDetailProduk(productId) {
  showLoading();
  try {
    const { data: p, error } = await _sb
      .from('products')
      .select('*, nominals(*)')
      .eq('id', productId)
      .single();

    if (error) throw error;

    AppState.selectedProduct = p;
    AppState.selectedNominal = null;
    renderDetailPage(p);
    window.location.hash = '#detail';
  } catch {
    showToast('Gagal memuat detail produk. Coba lagi.', 'error');
  } finally {
    hideLoading();
  }
}

// Render konten halaman detail produk
function renderDetailPage(p) {
  const setEl = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };
  const setHTML = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.innerHTML = val;
  };

  setEl('det-icon', p.icon || '🎮');
  setEl('det-name', p.name);
  setEl('det-sub', p.description || '');
  setEl('sum-product', p.name);
  setEl('sum-nominal', 'Belum dipilih');
  setEl('sum-price', '—');
  setEl('sum-total', '—');

  // Tampilkan/sembunyikan field kondisional
  const serverField = document.getElementById('server-field');
  const uidField = document.getElementById('uid-field');
  if (serverField) serverField.style.display = p.needs_server ? 'block' : 'none';
  if (uidField) uidField.style.display = p.needs_user_id ? 'block' : 'none';

  // Render grid nominal
  const sorted = [...(p.nominals || [])].sort((a, b) => a.sort_order - b.sort_order);
  const grid = document.getElementById('nominal-grid');
  if (grid) {
    grid.innerHTML = sorted.map((n, i) => `
      <div class="nom-card ${i === 0 ? 'selected' : ''}"
           onclick="pilihNominal(this, ${i})"
           data-idx="${i}"
           data-id="${n.id}">
        <div class="nom-val">${escapeHtml(n.label)}</div>
        <div class="nom-price">${formatRupiah(n.price)}</div>
        ${n.save_label ? `<div class="nom-save">${escapeHtml(n.save_label)}</div>` : ''}
      </div>`).join('');

    // Simpan nominals di dataset untuk akses mudah
    grid.dataset.nominals = JSON.stringify(sorted);

    // Auto-pilih nominal pertama
    if (sorted.length > 0) {
      const firstCard = grid.querySelector('.nom-card');
      if (firstCard) pilihNominal(firstCard, 0);
    }
  }
}

// Pilih nominal — el adalah DOM element, idx adalah index
function pilihNominal(el, idx) {
  const grid = document.getElementById('nominal-grid');
  const nominals = grid?.dataset.nominals ? JSON.parse(grid.dataset.nominals) : [];
  const nominal = nominals[idx];

  if (!nominal) return;

  document.querySelectorAll('.nom-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  AppState.selectedNominal = nominal;

  const adminFee = 1000;
  document.getElementById('sum-nominal')?.textContent !== undefined &&
    (document.getElementById('sum-nominal').textContent = nominal.label);
  document.getElementById('sum-price')?.textContent !== undefined &&
    (document.getElementById('sum-price').textContent = formatRupiah(nominal.price));
  document.getElementById('sum-admin')?.textContent !== undefined &&
    (document.getElementById('sum-admin').textContent = formatRupiah(adminFee));
  document.getElementById('sum-total')?.textContent !== undefined &&
    (document.getElementById('sum-total').textContent = formatRupiah(nominal.price + adminFee));

  // Update CTA bar total
  const ctaTotal = document.getElementById('cta-total');
  if (ctaTotal) ctaTotal.textContent = formatRupiah(nominal.price + adminFee);
}
