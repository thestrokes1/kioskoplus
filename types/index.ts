export type Role = 'cliente' | 'empleado' | 'admin'
export type Unidad = 'unid' | 'kg' | 'g' | 'L' | 'ml' | 'pack'
export type MetodoPago = 'efectivo' | 'mercadopago' | 'transferencia'
export type EstadoVenta = 'pendiente' | 'completada' | 'cancelada'
export type MpStatus = 'approved' | 'pending' | 'rejected'

export interface Profile {
  id: string
  role: Role
  nombre: string | null
  apellido: string | null
  dni: string | null
  created_at: string
}

export interface Category {
  id: string
  nombre: string
  emoji: string | null
  created_at: string
}

export interface Product {
  id: string
  nombre: string
  marca: string | null
  category_id: string | null
  emoji: string
  precio: number
  unidad: Unidad
  stock: number
  stock_minimo: number
  activo: boolean
  imagen_url: string | null
  barcode: string | null
  descripcion: string | null
  // Fechas
  fecha_inicio_compra: string | null
  fecha_vencimiento: string | null
  // Precios
  costo_unitario: number | null
  pct_iva: number
  pct_impuestos: number
  pct_ganancia: number
  precio_calculado: number | null
  created_at: string
  updated_at: string
  categories?: Category | null
  product_variants?: ProductVariant[]
}

export interface ProductVariant {
  id: string
  product_id: string
  nombre: string
  precio_extra: number
  // Nuevos campos
  presentacion: string | null
  capacidad: number | null
  capacidad_unidad: string | null
  descripcion_completa: string | null
  precio_variante: number | null
  costo_variante: number | null
  fecha_vencimiento: string | null
  stock: number
  stock_minimo: number
  barcode: string | null
  activo: boolean
}

/** Devuelve el label descriptivo de una variante: "Nombre — Presentacion Capacidad" */
export function variantLabel(v: ProductVariant): string {
  if (v.descripcion_completa) return v.descripcion_completa
  const parts: string[] = [v.nombre]
  if (v.presentacion) {
    const cap = v.capacidad ? `${v.capacidad}${v.capacidad_unidad ?? ''}` : ''
    parts.push(cap ? `${v.presentacion} ${cap}` : v.presentacion)
  } else if (v.capacidad) {
    parts.push(`${v.capacidad}${v.capacidad_unidad ?? ''}`)
  }
  return parts.join(' — ')
}

export interface StockMovement {
  id: string
  product_id: string | null
  variant_id: string | null
  tipo: 'entrada' | 'salida' | 'ajuste' | 'vencimiento'
  cantidad: number
  stock_anterior: number | null
  stock_nuevo: number | null
  motivo: string | null
  empleado_id: string | null
  created_at: string
  products?: { nombre: string; emoji: string } | null
  product_variants?: { nombre: string } | null
  profiles?: { nombre: string | null; apellido: string | null } | null
}

export interface Sale {
  id: string
  cliente_id: string | null
  empleado_id: string | null
  total: number
  metodo_pago: MetodoPago
  mp_payment_id: string | null
  mp_status: MpStatus | null
  estado: EstadoVenta
  created_at: string
  profiles?: Profile | null
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  variant_id: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
  products?: Product | null
  product_variants?: ProductVariant | null
}

export interface CashSession {
  id: string
  empleado_id: string | null
  apertura: string
  cierre: string | null
  monto_apertura: number
  monto_cierre: number | null
  total_efectivo: number | null
  total_mp: number | null
  total_ventas: number | null
  notas: string | null
}

// ── Promos ──────────────────────────────────────────────────────────────────

export interface PromoItem {
  id: string
  promo_id: string
  product_id: string
  variant_id: string | null
  cantidad: number
  products?: Product | null
  product_variants?: ProductVariant | null
}

export interface Promo {
  id: string
  numero: number
  nombre: string
  descripcion: string | null
  emoji: string
  pct_descuento: number
  activo: boolean
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string
  promo_items?: PromoItem[]
}

