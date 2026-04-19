// Minimal root layout for /admin — no auth check here.
// Auth is enforced by app/admin/(protected)/layout.tsx for protected pages.
// Login page at /admin/login uses this layout directly (no auth needed).
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
