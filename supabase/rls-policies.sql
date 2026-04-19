-- KioskoPlus — Políticas RLS
-- Ejecutar DESPUÉS de schema.sql

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions   ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del JWT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'anon'
  )
$$;

-- ─── PROFILES ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"    ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

-- ─── CATEGORIES ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "categories_admin_write"  ON categories;

CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_write" ON categories
  FOR ALL USING (get_user_role() = 'admin');

-- ─── PRODUCTS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_public_read"   ON products;
DROP POLICY IF EXISTS "products_staff_write"   ON products;

CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (activo = true OR get_user_role() IN ('empleado','admin'));

CREATE POLICY "products_staff_write" ON products
  FOR ALL USING (get_user_role() = 'admin');

-- UPDATE de stock por empleado (vía RPC SECURITY DEFINER, no necesita policy extra)

-- ─── PRODUCT VARIANTS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "variants_public_read"  ON product_variants;
DROP POLICY IF EXISTS "variants_admin_write"  ON product_variants;

CREATE POLICY "variants_public_read" ON product_variants
  FOR SELECT USING (activo = true OR get_user_role() IN ('empleado','admin'));

CREATE POLICY "variants_admin_write" ON product_variants
  FOR ALL USING (get_user_role() = 'admin');

-- ─── SALES ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sales_cliente_own"   ON sales;
DROP POLICY IF EXISTS "sales_staff_all"     ON sales;

CREATE POLICY "sales_cliente_own" ON sales
  FOR SELECT USING (cliente_id = auth.uid());

CREATE POLICY "sales_staff_all" ON sales
  FOR ALL USING (get_user_role() IN ('empleado','admin'));

-- ─── SALE ITEMS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sale_items_cliente_own" ON sale_items;
DROP POLICY IF EXISTS "sale_items_staff_all"   ON sale_items;

CREATE POLICY "sale_items_cliente_own" ON sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_id AND s.cliente_id = auth.uid()
    )
  );

CREATE POLICY "sale_items_staff_all" ON sale_items
  FOR ALL USING (get_user_role() IN ('empleado','admin'));

-- ─── CASH SESSIONS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cash_sessions_own_empleado" ON cash_sessions;
DROP POLICY IF EXISTS "cash_sessions_admin_all"    ON cash_sessions;

CREATE POLICY "cash_sessions_own_empleado" ON cash_sessions
  FOR ALL USING (
    empleado_id = auth.uid() AND get_user_role() IN ('empleado','admin')
  );

CREATE POLICY "cash_sessions_admin_all" ON cash_sessions
  FOR ALL USING (get_user_role() = 'admin');

-- ─── REALTIME ───────────────────────────────────────────────────────────────
-- Habilitar realtime en las tablas críticas (ejecutar en Supabase Dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE product_variants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sales;
