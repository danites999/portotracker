'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { ringkas } from '@/lib/seri'

export type Jenis = 'saham' | 'ussaham' | 'indeks' | 'crypto' | 'forex' | 'emas'
export type Pil = { j: Jenis; s: string; n: string }
type Hasil = { seri: [string, number][]; potong: boolean }

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const RENTANG: [string, number, string][] = [['1M', 31, '1 Bulan'], ['3M', 92, '3 Bulan'], ['6M', 183, '6 Bulan'], ['1Y', 366, '1 Tahun'], ['5Y', 1826, '5 Tahun']]
const INDEKS: [string, string][] = [['JKSE', 'IHSG'], ['GSPC', 'S&P 500'], ['IXIC', 'Nasdaq'], ['DJI', 'Dow Jones'], ['N225', 'Nikkei 225'], ['HSI', 'Hang Seng']]
const MATA = ['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'AUD', 'MYR', 'CNY', 'HKD', 'SAR']
const JENIS: [Jenis, string, string][] = [['saham', 'Saham', 'BBCA'], ['ussaham', 'Saham AS & ETF', 'AAPL'], ['indeks', 'Indeks', 'JKSE'], ['crypto', 'Crypto', 'bitcoin'], ['forex', 'Forex', 'USD'], ['emas', 'Emas', '']]
const POPULER: Pil[] = [
  { j: 'indeks', s: 'JKSE', n: 'IHSG' }, { j: 'saham', s: 'BBCA', n: 'BBCA' }, { j: 'saham', s: 'BBRI', n: 'BBRI' }, { j: 'saham', s: 'BMRI', n: 'BMRI' }, { j: 'saham', s: 'BBNI', n: 'BBNI' },
  { j: 'saham', s: 'TLKM', n: 'TLKM' }, { j: 'saham', s: 'ASII', n: 'ASII' }, { j: 'ussaham', s: 'AAPL', n: 'AAPL' }, { j: 'ussaham', s: 'NVDA', n: 'NVDA' }, { j: 'ussaham', s: 'VOO', n: 'VOO' }, { j: 'ussaham', s: 'QQQ', n: 'QQQ' }, { j: 'emas', s: '', n: 'Emas' }, { j: 'forex', s: 'USD', n: 'USD/IDR' }, { j: 'crypto', s: 'bitcoin', n: 'Bitcoin' }, { j: 'crypto', s: 'ethereum', n: 'Ethereum' },
]

export function Charts({ t, punya }: { t: (s: string) => string; punya: Pil[] }) {
  const loc = t('id-ID')
  const [j, setJ] = useState<Jenis>('indeks'), [s, setS] = useState('JKSE'), [r, setR] = useState('3M'), [input, setInput] = useState('')
  const [data, setData] = useState<Hasil | 'gagal' | null>(null)
  const [opsi, setOpsi] = useState<{ id: string; symbol: string; name: string }[]>([])
  const simpan = useRef<Record<string, Hasil>>({})
  const hari = RENTANG.find(x => x[0] === r)![1]
  const dari = useMemo(() => new Date(Date.now() - hari * 864e5).toISOString().slice(0, 10), [hari])

  useEffect(() => {
    const key = `${j}|${s}|${r}`
    if (simpan.current[key]) { setData(simpan.current[key]); return }
    let on = true
    setData(null)
    fetch(`/api/riwayat?k=${j}&s=${encodeURIComponent(s)}&dari=${dari}`).then(x => x.json()).then(x => {
      if (!on) return
      if (Array.isArray(x.seri) && x.seri.length > 1) { const v = { seri: x.seri, potong: !!x.terpotong }; simpan.current[key] = v; setData(v) } else setData('gagal')
    }).catch(() => on && setData('gagal'))
    return () => { on = false }
  }, [j, s, r, dari])

  const pts = useMemo(() => (data && data !== 'gagal' ? data.seri.filter(p => p[0] >= dari).map(p => ({ t: p[0], v: p[1] })) : []), [data, dari])
  const pilihJenis = (x: Jenis) => { const d = JENIS.find(y => y[0] === x)!; setJ(x); setS(d[2]); setInput('') }
  const pilihChip = (p: Pil) => { setJ(p.j); setS(p.s); setInput('') }
  const cari = () => {
    const x = input.trim()
    if (j === 'saham' && /^[A-Za-z0-9]{2,6}$/.test(x)) setS(x.toUpperCase())
    if (j === 'ussaham' && /^[A-Za-z0-9.-]{1,10}$/.test(x)) setS(x.toUpperCase())
    if (j === 'crypto' && /^[A-Za-z0-9-]{1,60}$/.test(x)) setS(x.toLowerCase())
  }
  const ketik = (v: string) => {
    setInput(v)
    if (j === 'crypto' && v.length > 1) fetch(`/api/crypto?q=${encodeURIComponent(v)}`).then(x => x.json()).then(x => setOpsi(x.coins || [])).catch(() => {})
  }

  const usd = j === 'ussaham', idr = j !== 'indeks' && !usd
  const fmt = (n: number) => { const x = n.toLocaleString(loc, { maximumFractionDigits: n < 1 ? 6 : n < 1000 ? 2 : 0 }); return usd ? `US$ ${n.toLocaleString(loc, { maximumFractionDigits: 2 })}` : idr ? `Rp ${x}` : n.toLocaleString(loc, { maximumFractionDigits: 2 }) }
  const nama = j === 'indeks' ? INDEKS.find(x => x[0] === s)?.[1] || s : j === 'forex' ? `${s}/IDR` : j === 'emas' ? t('Emas (per gram)') : s.toUpperCase()
  const tgl = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const tick = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, hari > 200 ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const first = pts[0], last = pts[pts.length - 1]
  const hi = pts.length ? pts.reduce((m, p) => (p.v > m.v ? p : m), pts[0]) : null, lo = pts.length ? pts.reduce((m, p) => (p.v < m.v ? p : m), pts[0]) : null
  const ubah = first && last ? (last.v / first.v - 1) * 100 : 0, naik = ubah >= 0, wr = naik ? '#059669' : '#dc2626'
  const seg = (aktif: boolean) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${aktif ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`
  const chip = (p: Pil) => <button key={`${p.j}|${p.s}`} onClick={() => pilihChip(p)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${p.j === j && p.s === s ? 'bg-emerald-700 text-white' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}>{p.n}</button>
  const stat = (l: string, v: string, cls = '') => <div key={l}><p className="text-xs text-slate-500">{l}</p><p className={`text-sm font-medium ${cls}`}>{v}</p></div>
  const msg = 'flex h-72 items-center justify-center text-center text-sm text-slate-500'

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-3`}>
        <div><h2 className="text-lg font-semibold">{t('Charts')}</h2><p className="text-sm text-slate-500">{t('Lihat pergerakan harga saham, indeks, crypto, kurs, dan emas.')}</p></div>
        <div className="flex flex-wrap gap-1.5">{JENIS.map(([id, n]) => <button key={id} className={seg(j === id)} onClick={() => pilihJenis(id)}>{t(n)}</button>)}</div>
        {(j === 'saham' || j === 'ussaham' || j === 'crypto') && (
          <div className="flex max-w-md gap-2">
            <input list={j === 'crypto' ? 'coins-chart' : undefined} placeholder={j === 'saham' ? t('Kode saham (mis. BBCA)') : j === 'ussaham' ? t('Kode saham/ETF AS (mis. AAPL, VOO)') : t('ID coin CoinGecko (mis. bitcoin)')} value={input} onChange={e => ketik(e.target.value)} onKeyDown={e => e.key === 'Enter' && cari()} />
            <button className="btn-p" onClick={cari}>{t('Tampilkan')}</button>
            <datalist id="coins-chart">{opsi.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}</datalist>
          </div>
        )}
        {j === 'indeks' && <div className="flex flex-wrap gap-1.5">{INDEKS.map(([id, n]) => <button key={id} className={seg(s === id)} onClick={() => setS(id)}>{n}</button>)}</div>}
        {j === 'forex' && <select className="!w-auto" value={s} onChange={e => setS(e.target.value)}>{MATA.map(m => <option key={m} value={m}>{m}/IDR</option>)}</select>}
        {punya.length > 0 && <div><p className="mb-1 text-xs text-slate-500">{t('Aset saya')}</p><div className="flex flex-wrap gap-1.5">{punya.map(chip)}</div></div>}
        <div><p className="mb-1 text-xs text-slate-500">{t('Populer')}</p><div className="flex flex-wrap gap-1.5">{POPULER.map(chip)}</div></div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{nama}</h3>
            {last && <p className="text-2xl font-semibold tabular-nums">{fmt(last.v)}</p>}
            {last && <p className={`text-sm font-medium tabular-nums ${naik ? 'text-emerald-600' : 'text-red-600'}`}>{naik ? '▲' : '▼'} {naik ? '+' : ''}{ubah.toFixed(2)}% <span className="font-normal text-slate-500">· {t(RENTANG.find(x => x[0] === r)![2])}</span></p>}
          </div>
          <div className="flex flex-wrap gap-1.5">{RENTANG.map(([id, , n]) => <button key={id} className={seg(r === id)} onClick={() => setR(id)}>{t(n)}</button>)}</div>
        </div>
        <div className="mt-4">
          {data === null ? <p className={msg}>{t('Memuat grafik…')}</p>
            : data === 'gagal' || pts.length < 2 ? <p className={msg}>{t('Data tidak tersedia untuk pilihan ini. Periksa kodenya atau coba lagi nanti.')}</p>
            : <div className="h-72"><ResponsiveContainer><AreaChart data={ringkas(pts, 400)}>
              <XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={tick} minTickGap={40} />
              <YAxis orientation="right" width={70} tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toLocaleString(loc, { notation: 'compact', maximumFractionDigits: 2 })} />
              <Tooltip formatter={(v: number) => [fmt(v), t('Harga')]} labelFormatter={(x: string) => tgl(x)} />
              <Area dataKey="v" type="monotone" stroke={wr} strokeWidth={2} fill={wr + '26'} />
            </AreaChart></ResponsiveContainer></div>}
        </div>
        {last && hi && lo && first && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stat(t('Harga terakhir'), fmt(last.v))}
          {stat(t('Tertinggi'), `${fmt(hi.v)} (${tgl(hi.t)})`)}
          {stat(t('Terendah'), `${fmt(lo.v)} (${tgl(lo.t)})`)}
          {stat(t('Perubahan'), `${naik ? '+' : ''}${ubah.toFixed(2)}%`, naik ? 'text-emerald-600' : 'text-red-600')}
        </div>}
        <p className="mt-3 text-xs text-slate-500">{t('Sumber: Yahoo Finance dan CoinGecko, penutupan harian. Harga saham tertunda sekitar 10-15 menit.')}{data && data !== 'gagal' && data.potong && ` ${t('Data harga crypto gratis hanya mencakup 365 hari terakhir.')}`}</p>
      </div>
    </div>
  )
}
