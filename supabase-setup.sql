-- ============================================
-- GUEDIGITAL — Supabase Database Setup
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. PROFILES (extend auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('game','gift_card','console')),
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  needs_server BOOLEAN DEFAULT FALSE,
  needs_user_id BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOMINALS
CREATE TABLE public.nominals (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price INTEGER NOT NULL,
  cost_price INTEGER,
  stock INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  save_label TEXT
);

-- 4. ORDERS
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  product_id INTEGER REFERENCES public.products(id),
  nominal_id INTEGER REFERENCES public.nominals(id),
  product_name TEXT NOT NULL,
  nominal_label TEXT NOT NULL,
  product_icon TEXT,
  target_id TEXT,
  target_server TEXT,
  contact TEXT,
  price INTEGER NOT NULL,
  admin_fee INTEGER DEFAULT 1000,
  total INTEGER NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','expired')),
  fulfillment_status TEXT DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending','processing','success','failed')),
  voucher_code TEXT,
  midtrans_order_id TEXT,
  midtrans_transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VOUCHER CODES (stok kode gift card)
CREATE TABLE public.voucher_codes (
  id SERIAL PRIMARY KEY,
  nominal_id INTEGER REFERENCES public.nominals(id),
  code TEXT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  order_id INTEGER REFERENCES public.orders(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;

-- Profiles: user hanya bisa baca/ubah data sendiri
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Products & Nominals: siapa saja bisa baca (public read)
CREATE POLICY "products_read" ON public.products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "nominals_read" ON public.nominals
  FOR SELECT USING (is_active = TRUE);

-- Orders: user hanya bisa lihat order miliknya sendiri
CREATE POLICY "orders_user_read" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Auto-update updated_at pada orders
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile saat user baru daftar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Products
INSERT INTO public.products (name, category, icon, description, needs_server, needs_user_id, sort_order) VALUES
  ('Mobile Legends', 'game', '⚔️', 'Top up Diamond dan Starlight Member', TRUE, TRUE, 1),
  ('Free Fire',      'game', '🔫', 'Top up Diamond dan Membership Garena', FALSE, TRUE, 2),
  ('PUBG Mobile',    'game', '🪖', 'Top up UC dan Royale Pass', FALSE, TRUE, 3),
  ('Honkai Star Rail','game', '🌌', 'Top up Oneiric Shard dan bundle', FALSE, TRUE, 4),
  ('Zenless Zone Zero','game','⚡', 'Top up Monochrome dan bundle', FALSE, TRUE, 5),
  ('iTunes Gift Card','gift_card','🎵','Gift card App Store region USD', FALSE, FALSE, 6),
  ('Google Play',    'gift_card','▶️','Gift card Google Play IDR', FALSE, FALSE, 7),
  ('PlayStation Store','console','🎮','PSN Wallet IDR instan', FALSE, FALSE, 8),
  ('Steam Wallet',   'console','🖥️','Steam Wallet Code IDR dan USD', FALSE, FALSE, 9);

-- Mobile Legends nominals (product_id = 1)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order, save_label) VALUES
  (1, '86 💎',      19000,  16000, 1, NULL),
  (1, '172 💎',     36000,  30000, 2, 'Hemat 5%'),
  (1, '257 💎',     52000,  44000, 3, NULL),
  (1, '514 💎',     98000,  83000, 4, 'Hemat 8%'),
  (1, '1.048 💎',  188000, 155000, 5, 'Hemat 12%'),
  (1, 'Starlight Member', 42000, 36000, 6, NULL);

-- Free Fire nominals (product_id = 2)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order) VALUES
  (2, '70 💎',   14000, 11000, 1),
  (2, '140 💎',  27000, 22000, 2),
  (2, '355 💎',  65000, 54000, 3),
  (2, '720 💎', 125000, 103000, 4);

-- PUBG Mobile nominals (product_id = 3)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order) VALUES
  (3, '60 UC',   16000, 13000, 1),
  (3, '325 UC',  75000, 62000, 2),
  (3, '660 UC', 148000, 122000, 3),
  (3, 'Royale Pass', 185000, 152000, 4);

-- iTunes Gift Card nominals (product_id = 6)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order, save_label) VALUES
  (6, 'USD 5',    85000,   78000, 1, NULL),
  (6, 'USD 10',  168000,  155000, 2, 'Hemat 3%'),
  (6, 'USD 25',  410000,  380000, 3, 'Hemat 5%'),
  (6, 'USD 50',  800000,  740000, 4, 'Hemat 6%'),
  (6, 'USD 100',1550000, 1430000, 5, 'Hemat 8%');

-- Google Play nominals (product_id = 7)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order) VALUES
  (7, 'Rp25.000',   26500,  24000, 1),
  (7, 'Rp50.000',   52000,  47500, 2),
  (7, 'Rp100.000', 103000,  94000, 3),
  (7, 'Rp200.000', 204000, 186000, 4);

-- PlayStation Store nominals (product_id = 8)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order, save_label) VALUES
  (8, 'PSN Rp100.000', 108000,  99000, 1, NULL),
  (8, 'PSN Rp250.000', 265000, 243000, 2, 'Hemat 4%'),
  (8, 'PSN Rp500.000', 520000, 477000, 3, 'Hemat 5%');

-- Steam Wallet nominals (product_id = 9)
INSERT INTO public.nominals (product_id, label, price, cost_price, sort_order) VALUES
  (9, 'IDR 50.000',   52000,  47000, 1),
  (9, 'IDR 100.000', 103000,  94000, 2),
  (9, 'USD 5',        85000,  78000, 3),
  (9, 'USD 10',      168000, 155000, 4);
