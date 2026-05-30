# GUEDIGITAL — Claude Code Context

## Stack
- Frontend: Vanilla HTML/CSS/JS, mobile-first (max-width 420px)
- Backend: Netlify Functions (serverless, Node.js 18)
- Database: Supabase (PostgreSQL + Auth + RLS)
- Payment: Midtrans Snap
- Notifikasi: Fonnte WhatsApp API
- Deploy: Netlify

## Design System
- Font: Inter (Google Fonts) weight 400, 700, 900
- Warna: --blue: #3157ff | --cyan: #19c8ff | --violet: #7c3cff
- Status: --green: #16c784 | --orange: #ff9f1c | --red: #ff4d6d
- Background: #f7f9fc | Card: white | Border: 1.5px solid #e6ebf2
- Border-radius: 22px (card), 28px (large), 999px (pill)

## Rules
- JANGAN pernah minta atau tampilkan isi file .env
- Supabase Service Key HANYA di Netlify Functions (server-side)
- Supabase Anon Key boleh di client (sudah dibatasi RLS)
- Loading state wajib di setiap async operation
- Error message dalam Bahasa Indonesia yang friendly

## Fonnte API
- POST https://api.fonnte.com/send
- Header: Authorization: FONNTE_TOKEN
- Body (form-urlencoded): target, message, countryCode=62

## Midtrans Snap
- Sandbox: https://app.sandbox.midtrans.com/snap/snap.js
- Production: https://app.midtrans.com/snap/snap.js
- window.snap.pay(snapToken, { onSuccess, onPending, onError, onClose })
