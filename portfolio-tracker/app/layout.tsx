import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
export const metadata: Metadata = { title: 'Portfolio Tracker', description: 'Pantau portofolio saham, reksadana, crypto dan deposito', authors: [{ name: 'Dani' }], creator: 'Dani', applicationName: 'Portfolio Tracker' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body className={jakarta.variable}>{children}</body></html>
}
