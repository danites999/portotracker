'use client'
import { RefObject, useEffect, useState } from 'react'

export type FiturId = 'charts' | 'rebalancing' | 'analisis' | 'perencanaan' | 'performa' | 'kalender' | 'kalkulator'

// Menu fitur dan alat: dipisah dari menu utama (Ringkasan total, Investasi). Hanya tampil di luar menu Investasi.
// Layar lebar: panel vertikal di sisi kanan, bisa dilipat jadi deretan ikon, dan tetap terlihat saat halaman digulir.
// Layar kecil: berubah jadi satu baris tombol yang bisa digeser, di atas konten.
const FITUR: { id: FiturId; nama: string; ikon: string }[] = [
  { id: 'charts', nama: 'Charts', ikon: '📈' },
  { id: 'rebalancing', nama: 'Rebalancing', ikon: '⚖️' },
  { id: 'analisis', nama: 'Analisis & alokasi dana', ikon: '🧭' },
  { id: 'perencanaan', nama: 'Perencanaan tujuan', ikon: '🌱' },
  { id: 'performa', nama: 'Performa vs Benchmark', ikon: '🎯' },
  { id: 'kalender', nama: 'Kalender ekonomi', ikon: '📅' },
  { id: 'kalkulator', nama: 'Kalkulator forex', ikon: '💱' },
]

export function PanelFitur({ t, aktif, onPilih, buka, onBuka, headerRef }: {
  t: (s: string) => string
  aktif: string
  onPilih: (id: FiturId) => void
  buka: boolean
  onBuka: (b: boolean) => void
  headerRef: RefObject<HTMLElement>
}) {
  // Panel menempel tepat di bawah header yang menempel di atas layar, berapa pun tinggi header-nya.
  const [atas, setAtas] = useState(160)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ukur = () => setAtas(el.offsetHeight + 12)
    ukur()
    const ro = new ResizeObserver(ukur)
    ro.observe(el)
    return () => ro.disconnect()
  }, [headerRef])

  return (
    <aside aria-label={t('Fitur & alat')} className="order-first min-w-0 lg:sticky lg:order-last lg:self-start" style={{ top: atas }}>
      <div className="rounded-xl border border-slate-300 bg-slate-100/70 p-2 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 lg:block">
          <div className={`flex shrink-0 items-center px-1 lg:pb-2 lg:pt-1 ${buka ? 'justify-between' : 'justify-center'}`}>
            <p className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${buka ? '' : 'lg:hidden'}`}>{t('Fitur & alat')}</p>
            <button
              type="button"
              onClick={() => onBuka(!buka)}
              aria-expanded={buka}
              aria-label={t(buka ? 'Lipat panel fitur' : 'Buka panel fitur')}
              title={t(buka ? 'Lipat panel fitur' : 'Buka panel fitur')}
              className="hidden rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-200 lg:block dark:text-slate-400 dark:hover:bg-slate-800"
            >{buka ? '»' : '«'}</button>
          </div>
          <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {FITUR.map(f => {
              const on = aktif === f.id
              return (
                <li key={f.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => onPilih(f.id)}
                    aria-current={on ? 'page' : undefined}
                    title={t(f.nama)}
                    className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-sm lg:items-start lg:whitespace-normal ${buka ? '' : 'lg:justify-center lg:px-0'} ${on ? 'bg-emerald-50 font-medium text-emerald-800 ring-1 ring-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    <span aria-hidden="true" className="leading-5">{f.ikon}</span>
                    <span className={`min-w-0 break-words leading-5 ${buka ? '' : 'lg:sr-only'}`}>{t(f.nama)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </aside>
  )
}
