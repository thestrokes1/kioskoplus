import { createClient } from '@/lib/supabase/server'
import type { Profile, Role } from '@/types/index'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getRole(): Promise<Role | null> {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as Role) ?? null
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data
}

export async function requireRole(allowed: Role[]): Promise<Profile | null> {
  const role = await getRole()
  if (!role || !allowed.includes(role)) return null
  return getProfile()
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
