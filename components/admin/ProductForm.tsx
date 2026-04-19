'use client'

import { useState } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProductFormSchema, type ProductFormInput } from '@/lib/validations'
import type { Category, Product } from '@/types/index'

interface ProductFormProps {
  product?: Product
  categories: Category[]
  onSuccess: () => void
  onCancel: () => void
}

const UNIDADES = ['unid', 'kg', 'g', 'L', 'ml', 'pack'] as const
const IVA_OPTIONS = [
  { label: '0% (exento)', value: 0 },
  { label: '10.5% (reducido)', value: 10.5 },
  { label: '21% (general)', value: 21 },
  { label: '27% (servicios)', value: 27 },
]
const PRESENTACIONES = ['unidad', 'pack', 'kg', 'gramos', 'lata', 'botella', 'caja', 'sobre', 'litro']
const CAPACIDAD_UNIDADES = ['ml', 'L', 'g', 'kg', 'unid']

const SECTION_CONFIG = {
  identificacion: {
    num: '1',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-400 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    circleBg: 'bg-blue-400',
    chevron: 'text-blue-500 dark:text-blue-400',
  },
  fechas: {
    num: '2',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-400 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-300',
    circleBg: 'bg-purple-400',
    chevron: 'text-purple-500 dark:text-purple-400',
  },
  precios: {
    num: '3',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-400 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-300',
    circleBg: 'bg-emerald-400',
    chevron: 'text-emerald-500 dark:text-emerald-400',
  },
  variantes: {
    num: '4',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-400 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-300',
    circleBg: 'bg-amber-400',
    chevron: 'text-amber-500 dark:text-amber-400',
  },
} as const

const SELECT_CLS =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const SELECT_SM_CLS =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500'
const DATE_CLS =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]'
const DATE_SM_CLS =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]'
const LABEL_CLS = 'text-xs font-medium text-gray-700 dark:text-gray-300'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)

function calcularPrecio(costo: number, pctIva: number, pctImp: number, pctGan: number): number {
  if (!costo || costo <= 0) return 0
  return costo * (1 + pctIva / 100) * (1 + pctImp / 100) * (1 + pctGan / 100)
}

