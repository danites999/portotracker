'use client'
import { useEffect, useState } from 'react'

type Item = { jenis: string; n: string; h: number; p: number }

// Running text harga pasar di bagian bawah layar: ▲ hijau = naik, ▼ merah = turun dibanding penutupan sebelumnya.
export function Ticker({ saham, mata, t }: { saham: string[]; mata: string[]; t: (s: string) => string }) {
  const [items, setItems] = useState<Item[]>([])
  const kunci = `${saham.join(',')}|${mata.join(',')}`, loc = t('id-ID')
  useEffect(() => {
    let on = true
    const ambil = () => fetch(`/api/ticker?saham=${encodeURIComponent(saham.join(','))}&mata=${encodeURIComponent(mata.join(','))}`).then(r => r.json()).then(j => { if (on && Array.isArray(j.items) && j.items.length) setItems(j.items) }).catch(() => {})
    ambil()
    const id = setInterval(ambil, 5 * 60 * 1000)
    return () => { on = false; clearInterval(id) }
  }, [kunci])
  if (!items.length) return null
  const fmt = (n: number) => n.toLocaleString(loc, { maximumFractionDigits: n >= 1000 ? 0 : 2 })
  const baris = (salin: boolean) => (
    <div className="inline-flex shrink-0 items-center" aria-hidden={salin || undefined}>
      {items.map((x, i) => {
        const naik = x.p > 0.005, turun = x.p < -0.005
        return (
          <span key={i} className="inline-flex items-center gap-1.5 px-4">
            <b className="font-semibold">{x.n}</b>
            <span className={naik ? 'text-emerald-500' : turun ? 'text-red-500' : 'text-slate-400'}>{naik ? '▲' : turun ? '▼' : '■'}<span className="sr-only">{naik ? t('naik') : turun ? t('turun') : ''}</span></span>
            <span className="tabular-nums">{fmt(x.h)}</span>
            <span className={`text-xs tabular-nums ${naik ? 'text-emerald-500' : turun ? 'text-red-500' : 'text-slate-400'}`}>{x.p > 0 ? '+' : ''}{x.p.toFixed(2)}%</span>
          </span>
        )
      })}
    </div>
  )
  return (
    <div className="ticker fixed inset-x-0 bottom-0 z-10 overflow-hidden whitespace-nowrap border-t border-slate-200 bg-white/95 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" role="region" aria-label={t('Harga pasar berjalan')}>
      <div className="ticker-jalan inline-flex" style={{ animationDuration: `${Math.max(40, items.length * 5)}s` }}>{baris(false)}{baris(true)}</div>
    </div>
  )
}
