import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
export const metadata: Metadata = { title: 'Portfolio Tracker', description: 'Pantau portofolio saham Indonesia dan AS, ETF, reksadana, crypto, emas, properti dan deposito', authors: [{ name: 'Dani' }], creator: 'Dani', applicationName: 'Portfolio Tracker' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Skrip kecil ini memasang tema tersimpan (atau pengaturan perangkat) sebelum halaman tampil, supaya tidak berkedip terang dulu.
  const skripTema = `try{var t=localStorage.getItem('tema');var g=t==='gelap'||(t!=='terang'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',g);document.documentElement.style.colorScheme=g?'dark':'light'}catch(e){}`
  return (
    <html lang="id" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: skripTema }} /></head>
      <body className={jakarta.variable}>{children}</body>
    </html>
  )
}
