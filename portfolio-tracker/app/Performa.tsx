'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts'
import { Mentah, hariIni, ringkas } from '@/lib/seri'
import { Pt, Rentang, RENTANG, tanggalMulai, hitungPerforma, seriBenchmark, gabungPerforma } from '@/lib/performa'

type Bench = { id: string; n: string; k: 'indeks' | 'emas' | 'crypto' | 'forex' | 'saham' | 'ussaham'; s: string }
const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const PRESET: Bench[] = [
  { id: 'ihsg', n: 'IHSG', k: 'indeks', s: 'JKSE' }, { id: 'spx', n: 'S&P 500', k: 'indeks', s: 'GSPC' }, { id: 'ndx', n: 'Nasdaq', k: 'indeks', s: 'IXIC' },
  { id: 'dji', n: 'Dow Jones', k: 'indeks', s: 'DJI' }, { id: 'n225', n: 'Nikkei 225', k: 'indeks', s: 'N225' }, { id: 'hsi', n: 'Hang Seng', k: 'indeks', s: 'HSI' },
  { id: 'emas', n: 'Emas', k: 'emas', s: '' }, { id: 'btc', n: 'Bitcoin', k: 'crypto', s: 'bitcoin' }, { id: 'usd', n: 'USD/IDR', k: 'forex', s: 'USD' },
]
const WARNA = ['#2563eb', '#d97706', '#7c3aed'] // warna garis pembanding (portofolio selalu hijau)
const NAMA_R: Record<Rentang, string> = { '1M': '1M', '6M': '6M', YTD: 'YTD', '1Y': '1Y', ALL: 'ALL' }
type Entri = { m: Mentah; potong: boolean } | 'gagal'

