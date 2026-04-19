-- KioskoPlus — Schema completo
-- Ejecutar en Supabase SQL Editor

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role        text        NOT NULL CHECK (role IN ('cliente', 'empleado', 'admin')) DEFAULT 'cliente',
  nombre      text,
  apellido    text,
  dni         text        UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-crear perfil al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, nombre, apellido, dni)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente'),
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'apellido',
    NEW.raw_user_meta_data->>'dni'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ─── CATEGORIES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL UNIQUE,
  emoji       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── PRODUCTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text        NOT NULL,
  category_id  uuid        REFERENCES categories ON DELETE SET NULL,
  emoji        text        NOT NULL DEFAULT '📦',
  precio       numeric(10,2) NOT NULL CHECK (precio > 0),
  unidad       text        NOT NULL CHECK (unidad IN ('unid','kg','g','L','ml','pack')) DEFAULT 'unid',
  stock        integer     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo integer     NOT NULL DEFAULT 5,
  activo       boolean     NOT NULL DEFAULT true,
  imagen_url   text,
  barcode      text        UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_products_updated_at ON products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ─── PRODUCT VARIANTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products ON DELETE CASCADE,
  nombre      text        NOT NULL,
  precio_extra numeric(10,2) NOT NULL DEFAULT 0,
  stock       integer     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  barcode     text        UNIQUE,
  activo      boolean     NOT NULL DEFAULT true
);

-- ─── SALES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid        REFERENCES profiles ON DELETE SET NULL,
  empleado_id     uuid        REFERENCES profiles ON DELETE SET NULL,
  total           numeric(10,2) NOT NULL CHECK (total > 0),
  metodo_pago     text        NOT NULL CHECK (metodo_pago IN ('efectivo','mercadopago','transferencia')),
  mp_payment_id   text,
  mp_status       text        CHECK (mp_status IN ('approved','pending','rejected')),
  estado          text        NOT NULL CHECK (estado IN ('pendiente','completada','cancelada')) DEFAULT 'completada',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── SALE ITEMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         uuid        NOT NULL REFERENCES sales ON DELETE CASCADE,
  product_id      uuid        NOT NULL REFERENCES products,
  variant_id      uuid        REFERENCES product_variants,
  cantidad        integer     NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(10,2) NOT NULL,
  subtotal        numeric(10,2) NOT NULL
);

-- ─── CASH SESSIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id     uuid        REFERENCES profiles ON DELETE SET NULL,
  apertura        timestamptz NOT NULL DEFAULT now(),
  cierre          timestamptz,
  monto_apertura  numeric(10,2) NOT NULL DEFAULT 0,
  monto_cierre    numeric(10,2),
  total_efectivo  numeric(10,2),
  total_mp        numeric(10,2),
  total_ventas    integer,
  notas           text
);

-- ─── RPCs PARA STOCK ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_cantidad integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - p_cantidad)
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_variant_stock(p_variant_id uuid, p_cantidad integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE product_variants
  SET stock = GREATEST(0, stock - p_cantidad)
  WHERE id = p_variant_id;
END;
$$;

-- ─── CATEGORÍAS DE EJEMPLO ──────────────────────────────────────────────────
INSERT INTO categories (nombre, emoji) VALUES
  ('Bebidas',      '🥤'),
  ('Snacks',       '🍿'),
  ('Lácteos',      '🥛'),
  ('Cigarrillos',  '🚬'),
  ('Golosinas',    '🍬'),
  ('Higiene',      '🧴'),
  ('Electrónica',  '🔋')
ON CONFLICT (nombre) DO NOTHING;
