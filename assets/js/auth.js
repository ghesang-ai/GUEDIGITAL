/* ============================================
   GUEDIGITAL — Auth: Login, Register, Logout
   ============================================ */

// Cek status sesi aktif Supabase
async function checkAuthState() {
  const { data: { session } } = await _sb.auth.getSession();
  if (session?.user) {
    AppState.currentUser = session.user;
    await loadUserProfile(session.user.id);
    updateAuthUI(true);
  } else {
    updateAuthUI(false);
  }

  // Pantau perubahan auth secara realtime
  _sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      AppState.currentUser = session.user;
      await loadUserProfile(session.user.id);
      updateAuthUI(true);
    } else if (event === 'SIGNED_OUT') {
      AppState.currentUser = null;
      AppState.userProfile = null;
      updateAuthUI(false);
    }
  });
}

// Update tampilan UI berdasarkan status login
function updateAuthUI(isLoggedIn) {
  const loginBtn = document.getElementById('btn-login-nav');
  const userChip = document.getElementById('user-chip-nav');
  const userInitial = document.getElementById('nav-user-initial');
  const userName = document.getElementById('nav-user-name');

  if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'flex';
  if (userChip) userChip.style.display = isLoggedIn ? 'flex' : 'none';

  if (isLoggedIn && AppState.userProfile) {
    const nama = AppState.userProfile.name || 'User';
    if (userInitial) userInitial.textContent = nama.charAt(0).toUpperCase();
    if (userName) userName.textContent = nama.split(' ')[0];
  }
}

// Daftar akun baru
async function register(nama, email, password, noHP) {
  if (!nama || !email || !password) {
    showToast('Lengkapi semua data yang diperlukan.', 'error');
    return;
  }
  if (!validasiEmail(email)) {
    showToast('Format email tidak valid.', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password minimal 6 karakter.', 'error');
    return;
  }

  showLoading();
  try {
    const { data, error } = await _sb.auth.signUp({ email, password });
    if (error) throw error;

    await _sb.from('profiles').insert({
      id: data.user.id,
      name: nama,
      email,
      phone: noHP || null
    });

    showToast('Daftar berhasil! Silakan login.', 'success');
    tampilkanTabLogin();
  } catch (err) {
    const pesan = err.message?.includes('already registered')
      ? 'Email ini sudah terdaftar. Silakan login.'
      : 'Gagal mendaftar. Coba lagi.';
    showToast(pesan, 'error');
  } finally {
    hideLoading();
  }
}

// Login dengan email dan password
async function login(email, password) {
  if (!email || !password) {
    showToast('Masukkan email dan password.', 'error');
    return;
  }

  showLoading();
  try {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email atau password salah.');

    AppState.currentUser = data.user;
    await loadUserProfile(data.user.id);
    updateAuthUI(true);
    showToast(sapaPengguna(AppState.userProfile?.name?.split(' ')[0]), 'success');
    navigate('#home');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// Logout
async function logout() {
  const konfirmasi = confirm('Yakin ingin keluar dari akun?');
  if (!konfirmasi) return;

  await _sb.auth.signOut();
  AppState.currentUser = null;
  AppState.userProfile = null;
  updateAuthUI(false);
  showToast('Berhasil keluar. Sampai jumpa!', 'info');
  navigate('#home');
}

// Load profil user dari tabel profiles
async function loadUserProfile(userId) {
  const { data } = await _sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (data) AppState.userProfile = data;
}

// Toggle tab login/daftar di halaman login
function tampilkanTabLogin() {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
  document.getElementById('form-login')?.style.setProperty('display', 'block');
  document.getElementById('form-daftar')?.style.setProperty('display', 'none');
}

function tampilkanTabDaftar() {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.auth-tab[data-tab="daftar"]')?.classList.add('active');
  document.getElementById('form-login')?.style.setProperty('display', 'none');
  document.getElementById('form-daftar')?.style.setProperty('display', 'block');
}

// Handle submit form login
function handleFormLogin(e) {
  e.preventDefault();
  const email = document.getElementById('inp-email-login')?.value?.trim();
  const password = document.getElementById('inp-pass-login')?.value;
  login(email, password);
}

// Handle submit form daftar
function handleFormDaftar(e) {
  e.preventDefault();
  const nama = document.getElementById('inp-nama-daftar')?.value?.trim();
  const email = document.getElementById('inp-email-daftar')?.value?.trim();
  const password = document.getElementById('inp-pass-daftar')?.value;
  const hp = document.getElementById('inp-hp-daftar')?.value?.trim();
  register(nama, email, password, hp);
}
