/* ============================================
   GUEDIGITAL — Netlify Function: payment-webhook
   Terima & verifikasi notifikasi pembayaran Midtrans
   ============================================ */

const { createClient } = require('@supabase/supabase-js');
const midtransClient = require('midtrans-client');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let notifBody;
  try {
    notifBody = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // 1. Verifikasi notifikasi asli dari Midtrans
  const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY
  });

  let status;
  try {
    status = await core.transaction.notification(notifBody);
  } catch (err) {
    console.error('Invalid Midtrans notification:', err);
    return { statusCode: 400, body: 'Invalid notification' };
  }

  const { order_id, transaction_status, fraud_status, transaction_id } = status;

  // 2. Tentukan status pembayaran
  let paymentStatus = 'pending';
  if (transaction_status === 'capture' && fraud_status === 'accept') {
    paymentStatus = 'paid';
  } else if (transaction_status === 'settlement') {
    paymentStatus = 'paid';
  } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
    paymentStatus = transaction_status === 'expire' ? 'expired' : 'failed';
  }

  // 3. Update order di Supabase
  const { data: order, error: updateErr } = await supabase
    .from('orders')
    .update({
      payment_status: paymentStatus,
      midtrans_transaction_id: transaction_id
    })
    .eq('midtrans_order_id', order_id)
    .select()
    .single();

  if (updateErr) {
    console.error('Update order error:', updateErr);
    return { statusCode: 500, body: 'DB error' };
  }

  // 4. Proses fulfillment jika pembayaran sukses
  if (paymentStatus === 'paid' && order) {
    await prosesFullfillment(order, supabase);

    // Kirim notifikasi WhatsApp via Fonnte
    if (order.contact) {
      await kirimNotifWA(order).catch(err => console.error('WA notif error:', err));
    }
  }

  return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
};

// Proses fulfillment — cek stok voucher atau tandai processing
async function prosesFullfillment(order, supabase) {
  // Cek stok voucher code (untuk gift card)
  const { data: voucher } = await supabase
    .from('voucher_codes')
    .select('*')
    .eq('nominal_id', order.nominal_id)
    .eq('is_used', false)
    .limit(1)
    .single();

  if (voucher) {
    // Ambil kode voucher dari stok
    await supabase.from('voucher_codes').update({
      is_used: true,
      order_id: order.id,
      used_at: new Date().toISOString()
    }).eq('id', voucher.id);

    await supabase.from('orders').update({
      fulfillment_status: 'success',
      voucher_code: voucher.code
    }).eq('id', order.id);

  } else {
    // Game top up: tandai processing — perlu diproses via supplier API
    await supabase.from('orders').update({
      fulfillment_status: 'processing'
    }).eq('id', order.id);
  }
}

// Kirim notifikasi WhatsApp via Fonnte
async function kirimNotifWA(order) {
  const hp = order.contact.replace(/[^0-9]/g, '');
  if (!hp || hp.length < 9) return;

  const pesan = order.voucher_code
    ? `✅ *GUEDIGITAL — Order Sukses!*\n\n🎮 Produk: ${order.product_name}\n💎 Nominal: ${order.nominal_label}\n🎁 *Kode Voucher kamu:*\n\n\`${order.voucher_code}\`\n\n📋 Order ID: ${order.order_code}\n💰 Total: Rp${Number(order.total).toLocaleString('id-ID')}\n\nTerima kasih sudah belanja di GUEDIGITAL! 🙏`
    : `✅ *GUEDIGITAL — Pembayaran Diterima!*\n\n🎮 Produk: ${order.product_name}\n💎 Nominal: ${order.nominal_label}\n🆔 Target ID: ${order.target_id || '-'}\n📋 Order: ${order.order_code}\n💰 Total: Rp${Number(order.total).toLocaleString('id-ID')}\n\n⏳ Top up sedang diproses (1–3 menit).\n\nTerima kasih! 🙏`;

  await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': process.env.FONNTE_TOKEN },
    body: new URLSearchParams({ target: hp, message: pesan, countryCode: '62' })
  });
}
