export const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export interface MpItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  currency_id?: string
}

export interface MpPreferenceResult {
  id: string
  init_point: string
  sandbox_init_point: string
}

export async function createPreference(
  items: MpItem[],
  externalReference: string,
  payerEmail?: string
): Promise<MpPreferenceResult> {
  // MP producción rechaza localhost como back_url — auto_return solo en dominios públicos
  const isLocalhost = APP_URL.includes('localhost') || APP_URL.includes('127.0.0.1')

  const body = {
    items: items.map((item) => ({
      ...item,
      currency_id: 'ARS',
    })),
    external_reference: externalReference,
    payer: payerEmail ? { email: payerEmail } : undefined,
    back_urls: {
      success: `${APP_URL}/pago/exitoso`,
      failure: `${APP_URL}/pago/fallido`,
      pending: `${APP_URL}/pago/pendiente`,
    },
    // auto_return requiere back_url público — se omite en desarrollo local
    ...(!isLocalhost && { auto_return: 'approved' }),
    notification_url: `${APP_URL}/api/mercadopago/webhook`,
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error al crear preferencia MP: ${error}`)
  }

  return response.json() as Promise<MpPreferenceResult>
}
