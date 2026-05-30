/* ============================================
   GUEDIGITAL — Netlify Function: create-order
   Buat order di Supabase + generate Midtrans token
   ============================================ */

const { createClient } = require('@supabase/supabase-js');
const midtransClient = require('midtrans-client');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.APP_URL || '*'
  };

  // Inisialisasi Supabase dengan Service Key (server-side only)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Request tidak valid.' }) };
  }

  // Validasi field wajib
  const wajib = ['productId', 'nominalId', 'productName', 'nominalLabel', 'price', 'total'];
  for (const field of wajib) {
    if (!body[field]) {
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ success: false, message: `Field '${field}' tidak boleh kosong.` })
      };
    }
  }

  // 1. Verifikasi nominal masih aktif dan cek stok
  const { data: nominal, error: nomErr } = await supabase
    .from('nominals')
    .select('*')
    .eq('id', body.nominalId)
    .eq('is_active', true)
    .single();

  if (nomErr || !nominal) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Nominal tidak ditemukan atau tidak aktif.' }) };
  }
  if (nominal.stock === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Stok produk habis. Pilih nominal lain.' }) };
  }

  // 2. Verifikasi harga tidak dimanipulasi client
  if (nominal.price !== body.price) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Harga tidak valid.' }) };
  }

  // 3. Generate kode order unik
  const orderCode = `GUE-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

  // 4. Simpan order ke Supabase
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_code: orderCode,
      user_id: body.userId || null,
      product_id: body.productId,
      nominal_id: body.nominalId,
      product_name: body.productName,
      nominal_label: body.nominalLabel,
      target_id: body.targetId || null,
      target_server: body.targetServer || null,
      contact: body.contact || null,
      price: body.price,
      admin_fee: body.adminFee || 1000,
      total: body.total,
      payment_method: body.paymentMethod || 'qris',
      midtrans_order_id: orderCode
    })
    .select()
    .single();

  if (orderErr) {
    console.error('DB insert error:', orderErr);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Gagal menyimpan order. Coba lagi.' }) };
  }

  // 5. Buat Midtrans Snap token
  const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
  });

  let snapToken;
  try {
    snapToken = await snap.createTransactionToken({
      transaction_details: {
        order_id: orderCode,
        gross_amount: body.total
      },
      customer_details: {
        phone: body.contact || '',
        first_name: 'Pelanggan',
        last_name: 'GUEDIGITAL'
      },
      item_details: [
        {
          id: String(body.nominalId),
          name: `${body.productName} - ${body.nominalLabel}`.substring(0, 50),
          price: body.price,
          quantity: 1
        },
        {
          id: 'admin_fee',
          name: 'Biaya Admin',
          price: body.adminFee || 1000,
          quantity: 1
        }
      ],
      enabled_payments: ['qris', 'gopay', 'shopeepay', 'ovo', 'dana', 'bca_va', 'bni_va', 'bri_va', 'mandiri_va']
    });
  } catch (midErr) {
    console.error('Midtrans error:', midErr);
    // Hapus order yang gagal dibuat token-nya
    await supabase.from('orders').delete().eq('id', order.id);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Gagal membuat sesi pembayaran. Coba lagi.' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      orderId: order.id,
      orderCode,
      snapToken
    })
  };
};
