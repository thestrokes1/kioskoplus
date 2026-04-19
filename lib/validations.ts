import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const RegistroSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  dni: z.string().min(7, 'DNI debe tener 7 u 8 dígitos').max(8, 'DNI debe tener 7 u 8 dígitos').regex(/^\d+$/, 'DNI solo números'),
})

export const ProductSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  marca: z.string().nullable().optional(),
  category_id: z.string().uuid('Categoría inválida').nullable().optional(),
  emoji: z.string().default('📦'),
  precio: z.number({ message: 'Precio requerido' }).positive('Precio debe ser positivo'),
  unidad: z.enum(['unid', 'kg', 'g', 'L', 'ml', 'pack']),
  stock: z.number().int().min(0, 'Stock no puede ser negativo'),
  stock_minimo: z.number().int().min(0).default(5),
  activo: z.boolean().default(true),
  imagen_url: z.string().url('URL inválida').nullable().optional(),
  barcode: z.string().nullable().optional().transform((v) => v || null),
  // Fechas
  fecha_inicio_compra: z.string().nullable().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  // Precios
  costo_unitario: z.number().positive().nullable().optional(),
  pct_iva: z.number().min(0).max(100).default(21),
  pct_impuestos: z.number().min(0).max(100).default(0),
  pct_ganancia: z.number().min(0).max(100).default(30),
})

export const VariantFormSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, 'Nombre requerido'),
  presentacion: z.string().nullable().optional(),
  capacidad: z.number().positive().nullable().optional(),
  capacidad_unidad: z.enum(['ml', 'L', 'g', 'kg', 'unid']).nullable().optional(),
  precio_variante: z.number().positive().nullable().optional(),
  costo_variante: z.number().positive().nullable().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  stock_actual: z.number().int().min(0).default(0),
  cantidad_agregar: z.number().int().min(0).default(0),
  stock_minimo: z.number().int().min(0).default(5),
  barcode: z.string().nullable().optional().transform((v) => v || null),
  activo: z.boolean().default(true),
})

export const ProductFormSchema = ProductSchema.extend({
  variants: z.array(VariantFormSchema).default([]),
})

export const ProductVariantSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  precio_extra: z.number().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  barcode: z.string().nullable().optional().transform((v) => v || null),
  activo: z.boolean().default(true),
})

export const StockMovementSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  cantidad: z.number().int().refine((n) => n !== 0, { message: 'Cantidad no puede ser cero' }),
  motivo: z.string().min(1, 'Motivo requerido'),
})

export const SaleSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  empleado_id: z.string().uuid().optional(), // set server-side from JWT, ignored if sent by client
  total: z.number().positive(),
  metodo_pago: z.enum(['efectivo', 'mercadopago', 'transferencia']),
  mp_payment_id: z.string().nullable().optional(),
  mp_status: z.enum(['approved', 'pending', 'rejected']).nullable().optional(),
  estado: z.enum(['pendiente', 'completada', 'cancelada']).default('completada'),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      variant_id: z.string().uuid().nullable().optional(),
      cantidad: z.number().int().positive(),
      precio_unitario: z.number().positive(),
      subtotal: z.number().positive(),
      promo_label: z.string().nullable().optional(),
    })
  ).min(1, 'La venta debe tener al menos un producto'),
})

export const CashSessionSchema = z.object({
  monto_apertura: z.number().min(0).default(0),
  notas: z.string().nullable().optional(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegistroInput = z.infer<typeof RegistroSchema>
export type ProductInput = z.infer<typeof ProductSchema>
export type ProductFormInput = z.infer<typeof ProductFormSchema>
export type VariantFormInput = z.infer<typeof VariantFormSchema>
export type ProductVariantInput = z.infer<typeof ProductVariantSchema>
export type StockMovementInput = z.infer<typeof StockMovementSchema>
export type SaleInput = z.infer<typeof SaleSchema>
export type CashSessionInput = z.infer<typeof CashSessionSchema>
