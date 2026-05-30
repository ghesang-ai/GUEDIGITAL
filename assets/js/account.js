/* ============================================
   GUEDIGITAL — Account & Profile
   ============================================ */

// Load data akun pengguna
async function loadAccountPage() {
  if (!AppState.currentUser) {
    renderGuestAccount();
    return;
  }

  // Refresh profil dari DB
  await loadUserProfile(AppState.currentUser.id);
  const p = AppState.userProfile;
  if (!p) return;

  const setEl = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };

  setEl('acc-name', p.name || 'Pengguna');
  setEl('acc-email', p.email || '-');
  setEl('acc-phone', p.phone || 'Belum ditambahkan');
  setEl('acc-balance', formatRupiah(p.balance || 0));

  // Avatar inisial dari nama
  const avatar = document.getElementById('acc-avatar');
  if (avatar && p.name) {
    avatar.textContent = p.name.charAt(0).toUpperCase();
  }

  // Tampilkan menu akun
  const accBody = document.getElementById('account-body');
  if (accBody) accBody.style.display = 'block';
  const guestBody = document.getElementById('guest-body');
  if (guestBody) guestBody.style.display = 'none';
}

// Tampilkan UI untuk pengguna yang belum login
function renderGuestAccount() {
  const accBody = document.getElementById('account-body');
  const guestBody = document.getElementById('guest-body');
  if (accBody) accBody.style.display = 'none';
  if (guestBody) guestBody.style.display = 'block';
}

// Buka form edit profil
async function simpanProfil(e) {
  e.preventDefault();

  const nama = document.getElementById('edit-nama')?.value?.trim();
  const phone = document.getElementById('edit-phone')?.value?.trim();

  if (!nama) {
    showToast('Nama tidak boleh kosong.', 'error');
    return;
  }

  showLoading();
  try {
    const { error } = await _sb
      .from('profiles')
      .update({ name: nama, phone: phone || null })
      .eq('id', AppState.currentUser.id);

    if (error) throw error;

    AppState.userProfile = { ...AppState.userProfile, name: nama, phone };
    updateAuthUI(true);
    showToast('Profil berhasil diperbarui!', 'success');
    loadAccountPage();
  } catch {
    showToast('Gagal menyimpan profil. Coba lagi.', 'error');
  } finally {
    hideLoading();
  }
}

// Ganti password
async function gantiPassword(e) {
  e.preventDefault();

  const passLama = document.getElementById('pass-lama')?.value;
  const passBaru = document.getElementById('pass-baru')?.value;
  const passKonfirm = document.getElementById('pass-konfirm')?.value;

  if (!passLama || !passBaru) {
    showToast('Isi semua field password.', 'error');
    return;
  }
  if (passBaru.length < 6) {
    showToast('Password baru minimal 6 karakter.', 'error');
    return;
  }
  if (passBaru !== passKonfirm) {
    showToast('Konfirmasi password tidak cocok.', 'error');
    return;
  }

  showLoading();
  try {
    const { error } = await _sb.auth.updateUser({ password: passBaru });
    if (error) throw error;
    showToast('Password berhasil diubah!', 'success');
  } catch {
    showToast('Gagal mengubah password. Coba logout lalu login ulang.', 'error');
  } finally {
    hideLoading();
  }
}
