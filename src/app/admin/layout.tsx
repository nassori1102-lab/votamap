import { redirect } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {children}
    </div>
  )
}