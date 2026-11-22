'use client'
import { useEffect, useMemo, useState } from 'react'

type Ev = { judul: string; negara: string; waktu: string; dampak: string; perkiraan: string; sebelumnya: string }
const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const LEVEL: Record<string, number> = { High: 3, Medium: 2, Low: 1, Holiday: 0 }
const WARNA: Record<string, string> = { High: '#dc2626', Medium: '#ea580c', Low: '#ca8a04', Holiday: '#94a3b8' }
const NAMA: Record<string, string> = { High: 'Tinggi', Medium: 'Sedang', Low: 'Rendah', Holiday: 'Libur' }
const hariKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD menurut zona waktu perangkat

export function Kalender({ t }: { t: (s: string) => string }) {
  const loc = t('id-ID')
  const [st, setSt] = useState<{ items: Ev[]; error?: boolean } | null>(null)
  const [min, setMin] = useState(0)        // 0 semua, 2 sedang ke atas, 3 tinggi saja
  const [neg, setNeg] = useState('all')
  const [hariIni, setHariIni] = useState(false)
  useEffect(() => {
    let on = true
    fetch('/api/kalender').then(r => r.json()).then(j => on && setSt(j)).catch(() => on && setSt({ items: [], error: true }))
    return () => { on = false }
  }, [])
  const items = st?.items || []
  const negara = useMemo(() => Array.from(new Set(items.map(e => e.negara))).sort(), [items])
  const today = new Date().toLocaleDateString('en-CA'), now = Date.now()
  const tampil = items.filter(e => (min === 0 || (LEVEL[e.dampak] ?? 0) >= min) && (neg === 'all' || e.negara === neg) && (!hariIni || hariKey(e.waktu) === today))
  const grup = new Map<string, Ev[]>()
  tampil.forEach(e => { const k = hariKey(e.waktu); grup.set(k, [...(grup.get(k) || []), e]) })
  const seg = (aktif: boolean) => `rounded-lg px-3 py-1.5 text-sm ${aktif ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`
  const kosong = 'py-10 text-center text-sm text-slate-500'
  return (
    <div className="space-y-3">
      <div className={card}>
        <h2 className="text-lg font-semibold">{t('Kalender ekonomi')}</h2>
        <p className="mb-3 text-sm text-slate-500">{t('Jadwal rilis data ekonomi yang sering menggerakkan pasar. Waktu mengikuti zona waktu perangkatmu.')}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5"><span className="mr-1 text-sm text-slate-500">{t('Dampak')}</span>{([[0, 'Semua'], [2, 'Sedang'], [3, 'Tinggi']] as [number, string][]).map(([n, l]) => <button key={n} className={seg(min === n)} onClick={() => setMin(n)}>{t(l)}</button>)}</div>
          <label className="flex items-center gap-2 text-sm text-slate-500">{t('Mata uang')}<select className="!w-auto" value={neg} onChange={e => setNeg(e.target.value)}><option value="all">{t('Semua')}</option>{negara.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <button className={seg(hariIni)} onClick={() => setHariIni(!hariIni)}>{t('Hari ini saja')}</button>
        </div>
      </div>

      <div className={card}>
        {!st ? <p className={kosong}>{t('Memuat kalender…')}</p>
          : st.error ? <p className={`${kosong} !text-amber-600`}>{t('Kalender gagal dimuat. Coba lagi nanti.')}</p>
          : !tampil.length ? <p className={kosong}>{t('Tidak ada peristiwa untuk filter ini.')}</p>
          : <div className="space-y-5">
            {Array.from(grup.entries()).map(([k, list]) => (
              <section key={k}>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">{new Date(k + 'T12:00:00').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{k === today && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-medium text-white">{t('Hari ini')}</span>}</h3>
                <div className="hidden grid-cols-[4.5rem_3.5rem_1fr_6rem_6rem] gap-2 px-2 pb-1 text-xs text-slate-500 sm:grid"><span>{t('Waktu')}</span><span>{t('Mata uang')}</span><span>{t('Peristiwa')}</span><span>{t('Perkiraan')}</span><span>{t('Sebelumnya')}</span></div>
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {list.map((e, i) => (
                    <li key={i} className={`grid grid-cols-[4rem_3rem_1fr] items-start gap-2 px-2 py-2 text-sm sm:grid-cols-[4.5rem_3.5rem_1fr_6rem_6rem] ${new Date(e.waktu).getTime() < now ? 'opacity-60' : ''}`}>
                      <span className="tabular-nums">{e.dampak === 'Holiday' ? t('Sepanjang hari') : new Date(e.waktu).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-semibold">{e.negara}</span>
                      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: WARNA[e.dampak] || '#94a3b8' }} /><span className="sr-only">{t(NAMA[e.dampak] || 'Rendah')}: </span>{e.judul}
                        {(e.perkiraan || e.sebelumnya) && <span className="mt-0.5 block text-xs text-slate-500 sm:hidden">{t('Perkiraan')} {e.perkiraan || '-'} · {t('Sebelumnya')} {e.sebelumnya || '-'}</span>}</span>
                      <span className="hidden tabular-nums sm:block">{e.perkiraan || '-'}</span><span className="hidden tabular-nums sm:block">{e.sebelumnya || '-'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>}
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {(['High', 'Medium', 'Low'] as const).map(d => <span key={d} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: WARNA[d] }} />{t('Dampak')} {t(NAMA[d]).toLowerCase()}</span>)}
        </p>
        <p className="mt-2 text-xs text-slate-500">{t('Sumber: feed publik Forex Factory, judul peristiwa dalam bahasa Inggris. Mencakup ekonomi utama dunia, belum termasuk data Indonesia (BI Rate, inflasi BPS). Untuk itu lihat bi.go.id dan bps.go.id.')}</p>
      </div>
    </div>
  )
}
