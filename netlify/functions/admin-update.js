/* ============================================
   GUEDIGITAL — Admin Update (server-side)
   Pakai Service Key untuk bypass RLS
   ============================================ */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { action, id, value } = body;

  try {
    let error;

    if (action === 'toggle_product') {
      ({ error } = await sb.from('products').update({ is_active: value }).eq('id', id));
    } else if (action === 'toggle_nominal') {
      ({ error } = await sb.from('nominals').update({ is_active: value }).eq('id', id));
    } else if (action === 'update_price') {
      ({ error } = await sb.from('nominals').update({ price: value }).eq('id', id));
    } else if (action === 'update_image') {
      ({ error } = await sb.from('products').update({ image_url: value }).eq('id', id));
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
    }

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