export function ProductForm({ product, categories, onSuccess, onCancel }: ProductFormProps) {
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState({
    identificacion: true,
    fechas: false,
    precios: false,
    variantes: false,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(ProductFormSchema) as unknown as Resolver<ProductFormInput>,
    defaultValues: product
      ? {
          nombre: product.nombre,
          marca: product.marca ?? undefined,
          category_id: product.category_id ?? undefined,
          emoji: product.emoji,
          precio: product.precio,
          unidad: product.unidad,
          stock: product.stock,
          stock_minimo: product.stock_minimo,
          activo: product.activo,
          imagen_url: product.imagen_url ?? undefined,
          barcode: product.barcode ?? undefined,
          fecha_inicio_compra: product.fecha_inicio_compra ?? undefined,
          fecha_vencimiento: product.fecha_vencimiento ?? undefined,
          costo_unitario: product.costo_unitario ?? undefined,
          pct_iva: product.pct_iva ?? 21,
          pct_impuestos: product.pct_impuestos ?? 0,
          pct_ganancia: product.pct_ganancia ?? 30,
          variants: (product.product_variants ?? []).map((v) => ({
            id: v.id,
            nombre: v.nombre,
            presentacion: v.presentacion ?? undefined,
            capacidad: v.capacidad ?? undefined,
            capacidad_unidad: (v.capacidad_unidad as 'ml' | 'L' | 'g' | 'kg' | 'unid') ?? undefined,
            precio_variante: v.precio_variante ?? undefined,
            costo_variante: v.costo_variante ?? undefined,
            fecha_vencimiento: v.fecha_vencimiento ?? undefined,
            stock_actual: v.stock,
            cantidad_agregar: 0,
            stock_minimo: v.stock_minimo ?? 5,
            barcode: v.barcode ?? undefined,
            activo: v.activo,
          })),
        }
      : {
          emoji: '📦',
          unidad: 'unid',
          stock: 0,
          stock_minimo: 5,
          activo: true,
          pct_iva: 21,
          pct_impuestos: 0,
          pct_ganancia: 30,
          variants: [],
        },
  })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  })

  const [costoWatch, pctIvaWatch, pctImpWatch, pctGanWatch, precioWatch] = watch([
    'costo_unitario', 'pct_iva', 'pct_impuestos', 'pct_ganancia', 'precio',
  ])

  const costoBase = costoWatch ?? 0
  const precioActual = precioWatch ?? 0
  const precioCalculado = calcularPrecio(costoBase, pctIvaWatch ?? 21, pctImpWatch ?? 0, pctGanWatch ?? 30)
  const montoIva = costoBase * ((pctIvaWatch ?? 21) / 100)
  const montoImp = (costoBase + montoIva) * ((pctImpWatch ?? 0) / 100)
  const montoGan = (costoBase + montoIva + montoImp) * ((pctGanWatch ?? 30) / 100)
  // Margen real basado en precio de venta efectivo
  const gananciaReal = costoBase > 0 && precioActual > 0 ? precioActual - costoBase : null
  const margenReal = costoBase > 0 && precioActual > 0
    ? ((precioActual - costoBase) / precioActual) * 100
    : null

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function SectionHeader({ label, section }: { label: string; section: keyof typeof openSections }) {
    const cfg = SECTION_CONFIG[section]
    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className={`flex w-full items-center justify-between rounded-xl border-l-4 ${cfg.bg} ${cfg.border} px-4 py-3 text-left transition-colors hover:brightness-[0.97]`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cfg.circleBg} text-xs font-bold text-white`}>
            {cfg.num}
          </span>
          <span className={`text-sm font-semibold ${cfg.text}`}>{label}</span>
        </div>
        {openSections[section] ? (
          <ChevronUp className={`h-4 w-4 ${cfg.chevron}`} />
        ) : (
          <ChevronDown className={`h-4 w-4 ${cfg.chevron}`} />
        )}
      </button>
    )
  }

  async function onFormSubmit(data: ProductFormInput) {
    setSaving(true)
    setApiError(null)
    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = (await res.json()) as { data: { id: string } | null; error: string | null }
      if (json.error) throw new Error(json.error)

      const productId = json.data?.id ?? product?.id

      for (const v of data.variants) {
        if (v.id && v.cantidad_agregar > 0 && productId) {
          await fetch('/api/products/stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: productId,
              variant_id: v.id,
              cantidad: v.cantidad_agregar,
              motivo: 'compra',
            }),
          })
        }
      }

      onSuccess()
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-4">

      {/* ── Sección 1: Identificación ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeader label="Identificación" section="identificacion" />
        {openSections.identificacion && (
          <div className="flex flex-col gap-3 px-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
              <Input label="Marca" placeholder="Coca-Cola, Águila..." {...register('marca')} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className={LABEL_CLS}>Categoría</label>
                <select {...register('category_id')} className={SELECT_CLS}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Emoji" {...register('emoji')} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLS}>Unidad de venta</label>
                <select {...register('unidad')} className={SELECT_CLS}>
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <Input label="Código de barras" {...register('barcode')} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Stock mínimo"
                type="number"
                error={errors.stock_minimo?.message}
                {...register('stock_minimo', { valueAsNumber: true })}
              />
              <Input
                label="Stock inicial"
                type="number"
                error={errors.stock?.message}
                {...register('stock', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" {...register('activo')} className="h-4 w-4 rounded border-gray-300 accent-indigo-600" />
              <label htmlFor="activo" className="text-sm text-gray-700 dark:text-gray-300">Producto activo</label>
            </div>
          </div>
        )}
      </div>

      {/* ── Sección 2: Fechas ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeader label="Fechas" section="fechas" />
        {openSections.fechas && (
          <div className="grid grid-cols-1 gap-3 px-1 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLS}>Inicio de venta</label>
              <input
                type="date"
                {...register('fecha_inicio_compra')}
                className={DATE_CLS}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL_CLS}>Fecha de vencimiento</label>
              <input
                type="date"
                {...register('fecha_vencimiento')}
                className={DATE_CLS}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Sección 3: Precios ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeader label="Precios y márgenes" section="precios" />
        {openSections.precios && (
          <div className="flex flex-col gap-4 px-1">

            {/* Bloque: Precio de compra */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Precio de compra</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Costo de compra ($)"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register('costo_unitario', { valueAsNumber: true })}
                />
                <div className="flex flex-col gap-1">
                  <label className={LABEL_CLS}>% IVA</label>
                  <select {...register('pct_iva', { valueAsNumber: true })} className={SELECT_CLS}>
                    {IVA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="% Ganancia deseada"
                  type="number"
                  step="1"
                  placeholder="30"
                  {...register('pct_ganancia', { valueAsNumber: true })}
                />
                <Input
                  label="% Otros impuestos"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  {...register('pct_impuestos', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Desglose sugerido (solo si hay costo) */}
            {costoBase > 0 && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Precio sugerido</p>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Costo de compra</span>
                    <span className="font-medium">{fmt(costoBase)}</span>
                  </div>
                  {(pctIvaWatch ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-500 dark:text-gray-500">
                      <span>+ IVA {pctIvaWatch ?? 21}%</span>
                      <span>+{fmt(montoIva)}</span>
                    </div>
                  )}
                  {(pctImpWatch ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-500 dark:text-gray-500">
                      <span>+ Imp. internos {pctImpWatch}%</span>
                      <span>+{fmt(montoImp)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 dark:text-gray-500">
                    <span>+ Ganancia {pctGanWatch ?? 30}%</span>
                    <span>+{fmt(montoGan)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-emerald-200 dark:border-emerald-800 pt-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <span>= Precio sugerido</span>
                    <span>{fmt(precioCalculado)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('precio', Math.round(precioCalculado))}
                  className="mt-2.5 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  Aplicar precio sugerido → {fmt(precioCalculado)}
                </button>
              </div>
            )}

            {/* Bloque: Precio de venta */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Precio de venta</p>
              <Input
                label="Precio de venta ($)"
                type="number"
                step="0.01"
                required
                error={errors.precio?.message}
                {...register('precio', { valueAsNumber: true })}
              />

              {/* Resumen real */}
              {margenReal !== null && gananciaReal !== null && (
                <div className="mt-3 grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center text-xs">
                  <div className="p-2">
                    <p className="text-gray-400 dark:text-gray-500">Costo compra</p>
                    <p className="mt-0.5 font-semibold text-gray-700 dark:text-gray-300">{fmt(costoBase)}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-gray-400 dark:text-gray-500">Ganancia neta</p>
                    <p className={`mt-0.5 font-semibold ${gananciaReal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(gananciaReal)}
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-gray-400 dark:text-gray-500">Margen real</p>
                    <p className={`mt-0.5 font-bold ${margenReal >= 30 ? 'text-emerald-600' : margenReal >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                      {margenReal.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Sección 4: Variantes ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionHeader label={`Variantes (${variantFields.length})`} section="variantes" />
        {openSections.variantes && (
          <div className="flex flex-col gap-3 px-1">
            {variantFields.length === 0 && (
              <p className="text-xs text-gray-400">Sin variantes. Este producto se vende como unidad.</p>
            )}

            {variantFields.map((field, idx) => {
              const stockActual = watch(`variants.${idx}.stock_actual`) ?? 0
              const cantidadAgregar = watch(`variants.${idx}.cantidad_agregar`) ?? 0
              const stockNuevo = stockActual + cantidadAgregar
              const costoV = watch(`variants.${idx}.costo_variante`) ?? 0
              const precioV = watch(`variants.${idx}.precio_variante`) ?? 0
              const margenV = costoV > 0 && precioV > 0
                ? ((precioV - costoV) / precioV) * 100
                : null
              const precioSugeridoV = costoV > 0
                ? calcularPrecio(costoV, pctIvaWatch ?? 21, pctImpWatch ?? 0, pctGanWatch ?? 30)
                : 0

              return (
                <div key={field.id} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Variante {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      label="Nombre"
                      placeholder="Lata 375ml"
                      error={errors.variants?.[idx]?.nombre?.message}
                      {...register(`variants.${idx}.nombre`)}
                    />
                    <div className="flex flex-col gap-1">
                      <label className={LABEL_CLS}>Presentación</label>
                      <select {...register(`variants.${idx}.presentacion`)} className={SELECT_SM_CLS}>
                        <option value="">—</option>
                        {PRESENTACIONES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      label="Capacidad"
                      type="number"
                      step="0.001"
                      placeholder="375"
                      {...register(`variants.${idx}.capacidad`, { valueAsNumber: true })}
                    />
                    <div className="flex flex-col gap-1">
                      <label className={LABEL_CLS}>Unidad de capacidad</label>
                      <select {...register(`variants.${idx}.capacidad_unidad`)} className={SELECT_SM_CLS}>
                        <option value="">—</option>
                        {CAPACIDAD_UNIDADES.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ── Bloque de precios de la variante ── */}
                  <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Precio de esta variante
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        label="Costo de compra ($)"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...register(`variants.${idx}.costo_variante`, { valueAsNumber: true })}
                      />
                      <Input
                        label="Precio de venta ($)"
                        type="number"
                        step="0.01"
                        placeholder={precioSugeridoV > 0 ? String(Math.round(precioSugeridoV)) : '0,00'}
                        {...register(`variants.${idx}.precio_variante`, { valueAsNumber: true })}
                      />
                    </div>

                    {/* Resumen en vivo */}
                    {margenV !== null ? (
                      <div className="mt-2 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-center text-xs">
                        <div className="p-2">
                          <p className="text-gray-400">Costo compra</p>
                          <p className="mt-0.5 font-semibold text-gray-700 dark:text-gray-300">{fmt(costoV)}</p>
                        </div>
                        <div className="p-2">
                          <p className="text-gray-400">Ganancia neta</p>
                          <p className={`mt-0.5 font-semibold ${precioV - costoV >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(precioV - costoV)}
                          </p>
                        </div>
                        <div className="p-2">
                          <p className="text-gray-400">Margen real</p>
                          <p className={`mt-0.5 font-bold ${margenV >= 30 ? 'text-emerald-600' : margenV >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {margenV.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ) : costoV > 0 && precioSugeridoV > 0 ? (
                      /* Solo hay costo → mostrar precio sugerido */
                      <button
                        type="button"
                        onClick={() => setValue(`variants.${idx}.precio_variante`, Math.round(precioSugeridoV))}
                        className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        Aplicar precio sugerido → {fmt(precioSugeridoV)}
                      </button>
                    ) : (
                      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-600">
                        Ingresá costo de compra para calcular precio sugerido
                      </p>
                    )}

                    {/* Aviso si el precio difiere del sugerido */}
                    {costoV > 0 && precioV > 0 && precioSugeridoV > 0 && Math.abs(precioV - precioSugeridoV) > 1 && (
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2.5 py-1.5">
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          Precio sugerido: <span className="font-semibold">{fmt(precioSugeridoV)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setValue(`variants.${idx}.precio_variante`, Math.round(precioSugeridoV))}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 underline"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className={LABEL_CLS}>Vencimiento</label>
                      <input
                        type="date"
                        {...register(`variants.${idx}.fecha_vencimiento`)}
                        className={DATE_SM_CLS}
                      />
                    </div>
                    <Input
                      label="Código de barras"
                      {...register(`variants.${idx}.barcode`)}
                    />
                  </div>

                  {/* Suma inteligente de stock */}
                  <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Stock actual</p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{stockActual} u.</p>
                      </div>
                      <span className="text-gray-300 dark:text-gray-600">+</span>
                      <div className="w-20">
                        <p className="text-xs text-gray-400">Agregar</p>
                        <input
                          type="number"
                          min="0"
                          {...register(`variants.${idx}.cantidad_agregar`, { valueAsNumber: true })}
                          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <span className="text-gray-300 dark:text-gray-600">=</span>
                      <div className="flex-1 text-right">
                        <p className="text-xs text-gray-400">Nuevo total</p>
                        <p className={`text-sm font-bold ${stockNuevo > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {stockNuevo} u.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() =>
                appendVariant({
                  nombre: '',
                  activo: true,
                  stock_actual: 0,
                  cantidad_agregar: 0,
                  stock_minimo: 5,
                  barcode: null,
                })
              }
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 px-4 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar variante
            </button>
          </div>
        )}
      </div>

      {apiError && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{apiError}</p>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  )
}
