/* ============================================
   GUEDIGITAL — App Router & Initialization
   ============================================ */

// Inisialisasi Supabase Client menggunakan config yang diinject server
const { createClient } = supabase;
const _sb = createClient(
  window.__CONFIG__?.SUPABASE_URL || '',
  window.__CONFIG__?.SUPABASE_ANON_KEY || ''
);

// State global app
const AppState = {
  currentPage: 'home',
  currentUser: null,
  userProfile: null,
  selectedProduct: null,
  selectedNominal: null,
  orderData: {},
  qrisTimer: null
};

// Mapping hash URL ke nama page
const Routes = {
  '': 'home',
  '#home': 'home',
  '#detail': 'detail',
  '#checkout': 'checkout',
  '#payment': 'payment',
  '#success': 'success',
  '#history': 'history',
  '#account': 'account',
  '#login': 'login'
};

// Halaman yang menyembunyikan bottom nav
const HIDDEN_NAV_PAGES = ['detail', 'checkout', 'payment', 'success', 'login'];

// Navigasi ke halaman berdasarkan hash
function navigate(hash) {
  const pageName = Routes[hash] || 'home';

  // Sembunyikan semua page
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active', 'animate-fade');
  });

  // Tampilkan page target
  const targetPage = document.getElementById('page-' + pageName);
  if (targetPage) {
    targetPage.classList.add('active');
    requestAnimationFrame(() => targetPage.classList.add('animate-fade'));
  }

  // Kelola bottom nav visibility
  const bottomNav = document.getElementById('bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = HIDDEN_NAV_PAGES.includes(pageName) ? 'none' : 'flex';
  }

  // Update active state bottom nav
  document.querySelectorAll('.bn-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  AppState.currentPage = pageName;
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Lifecycle hooks per page
  const pageHooks = {
    history: loadHistoryPage,
    account: loadAccountPage
  };
  if (pageHooks[pageName]) pageHooks[pageName]();
}

// Init saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthState();
  navigate(window.location.hash || '#home');
  await loadHomeProducts();
  initBottomNav();
  initSearchBar();
  initCategoryChips();
  initHeroDots();
});

window.addEventListener('hashchange', () => navigate(window.location.hash));

// Inisialisasi bottom navigation
function initBottomNav() {
  document.querySelectorAll('.bn-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) {
        window.location.hash = '#' + page;
      }
    });
  });
}

// Inisialisasi search bar dengan debounce
function initSearchBar() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  const handleSearch = debounce(async (q) => {
    if (q.length < 2) {
      await loadHomeProducts();
      return;
    }
    cariProduk(q);
  }, 400);

  searchInput.addEventListener('input', (e) => handleSearch(e.target.value.trim()));
}

// Cari produk dari Supabase
async function cariProduk(keyword) {
  const gameGrid = document.getElementById('grid-game');
  const giftGrid = document.getElementById('grid-gift');
  const featList = document.getElementById('list-featured');

  try {
    const { data: produk } = await _sb
      .from('products')
      .select('*, nominals(*)')
      .eq('is_active', true)
      .ilike('name', `%${keyword}%`)
      .order('sort_order');

    if (gameGrid) gameGrid.innerHTML = produk.map(renderProductCard).join('') || '<p style="color:var(--muted);padding:16px;font-size:14px">Tidak ada hasil.</p>';
    if (giftGrid) giftGrid.innerHTML = '';
    if (featList) featList.innerHTML = '';
  } catch {
    // Abaikan error saat search
  }
}

// Inisialisasi category chips filter
function initCategoryChips() {
  document.querySelectorAll('.chip[data-cat]').forEach(chip => {
    chip.addEventListener('click', async () => {
      document.querySelectorAll('.chip[data-cat]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.dataset.cat;
      await filterProduk(cat);
    });
  });
}

// Filter produk berdasarkan kategori
async function filterProduk(kategori) {
  const gameGrid = document.getElementById('grid-game');
  const giftGrid = document.getElementById('grid-gift');
  const featList = document.getElementById('list-featured');
  const sectionGame = document.getElementById('section-game');
  const sectionGift = document.getElementById('section-gift');
  const sectionFeat = document.getElementById('section-feat');

  if (gameGrid) gameGrid.innerHTML = renderSkeletons(4);

  try {
    let query = _sb.from('products').select('*, nominals(*)').eq('is_active', true).order('sort_order');
    if (kategori !== 'all') query = query.eq('category', kategori);

    const { data: produk } = await query;

    const games = produk.filter(p => p.category === 'game');
    const gifts = produk.filter(p => p.category === 'gift_card');
    const consoles = produk.filter(p => p.category === 'console');

    if (gameGrid) gameGrid.innerHTML = games.map(renderProductCard).join('') || '';
    if (giftGrid) giftGrid.innerHTML = gifts.map(renderProductCard).join('') || '';
    if (featList) featList.innerHTML = consoles.map(renderFeaturedStrip).join('') || '';

    // Toggle section visibility
    if (sectionGame) sectionGame.style.display = games.length ? 'block' : 'none';
    if (sectionGift) sectionGift.style.display = gifts.length ? 'block' : 'none';
    if (sectionFeat) sectionFeat.style.display = consoles.length ? 'block' : 'none';

  } catch {
    showToast('Gagal memfilter produk.', 'error');
  }
}

// Animasi hero dots
function initHeroDots() {
  const dots = document.querySelectorAll('.hero-dot');
  if (!dots.length) return;

  let current = 0;
  setInterval(() => {
    dots[current].classList.remove('active');
    current = (current + 1) % dots.length;
    dots[current].classList.add('active');
  }, 3000);
}
