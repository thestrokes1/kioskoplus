import { NextRequest, NextResponse } from 'next/server'
import { createPreference } from '@/lib/mercadopago'
import { z } from 'zod'

const PreferenceSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1),
  payer_email: z.string().email().optional(),
  external_reference: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Verificar variables de entorno antes de procesar
  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json(
      { data: null, error: 'MP_ACCESS_TOKEN no configurado en el servidor' },
      { status: 503 }
    )
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json(
      { data: null, error: 'NEXT_PUBLIC_APP_URL no configurado en el servidor' },
      { status: 503 }
    )
  }

  try {
    const body: unknown = await request.json()
    const parsed = PreferenceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { items, payer_email, external_reference } = parsed.data
    const ref = external_reference ?? `kiosko-${Date.now()}`

    const preference = await createPreference(items, ref, payer_email)

    return NextResponse.json({
      data: {
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      },
      error: null,
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Error desconocido'
    // Ocultar detalles internos de la API de MP en producción
    const message =
      process.env.NODE_ENV === 'development'
        ? `Error MP: ${raw}`
        : 'No se pudo crear la preferencia de pago. Intentá de nuevo.'
    return NextResponse.json({ data: null, error: message }, { status: 500 })
  }
}
