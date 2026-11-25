'use client'
import { useEffect, useState } from 'react'

export type Tema = 'terang' | 'otomatis' | 'gelap'

// Pasang/lepas class "dark" di <html>. Skrip kecil di layout.tsx melakukan hal yang sama sebelum halaman tampil (tanpa kedip).
export function terapkanTema(t: Tema) {
  const gelap = t === 'gelap' || (t === 'otomatis' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', gelap)
  document.documentElement.style.colorScheme = gelap ? 'dark' : 'light'
}

const IKON: Record<Tema, JSX.Element> = {
  terang: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></svg>,
  otomatis: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" stroke="none" /></svg>,
  gelap: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M16.5 12.3A7 7 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8z" /></svg>,
}
const NAMA: Record<Tema, string> = { terang: 'Terang', otomatis: 'Otomatis', gelap: 'Gelap' }

export function TemaToggle({ t }: { t: (s: string) => string }) {
  const [tema, setTema] = useState<Tema>('otomatis')
  useEffect(() => { try { const s = localStorage.getItem('tema'); if (s === 'terang' || s === 'gelap') setTema(s) } catch {} }, [])
  useEffect(() => { // mode otomatis mengikuti pengaturan perangkat, termasuk saat berubah di tengah pemakaian
    if (tema !== 'otomatis') return
    const mq = matchMedia('(prefers-color-scheme: dark)'), f = () => terapkanTema('otomatis')
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [tema])
  const pilih = (x: Tema) => {
    setTema(x)
    try { if (x === 'otomatis') localStorage.removeItem('tema'); else localStorage.setItem('tema', x) } catch {}
    terapkanTema(x)
  }
  return (
    <div role="group" aria-label={t('Tema')} className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
      {(['terang', 'otomatis', 'gelap'] as Tema[]).map(x => (
        <button key={x} onClick={() => pilih(x)} aria-pressed={tema === x} aria-label={t(NAMA[x])} title={t(NAMA[x])}
          className={`px-2 py-1.5 ${tema === x ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{IKON[x]}</button>
      ))}
    </div>
  )
}