export function Performa({ t, seri, income, memuat }: { t: (s: string) => string; seri: Pt[]; income: Record<string, number>; memuat: boolean }) {
  const loc = t('id-ID'), today = hariIni()
  const [r, setR] = useState<Rentang>('1Y'), [pilih, setPilih] = useState<Bench[]>([PRESET[0], PRESET[1]]), [dgn, setDgn] = useState(true)
  const [cache, setCache] = useState<Record<string, Entri>>({})
  const sedang = useRef(new Set<string>())
  const [jenisKu, setJenisKu] = useState<'saham' | 'ussaham'>('saham'), [kodeKu, setKodeKu] = useState(''), [errKu, setErrKu] = useState('')

  const awal = seri[0]?.t || today
  const mulai = useMemo(() => tanggalMulai(r, today, awal), [r, today, awal])
  const port = useMemo(() => hitungPerforma(seri, income, dgn, mulai), [seri, income, dgn, mulai])
  const kunci = (b: Bench) => `${b.k}|${b.s}|${port.mulaiEfektif}`

  useEffect(() => { // ambil harga benchmark sekali per (benchmark, tanggal mulai)
    if (!port.pts.length) return
    pilih.forEach(b => {
      const key = kunci(b)
      if (cache[key] || sedang.current.has(key)) return
      sedang.current.add(key)
      fetch(`/api/riwayat?k=${b.k}&s=${encodeURIComponent(b.s)}&dari=${port.mulaiEfektif}`).then(x => x.json())
        .then(x => setCache(p => ({ ...p, [key]: Array.isArray(x.seri) && x.seri.length ? { m: x.seri, potong: !!x.terpotong } : 'gagal' })))
        .catch(() => setCache(p => ({ ...p, [key]: 'gagal' })))
        .finally(() => sedang.current.delete(key))
    })
  }, [pilih, port.mulaiEfektif, port.pts.length, cache])

  const bench = pilih.map((b, i) => { const e = cache[kunci(b)]; return { ...b, warna: WARNA[i % WARNA.length], status: !e ? 'muat' : e === 'gagal' ? 'gagal' : 'ok', peta: e && e !== 'gagal' ? seriBenchmark(e.m, port.mulaiEfektif, today) : new Map<string, number>(), potong: !!(e && e !== 'gagal' && e.potong) } })
  const gab = useMemo(() => gabungPerforma(port, bench.filter(b => b.status === 'ok').map(b => ({ id: b.id, peta: b.peta }))), [port, JSON.stringify(bench.map(b => [b.id, b.status, b.peta.size]))])
  const data = ringkas(gab.data, 400)

  const toggle = (b: Bench) => setPilih(p => (p.some(x => x.id === b.id) ? p.filter(x => x.id !== b.id) : p.length >= 3 ? p : [...p, b]))
  const tambahKu = () => {
    const x = kodeKu.trim().toUpperCase(), ok = jenisKu === 'saham' ? /^[A-Z0-9]{2,6}$/.test(x) : /^[A-Z0-9.-]{1,10}$/.test(x)
    if (!ok) return setErrKu(t('Kode tidak valid'))
    if (pilih.length >= 3) return setErrKu(t('Maksimal 3 pembanding. Lepas salah satu dulu.'))
    const b: Bench = { id: `${jenisKu}-${x}`, n: x, k: jenisKu, s: x }
    if (!pilih.some(y => y.id === b.id)) setPilih(p => [...p, b])
    setKodeKu(''); setErrKu('')
  }

  const pct = (n: number | undefined) => (n == null ? '-' : `${n > 0 ? '+' : ''}${n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`)
  const warnaPct = (n: number | undefined) => (n == null ? '' : n >= 0 ? 'text-emerald-600' : 'text-red-600')
  const tgl = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const tick = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, data.length > 200 ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const seg = (aktif: boolean) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${aktif ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`
  const chip = (b: Bench) => { const aktif = pilih.some(x => x.id === b.id); return <button key={b.id} onClick={() => toggle(b)} aria-pressed={aktif} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${aktif ? 'bg-emerald-700 text-white' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}>{b.n}</button> }
  const ada = port.pts.length > 1, kurangData = ada && mulai < port.mulaiEfektif && r !== 'ALL'
  const rp = gab.akhir.p

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-3`}>
        <div><h2 className="text-lg font-semibold">{t('Performa vs Benchmark')}</h2><p className="text-sm text-slate-500">{t('Bandingkan return portofoliomu dengan acuan pasar pada rentang waktu yang sama.')}</p></div>
        <div className="flex flex-wrap gap-1.5">{RENTANG.map(x => <button key={x} className={seg(r === x)} onClick={() => setR(x)}>{NAMA_R[x]}</button>)}</div>
        <div><p className="mb-1 text-xs text-slate-500">{t('Pembanding (maks. 3)')}</p><div className="flex flex-wrap gap-1.5">{PRESET.map(chip)}{pilih.filter(b => !PRESET.some(p => p.id === b.id)).map(chip)}</div></div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="!w-auto" aria-label={t('Jenis')} value={jenisKu} onChange={e => setJenisKu(e.target.value as 'saham' | 'ussaham')}><option value="saham">{t('Saham')}</option><option value="ussaham">{t('Saham AS & ETF')}</option></select>
          <input className="!w-40" placeholder={jenisKu === 'saham' ? 'BBCA' : 'AAPL, VOO'} value={kodeKu} onChange={e => setKodeKu(e.target.value)} onKeyDown={e => e.key === 'Enter' && tambahKu()} />
          <button className="btn" onClick={tambahKu}>{t('Tambah pembanding')}</button>
          {errKu && <span className="text-sm text-red-600">{errKu}</span>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="!w-auto" checked={dgn} onChange={e => setDgn(e.target.checked)} />{t('Termasuk dividen, kupon, dan sewa yang kucatat')}</label>
      </div>

      <div className={card}>
        {!ada ? <p className="py-10 text-center text-sm text-slate-500">{memuat ? t('Memuat riwayat harga…') : t('Belum cukup data portofolio. Tambahkan aset dengan tanggal beli sebelum hari ini.')}</p> : <>
          <p className="mb-3 text-sm text-slate-500">{tgl(port.mulaiEfektif)} - {tgl(today)}{memuat && ` · ${t('Memuat riwayat harga…')}`}</p>
          {kurangData && <p className="mb-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">{t('Data portofoliomu baru ada sejak')} {tgl(port.mulaiEfektif)}. {t('Perbandingan dihitung dari tanggal itu.')}</p>}
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="px-2 py-2 font-medium">{t('Nama')}</th><th className="px-2 py-2 text-right font-medium">{t('Return')}</th><th className="px-2 py-2 text-right font-medium">{t('Portofoliomu vs pembanding')}</th></tr></thead>
            <tbody>
              <tr className="border-t border-slate-200 dark:border-slate-800"><td className="px-2 py-2.5 font-medium"><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: '#059669' }} />{t('Portofoliomu')}</td><td className={`px-2 py-2.5 text-right text-base font-semibold tabular-nums ${warnaPct(rp)}`}>{pct(rp)}</td><td /></tr>
              {bench.map(b => { const v = gab.akhir[b.id], sel = rp != null && v != null ? rp - v : undefined; return (
                <tr key={b.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-2 py-2.5"><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: b.warna }} />{b.n}</td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${b.status === 'ok' ? warnaPct(v) : 'text-slate-400'}`}>{b.status === 'muat' ? t('Memuat…') : b.status === 'gagal' ? t('Data gagal dimuat') : pct(v)}</td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${warnaPct(sel)}`}>{sel == null ? '-' : `${sel >= 0 ? t('Unggul') : t('Tertinggal')} ${Math.abs(sel).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('poin')}`}</td>
                </tr>) })}
            </tbody>
          </table></div>
          <div className="mt-4 h-72"><ResponsiveContainer><LineChart data={data}>
            <XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={tick} minTickGap={40} />
            <YAxis orientation="right" width={56} tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v: number) => `${v.toLocaleString(loc, { maximumFractionDigits: 0 })}%`} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Tooltip formatter={(v: number, name: string) => [pct(v), name]} labelFormatter={(x: string) => tgl(x)} />
            <Legend verticalAlign="top" height={28} iconType="plainline" />
            <Line name={t('Portofoliomu')} dataKey="p" type="monotone" stroke="#059669" strokeWidth={3} dot={false} />
            {bench.filter(b => b.status === 'ok').map(b => <Line key={b.id} name={b.n} dataKey={b.id} type="monotone" stroke={b.warna} strokeWidth={1.75} dot={false} />)}
          </LineChart></ResponsiveContainer></div>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            <li>{t('Return portofolio dihitung time-weighted: menambah dana tidak dianggap sebagai untung. Dihitung dari tanggal beli tiap aset dengan harga historis; aset tanpa data harga dianggap datar.')}</li>
            <li>{t('Indeks asing dalam mata uang aslinya (belum dikonversi ke rupiah). Saham AS di portofolio juga dihitung tanpa selisih kurs, jadi cocok dibandingkan dengan S&P 500 atau Nasdaq.')}</li>
            {bench.some(b => b.potong) && <li>{t('Data harga crypto gratis hanya mencakup 365 hari terakhir.')}</li>}
          </ul>
        </>}
      </div>
    </div>
  )
}
