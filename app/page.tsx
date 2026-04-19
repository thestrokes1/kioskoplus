import { createClient } from '@/lib/supabase/server'
import { ProductGrid } from '@/components/tienda/ProductGrid'
import { PromoSection } from '@/components/tienda/PromoSection'
import { Cart } from '@/components/tienda/Cart'
import { CheckoutModal } from '@/components/tienda/CheckoutModal'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { NavbarTienda } from '@/components/tienda/NavbarTienda'
import type { Product, Category, Profile } from '@/types/index'

export const revalidate = 0

export default async function TiendaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: products }, { data: categories }, { data: profile }] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(*), product_variants(*)')
      .eq('activo', true)
      .order('nombre'),
    supabase.from('categories').select('*').order('nombre'),
    user
      ? supabase.from('profiles').select('nombre, apellido, role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <>
      <NavbarTienda user={profile as Pick<Profile, 'nombre' | 'apellido' | 'role'> | null} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 min-h-screen">
        <PromoSection />
        <ProductGrid
          products={(products as Product[]) ?? []}
          categories={(categories as Category[]) ?? []}
        />
      </main>
      <Cart />
      <CheckoutModal />
      <ToastContainer />
    </>
  )
}