// helpers calculados en cliente
export function calcPromo(promo: Promo): {
  precioOriginal: number
  precioFinal: number
  ahorro: number
} {
  const precioOriginal = (promo.promo_items ?? []).reduce((acc, item) => {
    const prod = item.products
    if (!prod) return acc
    const precioUnit = item.variant_id && item.product_variants?.precio_variante != null
      ? item.product_variants.precio_variante
      : prod.precio
    return acc + precioUnit * item.cantidad
  }, 0)
  const ahorro = Math.round(precioOriginal * promo.pct_descuento / 100)
  return { precioOriginal, precioFinal: precioOriginal - ahorro, ahorro }
}

// ── Carrito ──────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product
  variant: ProductVariant | null
  cantidad: number
  /** Precio manual que sobreescribe el cálculo normal (usado en promos) */
  precio_manual?: number
  /** Etiqueta de promo para mostrar en el carrito */
  promo_label?: string
}

// Tipo para la base de datos (Supabase generado manualmente)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      products: {
        Row: Omit<Product, 'categories' | 'product_variants'>
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'categories' | 'product_variants'>
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'categories' | 'product_variants'>>
      }
      product_variants: {
        Row: ProductVariant
        Insert: Omit<ProductVariant, 'id'>
        Update: Partial<Omit<ProductVariant, 'id' | 'product_id'>>
      }
      sales: {
        Row: Omit<Sale, 'profiles' | 'sale_items'>
        Insert: Omit<Sale, 'id' | 'created_at' | 'profiles' | 'sale_items'>
        Update: Partial<Omit<Sale, 'id' | 'created_at' | 'profiles' | 'sale_items'>>
      }
      sale_items: {
        Row: Omit<SaleItem, 'products' | 'product_variants'>
        Insert: Omit<SaleItem, 'id' | 'products' | 'product_variants'>
        Update: Partial<Omit<SaleItem, 'id' | 'sale_id' | 'products' | 'product_variants'>>
      }
      cash_sessions: {
        Row: CashSession
        Insert: Omit<CashSession, 'id' | 'apertura'>
        Update: Partial<Omit<CashSession, 'id' | 'apertura'>>
      }
    }
  }
}

// Analytics legacy
export interface DailySales {
  fecha: string
  total: number
  cantidad: number
}

export interface TopProduct {
  product_id: string
  nombre: string
  total_vendido: number
  ingresos: number
}

export interface StockAlert {
  id: string
  nombre: string
  stock: number
  stock_minimo: number
  emoji: string
}

// Analytics Dashboard
export interface AnalyticsKPI {
  total_vendido: number
  transacciones: number
  ticket_promedio: number
  unidades_totales: number
  hora_pico: number | null
  prev_total_vendido: number
  prev_transacciones: number
}

export interface PeriodPoint {
  label: string
  monto: number
  transacciones: number
}

export interface ProductRankingItem {
  id: string
  nombre: string
  emoji: string
  categoria: string
  unidades: number
  monto: number
  prev_unidades: number
}

export interface CategorySalesItem {
  nombre: string
  emoji: string
  unidades: number
  monto: number
}

export interface PaymentItem {
  metodo: string
  label: string
  monto: number
  cantidad: number
}

export interface EmployeeSalesItem {
  nombre: string
  apellido: string | null
  ventas: number
  monto: number
  ticket: number
}

export interface NoMovementItem {
  id: string
  nombre: string
  emoji: string
  stock: number
  stock_minimo: number
  categoria: string
}

export interface PromoAnalyticsItem {
  label: string          // "🎉 Promo #1 — Coca y Papas"
  transacciones: number  // cuántas veces se vendió (apariciones en sale_items)
  unidades: number       // total unidades vendidas en promo
  monto: number          // total $ generado con precio con descuento
  hora_pico: number | null
  por_hora: { hora: number; count: number }[]
}

export interface DashboardAnalytics {
  kpi: AnalyticsKPI
  grafico: PeriodPoint[]
  productos: ProductRankingItem[]
  categorias: CategorySalesItem[]
  pagos: PaymentItem[]
  empleados: EmployeeSalesItem[]
  sinMovimiento: NoMovementItem[]
  stockBajo: NoMovementItem[]
  promos: PromoAnalyticsItem[]
}
