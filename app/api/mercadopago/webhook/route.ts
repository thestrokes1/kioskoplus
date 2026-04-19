import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MpWebhookBody {
  action?: string
  type?: string
  data?: { id?: string }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MpWebhookBody
    const { type, data } = body

    if (type !== 'payment' || !data?.id) {
      return NextResponse.json({ received: true })
    }

    const paymentId = String(data.id)

    // Consultar estado del pago a MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })

    if (!mpRes.ok) {
      return NextResponse.json({ received: true })
    }

    const payment = (await mpRes.json()) as {
      status: string
      external_reference?: string
    }

    const status = payment.status as 'approved' | 'pending' | 'rejected'

    const supabase = await createClient()

    // Actualizar venta si tiene external_reference
    if (payment.external_reference) {
      await supabase
        .from('sales')
        .update({
          mp_payment_id: paymentId,
          mp_status: status,
          estado: status === 'approved' ? 'completada' : status === 'rejected' ? 'cancelada' : 'pendiente',
        })
        .eq('mp_payment_id', payment.external_reference)
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: true })
  }
}
