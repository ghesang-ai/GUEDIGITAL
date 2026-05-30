// GUEDIGITAL — Edge Function: inject config ke HTML
// Meng-inject SUPABASE_URL, SUPABASE_ANON_KEY, dan MIDTRANS_CLIENT_KEY
// ke dalam HTML sebelum dikirim ke browser

import { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const response = await context.next();

  // Hanya inject ke HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const html = await response.text();

  // Inject config ke window.__CONFIG__
  const config = `<script>
    window.__CONFIG__ = {
      SUPABASE_URL: "${Netlify.env.get('SUPABASE_URL') || ''}",
      SUPABASE_ANON_KEY: "${Netlify.env.get('SUPABASE_ANON_KEY') || ''}",
      MIDTRANS_CLIENT_KEY: "${Netlify.env.get('MIDTRANS_CLIENT_KEY') || ''}"
    };
  </script>`;

  // Inject sebelum closing </head> jika placeholder tidak ada
  let injected = html.replace('<!-- __CONFIG_INJECT__ -->', config);
  if (!injected.includes('window.__CONFIG__')) {
    injected = html.replace('</head>', config + '</head>');
  }

  // Ganti placeholder Midtrans client key di script tag
  injected = injected.replace(
    '__MIDTRANS_CLIENT_KEY__',
    Netlify.env.get('MIDTRANS_CLIENT_KEY') || ''
  );

  return new Response(injected, {
    status: response.status,
    headers: response.headers
  });
};

export const config = { path: "/*" };
