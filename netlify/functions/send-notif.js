/* ============================================
   GUEDIGITAL — Netlify Function: send-notif
   Kirim notifikasi WhatsApp via Fonnte
   ============================================ */

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { order } = body;
  if (!order?.contact) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'No contact provided' }) };
  }

  // Bersihkan nomor HP
  const hp = order.contact.replace(/[^0-9]/g, '');
  if (!hp || hp.length < 9) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Invalid phone number' }) };
  }

  // Buat pesan sesuai jenis produk
  const pesan = order.voucher_code
    ? `✅ *GUEDIGITAL — Order Sukses!*\n\n🎮 Produk: ${order.product_name}\n💎 Nominal: ${order.nominal_label}\n🎁 *Kode Voucher kamu:*\n\n\`${order.voucher_code}\`\n\n📋 Order ID: ${order.order_code}\n💰 Total: Rp${Number(order.total).toLocaleString('id-ID')}\n\nTerima kasih sudah belanja di GUEDIGITAL! 🙏`
    : `✅ *GUEDIGITAL — Pembayaran Diterima!*\n\n🎮 Produk: ${order.product_name}\n💎 Nominal: ${order.nominal_label}\n🆔 Target ID: ${order.target_id || '-'}\n📋 Order: ${order.order_code}\n💰 Total: Rp${Number(order.total).toLocaleString('id-ID')}\n\n⏳ Top up sedang diproses (1–3 menit).\nKamu akan mendapat konfirmasi segera setelah selesai.\n\nTerima kasih! 🙏`;

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': process.env.FONNTE_TOKEN },
      body: new URLSearchParams({ target: hp, message: pesan, countryCode: '62' })
    });

    const result = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, result })
    };
  } catch (err) {
    console.error('Fonnte error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Failed to send notification' }) };
  }
};
