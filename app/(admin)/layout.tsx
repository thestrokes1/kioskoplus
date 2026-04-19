// Layout pass-through — las rutas admin reales están en app/admin/
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
