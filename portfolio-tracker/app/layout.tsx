import './globals.css'
import type { Metadata, Viewport } from 'next'
export const metadata: Metadata = { title: 'Portfolio Tracker', description: 'Pantau portofolio saham, reksadana, crypto dan deposito' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>
}
