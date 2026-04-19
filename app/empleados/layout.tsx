// Minimal root layout for /empleados — no auth check here.
// Auth is enforced by app/empleados/(protected)/layout.tsx for protected pages.
// Login page at /empleados/login uses this layout directly (no auth needed).
export default function EmpleadosRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
