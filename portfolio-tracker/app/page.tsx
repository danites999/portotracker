'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, ComposedChart, Area, Line, Legend, XAxis, YAxis, ReferenceLine } from 'recharts'
import { Data, Kelas } from '@/lib/types'
import { muat, simpan, muatCloud, simpanCloud, kosong, ekspor, impor, contoh } from '@/lib/storage'
import { sb } from '@/lib/supabase'
import { tr, Lang } from '@/lib/i18n'
import { hitung, rp, Baris } from '@/lib/calc'
import { Awal, Logo, T } from './Awal'
import { Ticker } from './Ticker'
import { Kalender } from './Kalender'
import { Charts, Pil } from './Charts'
import { Rebalancing } from './Rebalancing'
import { Performa } from './Performa'
import { TemaToggle } from './tema'
import { PanelFitur, FiturId } from './PanelFitur'
import { Analisis } from './Analisis'
import { Perencanaan } from './Perencanaan'
import { MATA, formatMata } from '@/lib/mata'
import { KalkulatorForex } from './KalkulatorForex'
import { Trx, punyaTrx, KUNCI, daftarTrx, ringkasTrx, terapkan } from '@/lib/transaksi'
import { Cache, seriAset, kunciSeri, dariApi, simbolApi, totalHarian, ringkas, hariIni, selisihHari } from '@/lib/seri'
import { keEmail, namaDari, namaSapaan } from '@/lib/akun'
import { Terima, JENIS_TERIMA, punyaTerima, mataTerima, daftarTerima, totalTerima, penerimaanHarian } from '@/lib/penerimaan'

const NAMA: Record<Kelas, string> = { saham: 'Saham', ussaham: 'Saham AS & ETF', reksa: 'Reksadana', crypto: 'Crypto', forex: 'Forex', emas: 'Emas', properti: 'Properti', deposito: 'Deposito' }
const WARNA: Record<Kelas, string> = { saham: '#2563eb', ussaham: '#4f46e5', reksa: '#059669', crypto: '#d97706', forex: '#0891b2', emas: '#ca8a04', properti: '#be123c', deposito: '#7c3aed' }
const KELAS = Object.keys(NAMA) as Kelas[]
const KREDIT = 'Created by Dani'
const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const warna = (n: number) => (n >= 0 ? 'text-emerald-600' : 'text-red-600')
const jam = (s: string | undefined, t: (x: string) => string) => (s ? new Date(s).toLocaleTimeString(t('id-ID'), { hour: '2-digit', minute: '2-digit' }) : t('belum pernah'))

type Fld = [string, string, string, string[]?]
const F: Record<Kelas, Fld[]> = {
  saham: [['kode', 'Kode saham (mis. BBCA)', 'text'], ['jumlah', 'Jumlah', 'number'], ['satuan', 'Satuan', 'select', ['Lot', 'Lembar']], ['hargaBeli', 'Harga beli per lembar (Rp)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  ussaham: [['kode', 'Kode saham/ETF AS (mis. AAPL, VOO)', 'text'], ['jenis', 'Jenis', 'select', ['Saham', 'ETF']], ['jumlah', 'Jumlah lembar (boleh pecahan)', 'desimal'], ['hargaBeli', 'Harga beli per lembar (USD)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  reksa: [['nama', 'Nama produk', 'text'], ['jenis', 'Jenis', 'select', ['Pasar uang', 'Obligasi', 'Campuran', 'Saham']], ['unit', 'Jumlah unit', 'number'], ['navBeli', 'NAV beli per unit (Rp)', 'number'], ['tanggal', 'Tanggal beli', 'date'], ['navTerbaru', 'NAV terbaru (Rp)', 'number'], ['tglNav', 'Tanggal NAV terbaru', 'date']],
  crypto: [['coinId', 'ID coin CoinGecko (mis. bitcoin)', 'text'], ['simbol', 'Simbol (mis. BTC)', 'text'], ['jumlah', 'Jumlah koin', 'desimal'], ['hargaBeli', 'Harga beli per koin', 'number'], ['mata', 'Mata uang harga beli', 'select', ['IDR', 'USD']], ['tanggal', 'Tanggal beli', 'date']],
  forex: [['mata', 'Mata uang', 'select', ['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'AUD', 'MYR', 'CNY', 'HKD', 'SAR']], ['jumlah', 'Jumlah (dalam mata uang asing)', 'number'], ['kursBeli', 'Kurs beli (Rp per 1 unit)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  emas: [['jenis', 'Jenis', 'select', ['Emas batangan', 'Perhiasan', 'Emas digital']], ['gram', 'Jumlah (gram)', 'number'], ['hargaBeli', 'Harga beli per gram (Rp)', 'number'], ['hargaManual', 'Harga jual sekarang per gram (opsional)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  properti: [['nama', 'Nama properti', 'text'], ['jenis', 'Jenis', 'select', ['Tanah', 'Rumah', 'Apartemen', 'Ruko']], ['lokasi', 'Lokasi (opsional)', 'text'], ['hargaBeli', 'Harga beli (Rp)', 'number'], ['nilai', 'Estimasi nilai sekarang (Rp)', 'number'], ['tglNilai', 'Tanggal estimasi nilai', 'date'], ['tanggal', 'Tanggal beli', 'date']],
  deposito: [['bank', 'Bank', 'text'], ['pokok', 'Nominal pokok (Rp)', 'number'], ['bunga', 'Bunga per tahun (%)', 'number'], ['tanggal', 'Tanggal mulai', 'date'], ['tenor', 'Tenor (bulan)', 'number'], ['pajak', 'Pajak bunga (%)', 'number'], ['aro', 'Perpanjang otomatis (ARO)', 'select', ['Tidak', 'Ya']]],
}

// Field yang diatur lewat Riwayat pembelian (disembunyikan di form Ubah aset)
const SEMBUNYI: Record<string, string[]> = { saham: ['jumlah', 'satuan', 'hargaBeli', 'tanggal'], ussaham: ['jumlah', 'hargaBeli', 'tanggal'], reksa: ['unit', 'navBeli', 'tanggal'], crypto: ['jumlah', 'hargaBeli', 'tanggal'], forex: ['jumlah', 'kursBeli', 'tanggal'], emas: ['gram', 'hargaBeli', 'tanggal'] }
const labelJumlah = (k: Kelas, q: number, a: any, loc: string, t: (s: string) => string) => {
  const f = (n: number) => n.toLocaleString(loc, { maximumFractionDigits: 8 })
  return k === 'ussaham' ? `${f(q)} ${t('lembar')}` : k === 'saham' ? (q % 100 === 0 ? `${f(q / 100)} lot (${f(q)} ${t('lembar')})` : `${f(q)} ${t('lembar')}`) : k === 'reksa' ? `${f(q)} ${t('unit')}` : k === 'crypto' ? `${f(q)} ${a.simbol}` : k === 'forex' ? `${f(q)} ${a.mata}` : `${f(q)} gram`
}

const topik = (k: Kelas, lang: Lang, a?: any): string => {
  const en = lang === 'en'
  if (!a) return (en
    ? { saham: 'Indonesia stocks IDX', ussaham: 'US stock market Wall Street', reksa: 'Indonesia mutual funds', crypto: 'cryptocurrency price', forex: 'rupiah exchange rate', emas: 'gold price', properti: 'Indonesia property market', deposito: 'time deposit interest rates' }
    : { saham: 'saham IHSG', ussaham: 'saham Amerika Wall Street', reksa: 'reksadana', crypto: 'cryptocurrency harga', forex: 'kurs rupiah dolar', emas: 'harga emas', properti: 'harga properti', deposito: 'suku bunga deposito' })[k]
  if (k === 'saham') return `${a.kode} ${en ? 'stock' : 'saham'}`
  if (k === 'ussaham') return a.jenis === 'ETF' ? `${a.kode} ETF` : `${a.kode} ${en ? 'stock' : 'saham'}`
  if (k === 'reksa') return `${a.nama} ${en ? 'mutual fund' : 'reksadana'}`
  if (k === 'crypto') return `${a.coinId} crypto`
  if (k === 'forex') return en ? `${a.mata} IDR exchange rate` : `kurs ${a.mata} rupiah`
  if (k === 'emas') return en ? 'gold price' : 'harga emas'
  if (k === 'properti') return `${en ? 'property' : 'properti'} ${a.lokasi || a.jenis}`
  return `${en ? 'time deposit rate' : 'suku bunga deposito'} ${a.bank}`
}
const lalu = (iso: string, t: (s: string) => string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 60 ? `${m} ${t('menit lalu')}` : m < 1440 ? `${Math.floor(m / 60)} ${t('jam lalu')}` : `${Math.floor(m / 1440)} ${t('hari lalu')}`
}

function Berita({ q, label, lang, t }: { q: string; label: string; lang: Lang; t: (s: string) => string }) {
  const [st, setSt] = useState<{ items: any[]; rentang?: string; error?: boolean } | null>(null)
  useEffect(() => {
    let on = true
    setSt(null)
    fetch(`/api/berita?q=${encodeURIComponent(q)}&lang=${lang}`).then(r => r.json()).then(j => on && setSt(j)).catch(() => on && setSt({ items: [], error: true }))
    return () => { on = false }
  }, [q, lang])
  const kosong = 'py-6 text-center text-sm text-slate-500'
  return (
    <aside className={`${card} lg:sticky lg:top-40 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto`}>
      <h2 className="font-medium">{t('Berita hari ini')}</h2>
      <p className="mb-2 text-xs text-slate-500">{label}</p>
      {!st ? <p className={kosong}>{t('Memuat berita…')}</p>
        : st.error ? <p className={`${kosong} !text-amber-600`}>{t('Berita gagal dimuat. Coba lagi nanti.')}</p>
        : !st.items.length ? <p className={kosong}>{t('Belum ada berita untuk topik ini.')}</p>
        : <>
          {st.rentang === '7d' && <p className="mb-2 text-xs text-amber-600">{t('Belum ada berita 24 jam terakhir, menampilkan 7 hari terakhir.')}</p>}
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">{st.items.map((b, i) => (
            <li key={i} className="py-2"><a href={b.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">{b.judul}</a>
              <p className="text-xs text-slate-500">{b.sumber}{b.waktu && ` · ${lalu(b.waktu, t)}`}</p></li>
          ))}</ul></>}
    </aside>
  )
}

function RingkasanAset({ k, a, r, cache, M, t, kurs, onTambahTrx, onUbahTrx, onHapusTrx, onTambahTerima, onUbahTerima, onHapusTerima }: { k: Kelas; a: any; r: Baris; cache: Cache; M: (n: number, asli?: boolean) => string; t: (s: string) => string; kurs: number; onTambahTrx: () => void; onUbahTrx: (id: string) => void; onHapusTrx: (id: string) => void; onTambahTerima: () => void; onUbahTerima: (id: string) => void; onHapusTerima: (id: string) => void }) {
  const loc = t('id-ID'), pasar = k === 'saham' || k === 'ussaham' || k === 'crypto' || k === 'forex' || k === 'emas'
  const c = dariApi(k) && !(k === 'emas' && a.hargaManual > 0) ? cache[kunciSeri(k, a)] : undefined
  const s = useMemo(() => seriAset(k, a, c, kurs), [k, a, c, kurs])
  const tgl = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const tick = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, s && s.length > 180 ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const lama = a.tanggal ? selisihHari(a.tanggal, hariIni()) : 0
  const plHarga = r.nilai - r.modal, terima = r.terima || 0, pl = plHarga + terima, pp = r.modal ? (pl / r.modal) * 100 : 0
  const hi = s && pasar ? s.reduce((m, p) => (p.v > m.v ? p : m), s[0]) : null
  const lo = s && pasar ? s.reduce((m, p) => (p.v < m.v ? p : m), s[0]) : null
  const ubah = r.beli && r.kini ? (r.kini / r.beli - 1) * 100 : null
  const ref = r.beli ?? r.modal, wr = WARNA[k]
  const stat = (l: string, v: string, cls = '') => <div key={l}><p className="text-xs text-slate-500">{l}</p><p className={`text-sm font-medium ${cls}`}>{v}</p></div>
  const msg = 'py-8 text-center text-sm text-slate-500'
  return (
    <div className={card}>
      <h2 className="mb-3 font-medium">{t('Ringkasan')} {r.nama}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(t('Tanggal beli'), a.tanggal ? `${tgl(a.tanggal)} (${lama} ${t('hari')})` : '-')}
        {stat(t('Harga beli'), r.beli != null ? M(r.beli) : '-')}
        {stat(t('Harga hari ini'), r.kini != null ? M(r.kini) : '-')}
        {stat(t('Perubahan harga'), ubah != null ? pct(ubah) : '-', ubah != null ? warna(ubah) : '')}
        {stat(t('Modal'), M(r.modal))}
        {stat(t('Nilai sekarang'), M(r.nilai))}
        {stat(t('Selisih harga'), M(plHarga), warna(plHarga))}
        {punyaTerima(k) && stat(t('Penerimaan'), M(terima))}
        {stat(t('Total hasil'), M(pl), warna(pl))}
        {stat('%', pct(pp), warna(pl))}
        {punyaTerima(k) && terima > 0 && r.modal > 0 && stat(t('Yield penerimaan'), `${((terima / r.modal) * 100).toFixed(2)}%`)}
        {hi && lo && stat(t('Tertinggi sejak beli'), `${M(hi.v)} (${tgl(hi.t)})`)}
        {hi && lo && stat(t('Terendah sejak beli'), `${M(lo.v)} (${tgl(lo.t)})`)}
      </div>
      <div className="mt-4">
        {c === 'gagal' ? <p className={`${msg} !text-amber-600`}>{t('Riwayat harga tidak tersedia (sumber data gagal). Tekan Refresh untuk mencoba lagi.')}</p>
          : pasar && !c && !(k === 'emas' && a.hargaManual > 0) ? <p className={msg}>{t('Memuat riwayat harga…')}</p>
          : s && s.length > 1 ? <>
            <p className="mb-1 text-xs text-slate-500">{t(k === 'properti' || k === 'deposito' ? 'Nilai sejak tanggal beli' : 'Harga per satuan sejak tanggal beli')} · {t('Garis putus-putus = harga beli')}</p>
            <div className="h-56"><ResponsiveContainer><AreaChart data={ringkas(s, 300)}>
              <XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={tick} minTickGap={40} /><YAxis hide domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => M(v)} labelFormatter={(x: string) => tgl(x)} />
              <ReferenceLine y={ref} stroke="#94a3b8" strokeDasharray="4 4" ifOverflow="extendDomain" />
              <Area dataKey="v" type="monotone" stroke={wr} fill={wr + '33'} />
            </AreaChart></ResponsiveContainer></div>
            {k === 'crypto' && typeof c === 'object' && c.potong && <p className="mt-1 text-xs text-slate-500">{t('Data harga crypto gratis hanya mencakup 365 hari terakhir.')}</p>}</>
          : <p className={msg}>{t('Belum cukup data untuk grafik.')}</p>}
      </div>
      {k === 'ussaham' && <p className="mt-2 text-xs text-slate-500">{t('Nilai dalam USD dikonversi dengan kurs hari ini, jadi selisih kurs tidak ikut dihitung.')}</p>}
      {punyaTrx(k) && <RiwayatBeli k={k} a={a} M={M} t={t} onTambah={onTambahTrx} onUbah={onUbahTrx} onHapus={onHapusTrx} />}
      {punyaTerima(k) && <RiwayatTerima k={k} a={a} M={M} t={t} onTambah={onTambahTerima} onUbah={onUbahTerima} onHapus={onHapusTerima} />}
    </div>
  )
}

function Form({ k, awal, t, onSave, onClose }: { t: (s: string) => string; k: Kelas; awal?: any; onSave: (o: any) => void; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [v, setV] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    F[k].forEach(([key, , tp, opts]) => {
      let x = awal?.[key]
      if (k === 'saham' && key === 'jumlah') x = awal?.lembar
      if (k === 'saham' && key === 'satuan') x = awal ? 'Lembar' : 'Lot'
      if (key === 'aro' && awal) x = awal.aro ? 'Ya' : 'Tidak'
      if (key === 'hargaManual' && !x) x = ''
      o[key] = x != null ? (tp === 'desimal' ? Number(x).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 12 }) : String(x)) : tp === 'date' ? today : key === 'pajak' ? '20' : opts ? opts[0] : ''
    })
    return o
  })
  const fields = F[k].filter(([key]) => !(awal && SEMBUNYI[k]?.includes(key))) // aset lama: jumlah/harga/tanggal diubah lewat Riwayat pembelian
  const [err, setErr] = useState('')
  const [opsi, setOpsi] = useState<any[]>([])
  const ubah = (key: string, val: string) => {
    setV(p => ({ ...p, [key]: val }))
    if (k === 'crypto' && key === 'coinId') {
      const m = opsi.find(c => c.id === val)
      if (m) setV(p => ({ ...p, simbol: m.symbol.toUpperCase() }))
      else if (val.length > 1) fetch(`/api/crypto?q=${encodeURIComponent(val)}`).then(r => r.json()).then(j => setOpsi(j.coins || [])).catch(() => {})
    }
  }
  const kirim = () => {
    for (const [key, label, tp] of fields) {
      const x = (v[key] || '').trim()
      if (tp === 'select') continue
      if (!x) { if (key === 'hargaManual' || key === 'lokasi') continue; return setErr(`${t(label)} ${t('wajib diisi')}`) }
      if (tp === 'number' || tp === 'desimal') {
        const n = Number(x.replace(',', '.'))
        if (!isFinite(n) || n < 0) return setErr(`${t(label)} ${t('harus berupa angka positif')}`)
        if (n === 0 && key !== 'bunga' && key !== 'pajak') return setErr(`${t(label)} ${t('harus lebih dari 0')}`)
      }
    }
    if (k === 'ussaham') { // nama indeks (S&P 500, Nasdaq, Dow) bukan produk yang bisa dibeli: arahkan ke ETF-nya
      const x = (v.kode || '').trim().toLowerCase()
      const idx = /s\s*&?\s*p\s*-?\s*500|^sp-?500$/.test(x) ? t('S&P 500 adalah indeks, bukan produk yang bisa dibeli langsung. Pilih ETF yang mengikutinya, mis. VOO, SPY, atau IVV.') : /^(nasdaq|ndx)/.test(x) ? t('Nasdaq adalah indeks. Pilih ETF yang mengikutinya, mis. QQQ.') : /^(dow\s*jones|dow\s*30|djia$|dji$)/.test(x) ? t('Dow Jones adalah indeks. Pilih ETF yang mengikutinya, mis. DIA.') : ''
      if (idx) return setErr(idx)
      if (!/^[A-Za-z0-9.-]{1,10}$/.test(x)) return setErr(t('Kode tidak valid (mis. AAPL, VOO)'))
    }
    if (k === 'saham' && !awal) { const lb = (v.satuan === 'Lot' ? 100 : 1) * Number(v.jumlah); if (Math.abs(lb - Math.round(lb)) > 1e-9) return setErr(t('Jumlah lembar harus bilangan bulat')) }
    if (k === 'deposito' && (Number(v.pajak) > 100 || !Number.isInteger(Number(v.tenor)))) return setErr(t('Pajak maksimal 100% dan tenor harus bilangan bulat'))
    const o: any = { ...(awal || {}), id: awal?.id || Math.random().toString(36).slice(2) + Date.now().toString(36) }
    fields.forEach(([key, , tp]) => { o[key] = tp === 'number' ? Number(v[key]) : tp === 'desimal' ? Number(v[key].trim().replace(',', '.')) : v[key].trim() })
    if (k === 'saham') { if (!awal) o.lembar = Math.round(v.satuan === 'Lot' ? o.jumlah * 100 : o.jumlah); o.kode = o.kode.toUpperCase(); delete o.jumlah; delete o.satuan }
    if (k === 'crypto') { o.coinId = o.coinId.toLowerCase(); o.simbol = o.simbol.toUpperCase() }
    if (k === 'ussaham') o.kode = String(o.kode).trim().toUpperCase()
    if (k === 'deposito') o.aro = v.aro === 'Ya'
    if (punyaTrx(k) && !awal) o.transaksi = [{ id: Math.random().toString(36).slice(2) + Date.now().toString(36), tanggal: o.tanggal, jumlah: o[KUNCI[k].q], harga: o[KUNCI[k].h] }] // pembelian pertama
    onSave(o)
  }
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{t(awal ? 'Ubah' : 'Tambah')} {t(NAMA[k]).toLowerCase()}</h2>
        <div className="space-y-3">
          {fields.map(([key, label, tp, opts]) => (
            <label key={key} className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t(label)}</span>
              {tp === 'select' ? <select value={v[key]} onChange={e => ubah(key, e.target.value)}>{opts!.map(o => <option key={o} value={o}>{t(o)}</option>)}</select>
                : <input type={tp === 'number' ? 'number' : tp === 'desimal' ? 'text' : tp} step="any" inputMode={tp === 'number' || tp === 'desimal' ? 'decimal' : undefined} placeholder={tp === 'desimal' ? '0.5' : undefined} list={key === 'coinId' ? 'coins' : k === 'ussaham' && key === 'kode' ? 'etf-us' : undefined} value={v[key]} onChange={e => ubah(key, tp === 'desimal' ? e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/^(\d*\.\d*)\..*$/, '$1') : e.target.value)} />}
            </label>
          ))}
          {punyaTrx(k) && <p className="text-xs text-slate-500">{awal ? t('Jumlah, harga, dan tanggal beli diatur lewat Riwayat pembelian (tombol Ringkasan).') : t('Pembelian berikutnya bisa ditambahkan dengan tombol Beli lagi. Harga rata-rata dihitung otomatis.')}</p>}
          <datalist id="etf-us">{[['VOO', 'Vanguard S&P 500 ETF'], ['SPY', 'SPDR S&P 500 ETF'], ['IVV', 'iShares Core S&P 500 ETF'], ['QQQ', 'Invesco QQQ (Nasdaq 100)'], ['VTI', 'Vanguard Total US Market'], ['DIA', 'SPDR Dow Jones Industrial'], ['VT', 'Vanguard Total World'], ['SCHD', 'Schwab US Dividend Equity'], ['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'NVIDIA'], ['GOOGL', 'Alphabet'], ['AMZN', 'Amazon'], ['TSLA', 'Tesla'], ['META', 'Meta']].map(([c, n]) => <option key={c} value={c}>{n}</option>)}</datalist>
          <datalist id="coins">{opsi.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}</datalist>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>{t('Batal')}</button><button className="btn-p" onClick={kirim}>{t('Simpan')}</button></div>
      </div>
    </div>
  )
}

function FormTrx({ k, a, awal, t, onSave, onClose }: { k: Kelas; a: any; awal?: Trx; t: (s: string) => string; onSave: (x: Trx) => void; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10), saham = k === 'saham', desimal = k === 'crypto' || k === 'ussaham', loc = t('id-ID'), usd = (k === 'crypto' && a.mata === 'USD') || k === 'ussaham'
  const plain = (n: number) => n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 12 })
  const kelipatanLot = !!awal && saham && awal.jumlah % 100 === 0
  const [tgl, setTgl] = useState(awal?.tanggal || today)
  const [satuan, setSatuan] = useState(saham && awal && !kelipatanLot ? 'Lembar' : 'Lot')
  const [jml, setJml] = useState(awal ? plain(saham && kelipatanLot ? awal.jumlah / 100 : awal.jumlah) : '')
  const [hrg, setHrg] = useState(awal ? plain(awal.harga) : '')
  const [err, setErr] = useState('')
  const num = (x: string) => Number(x.trim().replace(',', '.'))
  const lembar = saham && satuan === 'Lot' ? num(jml) * 100 : num(jml)
  const qLabel = F[k].find(f => f[0] === (saham ? 'jumlah' : KUNCI[k].q))![1]
  const hLabel = F[k].find(f => f[0] === KUNCI[k].h)![1] + (k === 'crypto' ? ` (${a.mata})` : '')
  const uang = (n: number) => (usd ? `US$${n.toLocaleString(loc, { maximumFractionDigits: 2 })}` : rp(n))
  const valid = jml.trim() !== '' && hrg.trim() !== '' && isFinite(lembar) && lembar > 0 && isFinite(num(hrg)) && num(hrg) > 0
  const rt = valid ? ringkasTrx([...daftarTrx(k, a).filter(x => x.id !== awal?.id), { id: 'x', tanggal: tgl || today, jumlah: lembar, harga: num(hrg) }]) : null
  const kirim = () => {
    if (!tgl) return setErr(`${t('Tanggal beli')} ${t('wajib diisi')}`)
    if (tgl > today) return setErr(t('Tanggal beli tidak boleh di masa depan'))
    if (!jml.trim() || !isFinite(num(jml)) || num(jml) <= 0) return setErr(`${t(qLabel)} ${t('harus lebih dari 0')}`)
    if (!hrg.trim() || !isFinite(num(hrg)) || num(hrg) <= 0) return setErr(`${t(hLabel)} ${t('harus lebih dari 0')}`)
    if (saham && Math.abs(lembar - Math.round(lembar)) > 1e-9) return setErr(t('Jumlah lembar harus bilangan bulat'))
    onSave({ id: awal?.id || Math.random().toString(36).slice(2) + Date.now().toString(36), tanggal: tgl, jumlah: saham ? Math.round(lembar) : lembar, harga: num(hrg) })
  }
  const nama = a.kode || a.simbol || a.nama || a.mata || t(a.jenis || '')
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{t(awal ? 'Ubah pembelian' : 'Tambah pembelian')} {nama}</h2>
        <div className="space-y-3">
          <label className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t('Tanggal beli')}</span><input type="date" max={today} value={tgl} onChange={e => setTgl(e.target.value)} /></label>
          <label className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t(qLabel)}</span>
            <span className="flex gap-2"><input type={desimal ? 'text' : 'number'} step="any" inputMode="decimal" placeholder={desimal ? '0.5' : undefined} value={jml} onChange={e => setJml(desimal ? e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/^(\d*\.\d*)\..*$/, '$1') : e.target.value)} />
              {saham && <select className="!w-28" value={satuan} onChange={e => setSatuan(e.target.value)}><option value="Lot">{t('Lot')}</option><option value="Lembar">{t('Lembar')}</option></select>}</span></label>
          <label className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t(hLabel)}</span><input type="number" step="any" inputMode="decimal" value={hrg} onChange={e => setHrg(e.target.value)} /></label>
        </div>
        {rt && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">{t('Setelah disimpan')}: <b>{labelJumlah(k, rt.jumlah, a, loc, t)}</b>, {t('harga rata-rata')} <b>{uang(rt.rata)}</b></p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>{t('Batal')}</button><button className="btn-p" onClick={kirim}>{t('Simpan')}</button></div>
      </div>
    </div>
  )
}

function RiwayatBeli({ k, a, M, t, onTambah, onUbah, onHapus }: { k: Kelas; a: any; M: (n: number, asli?: boolean) => string; t: (s: string) => string; onTambah: () => void; onUbah: (id: string) => void; onHapus: (id: string) => void }) {
  const loc = t('id-ID'), trx = daftarTrx(k, a), rt = ringkasTrx(trx), usd = (k === 'crypto' && a.mata === 'USD') || k === 'ussaham'
  const tgl = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const uang = (n: number) => (usd ? `US$${n.toLocaleString(loc, { maximumFractionDigits: 2 })}` : M(n, true))
  const td = 'px-2 py-1.5', th = 'px-2 py-1.5 font-medium'
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{t('Riwayat pembelian')}</h3><button className="btn-p" onClick={onTambah}>{t('Tambah pembelian')}</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500"><tr><th className={th}>{t('Tanggal beli')}</th><th className={th}>{t('Jumlah')}</th><th className={th}>{t('Harga beli')}</th><th className={th}>{t('Nilai beli')}</th><th /></tr></thead>
        <tbody>{trx.map(x => (
          <tr key={x.id} className="border-t border-slate-200 dark:border-slate-800">
            <td className={`${td} whitespace-nowrap`}>{tgl(x.tanggal)}</td><td className={td}>{labelJumlah(k, x.jumlah, a, loc, t)}</td><td className={td}>{uang(x.harga)}</td><td className={td}>{uang(x.jumlah * x.harga)}</td>
            <td className={`${td} whitespace-nowrap text-right`}><button className="mr-3 text-blue-600" onClick={() => onUbah(x.id)}>{t('Ubah')}</button>{trx.length > 1 && <button className="text-red-600" onClick={() => confirm(t('Hapus pembelian ini?')) && onHapus(x.id)}>{t('Hapus')}</button>}</td>
          </tr>))}</tbody>
        <tfoot><tr className="border-t border-slate-300 font-medium dark:border-slate-700"><td className={td}>{t('Total')}</td><td className={td}>{labelJumlah(k, rt.jumlah, a, loc, t)}</td><td className={td}>{uang(rt.rata)} <span className="text-xs font-normal text-slate-500">({t('rata-rata')})</span></td><td className={td}>{uang(rt.modal)}</td><td /></tr></tfoot>
      </table></div>
      {trx.length === 1 && <p className="mt-2 text-xs text-slate-500">{t('Beli lagi di tanggal lain? Tekan Tambah pembelian, harga rata-rata dihitung otomatis.')}</p>}
    </div>
  )
}

function FormTerima({ k, a, awal, t, onSave, onClose }: { k: Kelas; a: any; awal?: Terima; t: (s: string) => string; onSave: (x: Terima) => void; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10), usd = mataTerima(k, a) === 'USD', opsi = JENIS_TERIMA[k] || ['Lainnya']
  const [tgl, setTgl] = useState(awal?.tanggal || today), [jenis, setJenis] = useState(awal?.jenis || opsi[0]), [jml, setJml] = useState(awal ? String(awal.jumlah) : ''), [err, setErr] = useState('')
  const kirim = () => {
    const n = Number(jml.trim().replace(',', '.'))
    if (!tgl) return setErr(`${t('Tanggal diterima')} ${t('wajib diisi')}`)
    if (tgl > today) return setErr(t('Tanggal diterima tidak boleh di masa depan'))
    if (!jml.trim() || !isFinite(n) || n <= 0) return setErr(`${t('Jumlah diterima')} ${t('harus lebih dari 0')}`)
    onSave({ id: awal?.id || Math.random().toString(36).slice(2) + Date.now().toString(36), tanggal: tgl, jumlah: n, jenis })
  }
  const nama = a.kode || a.simbol || a.nama || ''
  const lbl = 'mb-1 block text-slate-600 dark:text-slate-400'
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{t(awal ? 'Ubah penerimaan' : 'Catat penerimaan')} {nama}</h2>
        <div className="space-y-3">
          <label className="block text-sm"><span className={lbl}>{t('Tanggal diterima')}</span><input type="date" max={today} value={tgl} onChange={e => setTgl(e.target.value)} /></label>
          <label className="block text-sm"><span className={lbl}>{t('Jenis penerimaan')}</span><select value={jenis} onChange={e => setJenis(e.target.value)}>{opsi.map(o => <option key={o} value={o}>{t(o)}</option>)}</select></label>
          <label className="block text-sm"><span className={lbl}>{usd ? t('Jumlah diterima (USD, setelah pajak)') : t('Jumlah diterima (Rp, setelah pajak)')}</span><input type="number" step="any" inputMode="decimal" value={jml} onChange={e => setJml(e.target.value)} /></label>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>{t('Batal')}</button><button className="btn-p" onClick={kirim}>{t('Simpan')}</button></div>
      </div>
    </div>
  )
}

function RiwayatTerima({ k, a, M, t, onTambah, onUbah, onHapus }: { k: Kelas; a: any; M: (n: number, asli?: boolean) => string; t: (s: string) => string; onTambah: () => void; onUbah: (id: string) => void; onHapus: (id: string) => void }) {
  const loc = t('id-ID'), l = daftarTerima(a), usd = mataTerima(k, a) === 'USD', total = totalTerima(a)
  const tgl = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const uang = (n: number) => (usd ? `US$${n.toLocaleString(loc, { maximumFractionDigits: 2 })}` : M(n, true))
  const td = 'px-2 py-1.5', th = 'px-2 py-1.5 font-medium'
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{t('Riwayat penerimaan')}</h3><button className="btn" onClick={onTambah}>{t('Catat penerimaan')}</button></div>
      {!l.length ? <p className="text-xs text-slate-500">{t('Belum ada penerimaan. Catat dividen, kupon, atau sewa yang sudah kamu terima agar ikut dihitung di hasil investasi.')}</p>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th className={th}>{t('Tanggal diterima')}</th><th className={th}>{t('Jenis penerimaan')}</th><th className={th}>{t('Jumlah')}</th><th /></tr></thead>
          <tbody>{l.map(x => (
            <tr key={x.id} className="border-t border-slate-200 dark:border-slate-800">
              <td className={`${td} whitespace-nowrap`}>{tgl(x.tanggal)}</td><td className={td}>{t(x.jenis)}</td><td className={td}>{uang(x.jumlah)}</td>
              <td className={`${td} whitespace-nowrap text-right`}><button className="mr-3 text-blue-600" onClick={() => onUbah(x.id)}>{t('Ubah')}</button><button className="text-red-600" onClick={() => confirm(t('Hapus penerimaan ini?')) && onHapus(x.id)}>{t('Hapus')}</button></td>
            </tr>))}</tbody>
          <tfoot><tr className="border-t border-slate-300 font-medium dark:border-slate-700"><td className={td} colSpan={2}>{t('Total')}</td><td className={td}>{uang(total)}</td><td /></tr></tfoot>
        </table></div>}
    </div>
  )
}

function Daftar({ rows, M, t, onEdit, onDel, fokus, onFokus, bisaBeli, onBeli }: { t: (s: string) => string; rows: Baris[]; M: (n: number) => string; onEdit: (id: string) => void; onDel: (id: string) => void; fokus: string | null; onFokus: (id: string) => void; bisaBeli: boolean; onBeli: (id: string) => void }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-slate-500">{t('Belum ada aset di sini. Tekan Tambah untuk memasukkan yang pertama.')}</p>
  const pl = (r: Baris) => r.nilai - r.modal + (r.terima || 0)
  const pp = (r: Baris) => (r.modal ? (pl(r) / r.modal) * 100 : 0)
  const Aksi = ({ id }: { id: string }) => (
    <span className="flex flex-wrap justify-end gap-x-3 text-sm"><button className="text-emerald-700 dark:text-emerald-500" onClick={() => onFokus(id)}>{fokus === id ? t('Tutup') : t('Ringkasan')}</button>{bisaBeli && <button className="text-slate-700 dark:text-slate-300" onClick={() => onBeli(id)}>{t('Beli lagi')}</button>}<button className="text-blue-600" onClick={() => onEdit(id)}>{t('Ubah')}</button><button className="text-red-600" onClick={() => confirm(t('Hapus aset ini?')) && onDel(id)}>{t('Hapus')}</button></span>
  )
  const Info = ({ r }: { r: Baris }) => <p className={`text-xs ${r.warn ? 'text-amber-600' : 'text-slate-500'}`}>{r.info}{r.est != null && ` · ${t('Estimasi saat jatuh tempo')} ${M(r.est)}`}</p>
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map(r => (
          <div key={r.id} className={`${card}${fokus === r.id ? ' ring-2 ring-emerald-600' : ''}`}>
            <div className="flex justify-between"><div><p className="font-semibold">{r.nama}</p><p className="text-xs text-slate-500">{r.sub}</p></div><Aksi id={r.id} /></div>
            <p className="mt-2 text-xl font-semibold">{M(r.nilai)}</p>
            <p className={`text-sm ${warna(pl(r))}`}>{M(pl(r))} ({pct(pp(r))})</p>{!!r.terima && <p className="text-xs text-slate-500">{t('termasuk penerimaan')} {M(r.terima)}</p>}
            <p className="mt-1 text-xs text-slate-500">{t('Modal')} {M(r.modal)}{r.beli != null && ` · ${t('Beli')} ${M(r.beli)}`}{r.kini != null && ` · ${t('Kini')} ${M(r.kini)}`}</p>
            <Info r={r} />
          </div>
        ))}
      </div>
      <table className={`hidden w-full text-sm md:table ${card} !p-0 overflow-hidden`}>
        <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr>{['Aset', 'Harga beli', 'Harga kini', 'Modal', 'Nilai', 'Untung/rugi', ''].map(h => <th key={h} className="px-3 py-2 font-medium">{t(h)}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className={`border-t border-slate-200 align-top dark:border-slate-800${fokus === r.id ? ' bg-emerald-50 dark:bg-emerald-950/30' : ''}`}>
              <td className="px-3 py-2"><p className="font-semibold">{r.nama}</p><p className="text-xs text-slate-500">{r.sub}</p><Info r={r} /></td>
              <td className="px-3 py-2">{r.beli != null ? M(r.beli) : '-'}</td><td className="px-3 py-2">{r.kini != null ? M(r.kini) : '-'}</td>
              <td className="px-3 py-2">{M(r.modal)}</td><td className="px-3 py-2 font-medium">{M(r.nilai)}</td>
              <td className={`px-3 py-2 ${warna(pl(r))}`}>{M(pl(r))}<br />{pct(pp(r))}{!!r.terima && <span className="block text-xs text-slate-500">{t('termasuk penerimaan')} {M(r.terima)}</span>}</td><td className="px-3 py-2"><Aksi id={r.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function LupaSandi({ t, onKembali }: { t: (s: string) => string; onKembali: () => void }) {
  const [id, setId] = useState(''), [kode, setKode] = useState(''), [baru, setBaru] = useState(''), [ulang, setUlang] = useState('')
  const [err, setErr] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false)
  const pakaiEmail = id.includes('@')
  const kirim = async () => {
    setErr(''); setInfo('')
    const x = id.trim()
    if (!x) return setErr(t('Username atau email wajib diisi'))
    if (!pakaiEmail) {
      if (baru.length < 6) return setErr(t('Kata sandi minimal 6 karakter'))
      if (baru !== ulang) return setErr(t('Kata sandi baru dan ulangannya tidak sama'))
    }
    setBusy(true)
    try {
      if (pakaiEmail) {
        const r = await sb!.auth.resetPasswordForEmail(x, { redirectTo: window.location.origin })
        if (r.error) setErr(r.error.message); else setInfo(t('Jika email itu terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Cek kotak masuk dan folder spam.'))
      } else {
        const r = await fetch('/api/pulihkan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'reset', username: x.toLowerCase(), kode, sandi: baru }) })
        const j: any = await r.json().catch(() => ({}))
        if (r.ok) { setInfo(t('Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru.')); setKode(''); setBaru(''); setUlang('') }
        else setErr(j.error === 'terkunci' ? t('Terlalu banyak percobaan. Coba lagi 15 menit lagi.') : j.error === 'config' ? t('Fitur pemulihan belum aktif di server (SUPABASE_SERVICE_ROLE_KEY belum dipasang).') : j.error === 'gagal' && j.detail ? j.detail : t('Username atau kode pemulihan salah'))
      }
    } finally { setBusy(false) }
  }
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">{t('Lupa kata sandi?')}</h1>
      <p className="pb-2 text-sm text-slate-500">{t('Akun dengan username dipulihkan memakai kode pemulihan yang dibuat saat daftar. Akun dengan email asli menerima tautan lewat email.')}</p>
      <label className="block text-sm font-medium" htmlFor="lupa-id">{t('Username atau email')}</label>
      <input id="lupa-id" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={id} onChange={e => setId(e.target.value)} />
      {id.trim() !== '' && !pakaiEmail && <>
        <label className="block text-sm font-medium" htmlFor="lupa-kode">{t('Kode pemulihan')}</label>
        <input id="lupa-kode" type="text" autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" value={kode} onChange={e => setKode(e.target.value)} />
        <label className="block text-sm font-medium" htmlFor="lupa-baru">{t('Kata sandi baru')}</label>
        <input id="lupa-baru" type="password" autoComplete="new-password" value={baru} onChange={e => setBaru(e.target.value)} />
        <label className="block text-sm font-medium" htmlFor="lupa-ulang">{t('Ulangi kata sandi baru')}</label>
        <input id="lupa-ulang" type="password" autoComplete="new-password" value={ulang} onChange={e => setUlang(e.target.value)} onKeyDown={e => e.key === 'Enter' && kirim()} />
      </>}
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}{info && <p className="text-sm text-emerald-700 dark:text-emerald-400">{info}</p>}
      <button className="btn-p w-full !py-2.5" disabled={busy} onClick={kirim}>{pakaiEmail ? t('Kirim tautan reset') : t('Atur ulang kata sandi')}</button>
      <button className="w-full text-sm text-blue-600" onClick={onKembali}>{t('Kembali ke halaman masuk')}</button>
    </>
  )
}

function ModalKode({ t, mode, kode, err, butuh, username, onBuat, onTutup }: { t: (s: string) => string; mode: 'tawar' | 'tampil'; kode: string; err: string; butuh: boolean; username: string; onBuat: () => Promise<void>; onTutup: () => void }) {
  const [sudah, setSudah] = useState(false), [busy, setBusy] = useState(false), [salin, setSalin] = useState(false)
  const unduh = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`Buat Masa Depan - kode pemulihan kata sandi\nUsername: ${username}\nKode: ${kode}\n\nSimpan di tempat aman. Kode hanya berlaku satu kali.\n`], { type: 'text/plain' }))
    a.download = 'kode-pemulihan.txt'; a.click()
  }
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl" role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold">{t('Kode pemulihan kata sandi')}</h2>
        {mode === 'tawar' ? <>
          <p className="mt-2 text-sm">{butuh ? t('Akun dengan username tidak punya email, jadi kalau lupa kata sandi, kode pemulihan inilah satu-satunya jalan masuk kembali. Buat sekarang dan simpan baik-baik.') : t('Membuat kode baru membuat kode lama tidak berlaku lagi.')}</p>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onTutup}>{t('Nanti saja')}</button><button className="btn-p disabled:opacity-50" disabled={busy} onClick={async () => { setBusy(true); await onBuat(); setBusy(false) }}>{t('Buat kode pemulihan')}</button></div>
        </> : <>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('Kode ini hanya ditampilkan sekali. Simpan di pengelola kata sandi atau catat di kertas. Siapa pun yang memegang username dan kode ini bisa mengganti kata sandimu.')}</p>
          <p className="mt-4 select-all rounded-lg bg-slate-100 p-3 text-center font-mono text-lg tracking-wider dark:bg-slate-800">{kode}</p>
          <div className="mt-3 flex gap-2"><button className="btn" onClick={() => { navigator.clipboard?.writeText(kode).then(() => setSalin(true)).catch(() => {}) }}>{salin ? t('Tersalin') : t('Salin')}</button><button className="btn" onClick={unduh}>{t('Unduh .txt')}</button></div>
          <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 !w-auto" checked={sudah} onChange={e => setSudah(e.target.checked)} />{t('Saya sudah menyimpan kode ini di tempat aman')}</label>
          <div className="mt-5 flex justify-end"><button className="btn-p disabled:opacity-50" disabled={!sudah} onClick={onTutup}>{t('Selesai')}</button></div>
        </>}
      </div>
    </div>
  )
}

// Muncul setelah pengguna membuka tautan reset dari email (akun dengan email asli).
function SandiBaru({ t, onSelesai }: { t: (s: string) => string; onSelesai: () => void }) {
  const [a, setA] = useState(''), [b, setB] = useState(''), [err, setErr] = useState(''), [beres, setBeres] = useState(false), [busy, setBusy] = useState(false)
  const simpan = async () => {
    setErr('')
    if (a.length < 6) return setErr(t('Kata sandi minimal 6 karakter'))
    if (a !== b) return setErr(t('Kata sandi baru dan ulangannya tidak sama'))
    setBusy(true)
    const r = await sb!.auth.updateUser({ password: a })
    setBusy(false)
    if (r.error) setErr(r.error.message); else setBeres(true)
  }
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl" role="dialog" aria-modal="true">
        <h2 className="text-lg font-semibold">{t('Buat kata sandi baru')}</h2>
        {beres ? <><p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{t('Kata sandi berhasil diganti.')}</p><div className="mt-5 flex justify-end"><button className="btn-p" onClick={onSelesai}>{t('Selesai')}</button></div></> : <>
          <div className="mt-3 space-y-3">
            <input type="password" autoComplete="new-password" placeholder={t('Kata sandi baru')} value={a} onChange={e => setA(e.target.value)} />
            <input type="password" autoComplete="new-password" placeholder={t('Ulangi kata sandi baru')} value={b} onChange={e => setB(e.target.value)} onKeyDown={e => e.key === 'Enter' && simpan()} />
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <div className="mt-5 flex justify-end"><button className="btn-p disabled:opacity-50" disabled={busy} onClick={simpan}>{t('Simpan kata sandi')}</button></div></>}
      </div>
    </div>
  )
}

function Masuk({ t, lang, setLang, daftarAwal, onKembali }: { t: (s: string) => string; lang: Lang; setLang: (l: Lang) => void; daftarAwal: boolean; onKembali: () => void }) {
  const [daftar, setDaftar] = useState(daftarAwal)
  const [lupa, setLupa] = useState(false)
  const [nama, setNama] = useState(''), [pw, setPw] = useState('')
  const [err, setErr] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false)
  const kirim = async () => {
    setErr(''); setInfo('')
    const u = nama.trim().toLowerCase()
    if (!u) return setErr(t('Username wajib diisi'))
    if (daftar && !/^[a-z0-9_.]{3,20}$/.test(u)) return setErr(t('Username 3-20 karakter: huruf kecil, angka, titik, atau garis bawah'))
    if (pw.length < 6) return setErr(t('Kata sandi minimal 6 karakter'))
    setBusy(true)
    const email = keEmail(u)
    const r = daftar ? await sb!.auth.signUp({ email, password: pw }) : await sb!.auth.signInWithPassword({ email, password: pw })
    if (r.error) {
      const m = r.error.message
      setErr(/invalid login/i.test(m) ? t('Username atau kata sandi salah') : /already (been )?registered/i.test(m) ? t('Username sudah dipakai') : m)
    } else if (daftar && !r.data.session) setInfo(t('Akun dibuat, tetapi konfirmasi email masih aktif di Supabase. Matikan "Confirm email" agar login dengan username bisa dipakai.'))
    setBusy(false)
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex" style={{ background: T.bg, color: T.teks }}>
        <Logo besar />
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">{t('Portofoliomu, di mana pun kamu buka.')}</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed" style={{ color: T.redup }}>{t('Data portofolio tersimpan di akunmu dan sinkron di semua perangkat.')}</p>
        </div>
        <p className="text-xs" style={{ color: T.redup }}>Created by Dani</p>
      </div>
      <div className="flex flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-sm space-y-3">
          <div className="mb-4 flex items-center justify-between">
            <button className="text-sm text-slate-500 hover:underline" onClick={onKembali}>{t('Kembali ke beranda')}</button>
            <span className="flex items-center gap-2"><TemaToggle t={t} />
            <select className="!w-auto" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language"><option value="id">Indonesia</option><option value="en">English</option></select></span>
          </div>
          {lupa ? <LupaSandi t={t} onKembali={() => { setLupa(false); setDaftar(false) }} /> : <>
          <h1 className="text-3xl font-extrabold tracking-tight">{daftar ? t('Buat akun') : t('Masuk')}</h1>
          <p className="pb-2 text-sm text-slate-500">{daftar ? t('Pilih username dan kata sandi untuk akun barumu.') : t('Masuk untuk melihat portofoliomu.')}</p>
          <label className="block text-sm font-medium" htmlFor="username">Username</label>
          <input id="username" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" value={nama} onChange={e => setNama(e.target.value)} />
          {daftar && <p className="text-xs text-slate-500">{t('Username 3-20 karakter: huruf kecil, angka, titik, atau garis bawah')}</p>}
          <label className="block text-sm font-medium" htmlFor="sandi">{t('Kata sandi')}</label>
          <input id="sandi" type="password" autoComplete={daftar ? 'new-password' : 'current-password'} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && kirim()} />
          {!daftar && <button className="block text-sm text-blue-600" onClick={() => { setLupa(true); setErr(''); setInfo('') }}>{t('Lupa kata sandi?')}</button>}
          {err && <p className="text-sm text-red-600" role="alert">{err}</p>}{info && <p className="text-sm text-emerald-700 dark:text-emerald-400">{info}</p>}
          <button className="btn-p w-full !py-2.5" disabled={busy} onClick={kirim}>{daftar ? t('Daftar') : t('Masuk')}</button>
          <button className="w-full text-sm text-blue-600" onClick={() => { setDaftar(!daftar); setErr(''); setInfo('') }}>{daftar ? t('Sudah punya akun? Masuk') : t('Belum punya akun? Daftar')}</button>
          </>}
          <p className="pt-4 text-center text-xs text-slate-500">Buat Masa Depan™ · {KREDIT}</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [d, setD] = useState<Data>(kosong())
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<'ringkasan' | 'charts' | 'kalender' | 'rebalancing' | 'performa' | 'analisis' | 'perencanaan' | 'kalkulator' | Kelas>('ringkasan')
  const [kelasAkhir, setKelasAkhir] = useState<Kelas>('saham')
  const [rail, setRail] = useState(true)
  const [mataTampil, setMataTampil] = useState('IDR') // mata uang untuk menampilkan nilai modal dan investasi
  const [kursMap, setKursMap] = useState<Record<string, number>>({}) // rupiah per 1 unit mata uang tampilan
  const [kursGagal, setKursGagal] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const [layar, setLayar] = useState<'awal' | 'masuk'>('awal')
  const [daftarAwal, setDaftarAwal] = useState(false)
  const [formTrx, setFormTrx] = useState<{ k: Kelas; aid: string; tid?: string } | null>(null)
  const [formTerima, setFormTerima] = useState<{ k: Kelas; aid: string; tid?: string } | null>(null)
  const [kodeModal, setKodeModal] = useState<'tawar' | 'tampil' | null>(null)
  const [kodePulih, setKodePulih] = useState('')
  const [butuhKode, setButuhKode] = useState(false)
  const [errKode, setErrKode] = useState('')
  const [pulihEmail, setPulihEmail] = useState(false)
  const [fokus, setFokus] = useState<string | null>(null)
  const [cache, setCache] = useState<Cache>({})
  const sedang = useRef(new Set<string>())
  const [hide, setHide] = useState(false)
  const [form, setForm] = useState<{ k: Kelas; id?: string } | null>(null)
  const [load, setLoad] = useState(false)
  const [every, setEvery] = useState(0)
  const [msg, setMsg] = useState('')
  const ref = useRef(d); ref.current = d
  const fileRef = useRef<HTMLInputElement>(null)

  const [lang, setLang] = useState<Lang>('id')
  const [user, setUser] = useState<any>(null)
  const [cek, setCek] = useState(!!sb)
  const t = useMemo(() => tr(lang), [lang])
  const pilihBahasa = (l: Lang) => { setLang(l); localStorage.setItem('pt-lang', l) }
  const pilihMata = (m: string) => { setMataTampil(m); try { localStorage.setItem('pt-mata', m) } catch {} }
  const bukaRail = (b: boolean) => { setRail(b); try { localStorage.setItem('pt-rail', b ? '1' : '0') } catch {} }
  const uid = user?.id
  useEffect(() => {
    setHide(localStorage.getItem('pt-hide') === '1')
    setRail(localStorage.getItem('pt-rail') !== '0')
    const mt = localStorage.getItem('pt-mata'); if (mt && MATA.some(m => m[0] === mt)) setMataTampil(mt)
    setLang(localStorage.getItem('pt-lang') === 'en' ? 'en' : 'id')
    if (!sb) { setD(muat()); setOk(true); return }
    sb.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setCek(false) })
    const { data: l } = sb.auth.onAuthStateChange((e, s) => { setUser(s?.user ?? null); if (e === 'PASSWORD_RECOVERY') setPulihEmail(true) })
    return () => l.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!sb) return
    setOk(false); setD(kosong())
    if (uid) muatCloud().then(c => { setD(c || kosong()); setOk(true) }).catch((e: any) => { console.error(e); setMsg(`${t('Gagal membaca file')} [${e?.code || ''} ${e?.message || e}]`) })
  }, [uid])
  useEffect(() => {
    if (!ok) return
    if (!sb) { simpan(d); return }
    const h = setTimeout(() => { if (uid) simpanCloud(uid, d).catch((e: any) => { console.error(e); setMsg(`${t('Gagal menyimpan ke akun. Periksa koneksi.')} [${e?.code || ''} ${e?.message || e}]`) }) }, 800)
    return () => clearTimeout(h)
  }, [d, ok])

  // Kode pemulihan kata sandi (akun username). Dibuat di server; di sini hanya diminta dan ditampilkan sekali.
  const panggilPulih = useCallback(async (body: any) => {
    const tk = (await sb!.auth.getSession()).data.session?.access_token
    const r = await fetch('/api/pulihkan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` }, body: JSON.stringify(body) })
    return { ok: r.ok, j: (await r.json().catch(() => ({}))) as any }
  }, [])
  useEffect(() => {
    if (!sb || !uid) { setButuhKode(false); return }
    let on = true
    panggilPulih({ aksi: 'status' }).then(({ ok, j }) => { if (on && ok && j.ada === false) { setButuhKode(true); setKodeModal('tawar') } }).catch(() => {})
    return () => { on = false }
  }, [uid])
  const buatKode = async () => {
    setErrKode('')
    const { ok, j } = await panggilPulih({ aksi: 'buat' })
    if (ok && j.kode) { setKodePulih(j.kode); setKodeModal('tampil'); setButuhKode(false) }
    else setErrKode(j.error === 'config' ? t('Fitur ini belum aktif: tambahkan SUPABASE_SERVICE_ROLE_KEY di Vercel dan jalankan SQL tabel recovery, lalu deploy ulang.') : `${t('Gagal membuat kode pemulihan')}${j.detail ? ` (${j.detail})` : ''}`)
  }

  const refresh = useCallback(async () => {
    setLoad(true)
    setCache(p => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== 'gagal')))
    const cur = ref.current
    const kode = Array.from(new Set(cur.saham.map(a => a.kode))).join(',')
    const ids = Array.from(new Set(cur.crypto.map(a => a.coinId))).join(',')
    const kodeUs = Array.from(new Set((cur.ussaham || []).map(a => a.kode))).join(',')
    const mt = Array.from(new Set([...cur.forex.map(a => a.mata), ...((cur.ussaham || []).length ? ['USD'] : [])])).join(',')
    const [s, c, f, u] = await Promise.all([
      kode ? fetch(`/api/saham?kode=${kode}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      fetch(`/api/crypto?ids=${ids}`).then(r => r.json()).catch(() => null),
      mt || cur.emas.length ? fetch(`/api/forex?mata=${mt}${cur.emas.length ? '&emas=1' : ''}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      kodeUs ? fetch(`/api/ussaham?kode=${encodeURIComponent(kodeUs)}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ])
    const now = new Date().toISOString()
    const uOk = u?.harga && Object.keys(u.harga).length > 0, sOk = s?.harga && Object.keys(s.harga).length > 0, cOk = c?.harga && Object.keys(c.harga).length > 0, fOk = f?.harga && Object.keys(f.harga).length > 0
    setD(p => ({ ...p, harga: { saham: { ...p.harga.saham, ...(s?.harga || {}) }, us: { ...(p.harga.us || {}), ...(u?.harga || {}) }, crypto: { ...p.harga.crypto, ...(c?.harga || {}) }, forex: { ...p.harga.forex, ...(f?.harga || {}) }, emas: f?.emas || p.harga.emas || 0, kurs: f?.harga?.USD || c?.kurs || p.harga.kurs, waktu: { saham: sOk ? now : p.harga.waktu.saham, us: uOk ? now : p.harga.waktu.us, crypto: cOk ? now : p.harga.waktu.crypto, forex: fOk ? now : p.harga.waktu.forex } } }))
    const bad = [...(s?.gagal || []), ...(u?.gagal || []), ...(kodeUs && !u ? ['saham AS'] : []), ...(f?.gagal || []), ...(mt && !f ? ['forex'] : []), ...(kode && !s ? ['saham'] : []), ...(ids && !cOk ? ['crypto'] : [])]
    setMsg(bad.length ? `${t('Gagal mengambil harga')}: ${bad.join(', ')}. ${t('Memakai harga terakhir yang tersimpan.')}` : '')
    setLoad(false)
  }, [])
  useEffect(() => { if (ok) refresh() }, [ok, refresh])
  useEffect(() => { if (!ok || !every) return; const t = setInterval(refresh, every * 60000); return () => clearInterval(t) }, [ok, every, refresh])

  const rows = useMemo(() => hitung(d, t), [d, t])

  // Riwayat harga historis tiap aset (tanggal beli -> hari ini), diambil sekali per aset lalu disimpan di memori.
  const butuh = useMemo(() => {
    const o: { key: string; k: Kelas; s: string; dari: string }[] = []
    KELAS.forEach(k => { if (!dariApi(k)) return; d[k].forEach(a => {
      if (!a.tanggal || (k === 'emas' && a.hargaManual > 0)) return
      const key = kunciSeri(k, a); if (!o.some(x => x.key === key)) o.push({ key, k, s: simbolApi(k, a), dari: a.tanggal })
    }) })
    return o
  }, [d.saham, d.ussaham, d.crypto, d.forex, d.emas])
  useEffect(() => {
    if (!ok) return
    butuh.forEach(n => {
      if (cache[n.key] || sedang.current.has(n.key)) return
      sedang.current.add(n.key)
      fetch(`/api/riwayat?k=${n.k}&s=${encodeURIComponent(n.s)}&dari=${n.dari}`).then(r => r.json())
        .then(j => setCache(p => ({ ...p, [n.key]: Array.isArray(j.seri) && j.seri.length ? { m: j.seri, potong: !!j.terpotong } : 'gagal' })))
        .catch(() => setCache(p => ({ ...p, [n.key]: 'gagal' })))
        .finally(() => sedang.current.delete(n.key))
    })
  }, [ok, butuh, cache])
  const sum = (k: Kelas, f: 'modal' | 'nilai' | 'terima') => rows[k].reduce((a, r) => a + (r[f] || 0), 0)
  const total = KELAS.reduce((a, k) => a + sum(k, 'nilai'), 0), modal = KELAS.reduce((a, k) => a + sum(k, 'modal'), 0)
  const pl = total - modal
  const terimaTotal = KELAS.reduce((a, k) => a + sum(k, 'terima'), 0), hasil = pl + terimaTotal // hasil = selisih harga + dividen/kupon/sewa yang diterima
  const hist = useMemo(() => totalHarian(d, rows, cache, d.harga.kurs), [d, rows, cache])
  // Riwayat harian penuh (nilai & modal) sampai hari ini; dipakai grafik total dan perbandingan performa.
  const seriPenuh = useMemo(() => {
    if (hist.seri.length < 2) return []
    const x = hist.seri.slice(), today = hariIni(), p = { t: today, v: total, m: modal }
    if (total > 0) { if (x[x.length - 1].t === today) x[x.length - 1] = p; else x.push(p) }
    return x
  }, [hist, total, modal])
  const grafik = useMemo<{ t: string; v: number; m?: number }[]>(() => (seriPenuh.length > 1 ? ringkas(seriPenuh) : d.riwayat), [seriPenuh, d.riwayat])
  const incomeHarian = useMemo(() => penerimaanHarian(d, d.harga.kurs), [d])
  const pakaiHist = hist.seri.length > 1
  const tickTotal = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(t('id-ID'), grafik.length > 180 ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const pilih = (k: Kelas) => { setTab(k); setKelasAkhir(k); setFokus(null) }

  // Snapshot harian untuk grafik riwayat
  useEffect(() => {
    if (!ok || !total) return
    const t = new Date().toISOString().slice(0, 10)
    setD(p => { const l = p.riwayat[p.riwayat.length - 1]; if (l?.t === t && Math.round(l.v) === Math.round(total) && Math.round(l.m ?? -1) === Math.round(modal)) return p
      return { ...p, riwayat: [...(l?.t === t ? p.riwayat.slice(0, -1) : p.riwayat), { t, v: total, m: modal }].slice(-730) } })
  }, [total, modal, ok])

  // Semua nilai dihitung dalam rupiah, lalu dikonversi saat ditampilkan. asli = true: tetap rupiah (isian dan riwayat catatan).
  const kursAktif = mataTampil === 'IDR' ? 1 : kursMap[mataTampil] // rupiah per 1 unit mata uang tampilan; kosong bila belum termuat
  const mataAktif = kursAktif ? mataTampil : 'IDR'
  const faktor = kursAktif ? 1 / kursAktif : 1
  const M = (n: number, asli = false) => {
    const idr = asli || mataAktif === 'IDR'
    return hide ? `${idr ? 'Rp' : mataAktif} ••••••` : idr ? rp(n) : formatMata(n * faktor, mataAktif, t('id-ID'))
  }
  const simpanAset = (o: any) => { const k = form!.k; setD(p => ({ ...p, [k]: p[k].some(a => a.id === o.id) ? p[k].map(a => (a.id === o.id ? o : a)) : [...p[k], o] })); setForm(null); setTimeout(refresh, 0) }
  const simpanTrx = (x: Trx) => {
    if (!formTrx) return
    const { k, aid, tid } = formTrx
    setD(p => ({ ...p, [k]: p[k].map(a => { if (a.id !== aid) return a; const l = daftarTrx(k, a); return terapkan(k, a, tid ? l.map(y => (y.id === tid ? x : y)) : [...l, x]) }) }))
    setFokus(aid); setFormTrx(null)
  }
  const hapusTrx = (k: Kelas, aid: string, tid: string) => setD(p => ({ ...p, [k]: p[k].map(a => { if (a.id !== aid) return a; const l = daftarTrx(k, a); return l.length > 1 ? terapkan(k, a, l.filter(y => y.id !== tid)) : a }) }))
  const simpanTerima = (x: Terima) => {
    if (!formTerima) return
    const { k, aid, tid } = formTerima
    setD(p => ({ ...p, [k]: p[k].map(a => { if (a.id !== aid) return a; const l: Terima[] = Array.isArray(a.penerimaan) ? a.penerimaan : []; return { ...a, penerimaan: tid ? l.map(y => (y.id === tid ? x : y)) : [...l, x] } }) }))
    setFokus(aid); setFormTerima(null)
  }
  const hapusTerima = (k: Kelas, aid: string, tid: string) => setD(p => ({ ...p, [k]: p[k].map(a => (a.id === aid ? { ...a, penerimaan: (a.penerimaan || []).filter((y: Terima) => y.id !== tid) } : a)) }))
  const hapus = (k: Kelas) => (id: string) => setD(p => ({ ...p, [k]: p[k].filter(a => a.id !== id) }))
  const ket: Record<Kelas, string> = {
    saham: `${t('harga diperbarui')} ${jam(d.harga.waktu.saham, t)}, ${t('tertunda ±10-15 menit')}`, reksa: t('NAV manual'), crypto: `${t('harga diperbarui')} ${jam(d.harga.waktu.crypto, t)}`,
    ussaham: `${t('harga diperbarui')} ${jam(d.harga.waktu.us, t)}, ${t('USD dikonversi dengan kurs terbaru')}`,
    forex: `${t('kurs diperbarui')} ${jam(d.harga.waktu.forex, t)}`, emas: t('harga emas dunia, bisa beda dari harga toko'), properti: t('estimasi manual'), deposito: t('dihitung harian'),
  }
  const donut = KELAS.map(k => ({ k, name: t(NAMA[k]), value: sum(k, 'nilai') })).filter(x => x.value > 0)
  const tabs: ['ringkasan' | Kelas, string][] = [['ringkasan', 'Ringkasan'], ...KELAS.map(k => [k, NAMA[k]] as [Kelas, string])]

  const kelasTab: Kelas | null = KELAS.includes(tab as Kelas) ? (tab as Kelas) : null
  const fAset = kelasTab && fokus ? d[kelasTab].find(a => a.id === fokus) : undefined
  const fBaris = kelasTab && fAset ? rows[kelasTab].find(r => r.id === fAset.id) : undefined
  const sahamTick = useMemo(() => Array.from(new Set([...d.saham.map(a => a.kode), 'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'GOTO', 'ANTM'])).slice(0, 20), [d.saham])
  const usTick = useMemo(() => Array.from(new Set([...(d.ussaham || []).map(a => a.kode), 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'VOO'])).slice(0, 10), [d.ussaham])
  const mataTick = useMemo(() => Array.from(new Set([...(d.forex || []).map(a => a.mata), 'USD', 'EUR', 'SGD', 'JPY'])).slice(0, 8), [d.forex])
  const punyaChart = useMemo((): Pil[] => {
    const l: Pil[] = [...d.saham.map((a): Pil => ({ j: 'saham', s: a.kode, n: a.kode })), ...(d.ussaham || []).map((a): Pil => ({ j: 'ussaham', s: a.kode, n: a.kode })), ...d.crypto.map((a): Pil => ({ j: 'crypto', s: a.coinId, n: a.simbol })), ...(d.forex || []).map((a): Pil => ({ j: 'forex', s: a.mata, n: `${a.mata}/IDR` })), ...((d.emas || []).length ? [{ j: 'emas', s: '', n: 'Emas' } as Pil] : [])]
    return l.filter((x, i) => l.findIndex(y => y.j === x.j && y.s === x.s) === i)
  }, [d.saham, d.ussaham, d.crypto, d.forex, d.emas])

  useEffect(() => {
    if (mataTampil === 'IDR') { setKursGagal(false); return }
    let batal = false
    const muat = () => fetch(`/api/forex?mata=${mataTampil}`).then(r => r.json()).then(j => {
      if (batal) return
      const v = j?.harga?.[mataTampil]
      if (typeof v === 'number' && v > 0) { setKursMap(m => ({ ...m, [mataTampil]: v })); setKursGagal(false) } else setKursGagal(true)
    }).catch(() => { if (!batal) setKursGagal(true) })
    setKursGagal(false)
    muat()
    const id = setInterval(muat, 10 * 60 * 1000)
    return () => { batal = true; clearInterval(id) }
  }, [mataTampil])

  const asetDatar = useMemo(() => KELAS.flatMap(k => rows[k].map(r => ({ nama: r.nama, k, nilai: r.nilai }))), [rows])

  if (sb && cek) return null
  if ((!sb || !user) && layar === 'awal') return <Awal t={t} lang={lang} setLang={pilihBahasa} lokal={!sb} onMasuk={() => { setDaftarAwal(false); setLayar('masuk') }} onDaftar={() => { setDaftarAwal(true); setLayar('masuk') }} />
  if (sb && !user) return <Masuk t={t} lang={lang} setLang={pilihBahasa} daftarAwal={daftarAwal} onKembali={() => setLayar('awal')} />
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20">
      <header ref={headerRef} className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-stone-50/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-lg font-semibold leading-tight">Buat Masa Depan<sup className="text-[10px]">™</sup></h1><p className="text-[11px] leading-tight text-slate-500">{KREDIT}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="!w-auto" value={lang} onChange={e => pilihBahasa(e.target.value as Lang)} aria-label="Language"><option value="id">{t('Indonesia')}</option><option value="en">{t('English')}</option></select>
            <label className="flex items-center gap-1 text-sm text-slate-500"><span className="hidden sm:inline">{t('Mata uang')}</span><select className="!w-auto" value={mataTampil} onChange={e => pilihMata(e.target.value)} aria-label={t('Mata uang tampilan')} title={t('Mata uang tampilan')}>{MATA.map(m => <option key={m[0]} value={m[0]}>{m[0]}</option>)}</select></label>
            <button className="btn" onClick={() => { setHide(!hide); localStorage.setItem('pt-hide', hide ? '0' : '1') }}>{hide ? t('Tampilkan nominal') : t('Sembunyikan nominal')}</button>
            <select className="!w-auto" value={every} onChange={e => setEvery(Number(e.target.value))} aria-label="Auto-refresh"><option value={0}>{t('Auto-refresh mati')}</option><option value={1}>{t('Tiap 1 menit')}</option><option value={5}>{t('Tiap 5 menit')}</option><option value={15}>{t('Tiap 15 menit')}</option></select>
            <button className="btn-p" onClick={refresh} disabled={load}>{load ? t('Memuat…') : t('Refresh sekarang')}</button>
            {sb && namaSapaan(user?.email) && <span className="text-sm text-slate-500">{t('Halo')}, {namaSapaan(user.email)}</span>}
            <TemaToggle t={t} />
            {sb && namaDari(user?.email) && <button className="btn" onClick={() => setKodeModal('tawar')}>{t('Kode pemulihan')}</button>}
            {sb && <button className="btn" onClick={() => { sb.auth.signOut(); setLayar('awal') }}>{t('Keluar')}</button>}
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => { setTab('ringkasan'); setFokus(null) }} className={`whitespace-nowrap rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium ${tab === 'ringkasan' ? 'bg-emerald-700 text-white' : 'text-emerald-700 dark:text-emerald-500'}`}>{t('Ringkasan total')}</button>
          <button onClick={() => { setFokus(null); if (!kelasTab) pilih(kelasAkhir) }} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${kelasTab ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}>{t('Investasi')}</button>
        </nav>
        {kelasTab && <nav className="mt-2 flex gap-1 overflow-x-auto border-t border-slate-200 pt-2 dark:border-slate-800">{KELAS.map(k => <button key={k} onClick={() => pilih(k)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-slate-200 font-medium dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>{t(NAMA[k])}</button>)}</nav>}
      </header>
      {msg && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">{msg}</p>}
      {sb && butuhKode && !kodeModal && <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">{t('Akunmu belum punya kode pemulihan. Tanpa itu, kata sandi yang lupa tidak bisa dipulihkan.')}<button className="font-medium underline" onClick={() => setKodeModal('tawar')}>{t('Buat sekarang')}</button></p>}

      {(tab === 'ringkasan' || tab === 'rebalancing' || tab === 'analisis' || tab === 'perencanaan' || !!kelasTab) && mataTampil !== 'IDR' && (
        <p className={`mt-3 text-xs ${kursAktif || !kursGagal ? 'text-slate-500' : 'text-amber-700 dark:text-amber-400'}`}>
          {kursAktif ? `${t('Nilai dikonversi dari rupiah dengan kurs')} 1 ${mataTampil} = ${rp(kursAktif)} (${t('kurs tengah')}). ${t('Seluruh nilai, termasuk riwayat dan grafik, memakai kurs terbaru ini, bukan kurs pada tanggal transaksi. Isian dan riwayat catatan tetap dalam mata uang aslinya.')}` : kursGagal ? `${t('Kurs')} ${mataTampil} ${t('gagal dimuat, nilai sementara ditampilkan dalam rupiah.')}` : t('Memuat kurs…')}
        </p>
      )}
      <div className={`mt-4 ${kelasTab ? '' : `grid gap-4 ${rail ? 'lg:grid-cols-[minmax(0,1fr)_12rem]' : 'lg:grid-cols-[minmax(0,1fr)_3.5rem]'}`}`}>
        <div className="min-w-0">
        {tab === 'ringkasan' ? (
          <main className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={card}><p className="text-sm text-slate-500">{t('Total nilai')}</p><p className="text-2xl font-semibold">{M(total)}</p></div>
              <div className={card}><p className="text-sm text-slate-500">{t('Total modal')}</p><p className="text-2xl font-semibold">{M(modal)}</p></div>
              <div className={card}><p className="text-sm text-slate-500">{t('Total hasil')}</p><p className={`text-2xl font-semibold ${warna(hasil)}`}>{M(hasil)}</p><p className={`text-sm ${warna(hasil)}`}>{pct(modal ? (hasil / modal) * 100 : 0)}</p><p className="mt-1 text-xs text-slate-500">{t('Selisih harga')} {M(pl)} · {t('Penerimaan')} {M(terimaTotal)}</p></div>
            </div>
            <div className={card}><h2 className="mb-2 font-medium">{t('Riwayat nilai total')}</h2>
              {grafik.length > 1 ? <div className="h-72"><ResponsiveContainer><ComposedChart data={grafik}>
                <XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={tickTotal} minTickGap={40} /><YAxis hide domain={['auto', 'auto']} />
                <Tooltip formatter={(v: number) => M(v)} labelFormatter={(x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(t('id-ID'), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} />
                <Legend verticalAlign="top" height={28} iconType="plainline" />
                <Area name={t('Total nilai')} dataKey="v" type="monotone" stroke="#059669" strokeWidth={2} fill="#05966926" />
                <Line name={t('Total modal')} dataKey="m" type="stepAfter" stroke="#64748b" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
              </ComposedChart></ResponsiveContainer></div>
                : <p className="py-10 text-center text-sm text-slate-500">{t('Grafik muncul setelah aplikasi dibuka di lebih dari satu hari.')}</p>}
              {grafik.length > 1 && <p className="mt-2 text-xs text-slate-500">{t('Garis total nilai di atas garis total modal berarti untung; di bawahnya berarti rugi.')}</p>}
              {pakaiHist && <p className="mt-1 text-xs text-slate-500">{t('Dihitung dari tanggal beli tiap aset memakai harga historis.')}{hist.tanpaData > 0 && ` ${t('Aset tanpa data harga historis dihitung sebesar modal.')}`}{butuh.some(n => !cache[n.key]) && ` ${t('Memuat riwayat harga…')}`}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className={card}><h2 className="mb-2 font-medium">{t('Alokasi aset')}</h2>
                {donut.length ? <><div className="h-52"><ResponsiveContainer><PieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{donut.map(x => <Cell key={x.k} fill={WARNA[x.k]} />)}</Pie><Tooltip formatter={(v: number) => M(v)} /></PieChart></ResponsiveContainer></div>
                  <ul className="mt-2 space-y-1 text-sm">{donut.map(x => <li key={x.k} className="flex justify-between"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: WARNA[x.k] }} />{x.name}</span><span>{((x.value / total) * 100).toFixed(1)}%</span></li>)}</ul></>
                  : <p className="py-10 text-center text-sm text-slate-500">{t('Belum ada data. Tambahkan aset atau muat data contoh di bawah.')}</p>}
              </div>
              <div className={card}><h2 className="mb-2 font-medium">{t('Per kelas aset')}</h2>
              <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">{KELAS.map(k => <li key={k} className="flex justify-between py-2"><span>{t(NAMA[k])} <span className="text-xs text-slate-500">({ket[k]})</span></span><span>{M(sum(k, 'nilai'))}</span></li>)}</ul>
            </div>
            </div>
            <div className={card}><h2 className="mb-2 font-medium">{t('Data dan backup')}</h2>
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={() => ekspor(d)}>{t('Ekspor JSON')}</button>
                <button className="btn" onClick={() => fileRef.current?.click()}>{t('Impor JSON')}</button>
                <button className="btn" onClick={() => confirm(t('Ganti semua data dengan data contoh?')) && setD(contoh())}>{t('Muat data contoh')}</button>
                <button className="btn text-red-600" onClick={() => confirm(t('Hapus semua data portofolio? Ekspor dulu jika perlu.')) && setD(kosong())}>{t('Hapus semua data')}</button>
                <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setD(await impor(f)); setMsg('') } catch (x: any) { setMsg(x.message || t('Gagal membaca file')) } e.target.value = '' }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{t(sb ? 'Data tersimpan di akunmu. Ekspor JSON tetap berguna sebagai cadangan.' : 'Data tersimpan hanya di browser ini. Ekspor secara berkala sebagai cadangan.')}</p>
            </div>
          </main>
        ) : tab === 'charts' ? (
          <main><Charts t={t} punya={punyaChart} /></main>
        ) : tab === 'rebalancing' ? (
          <main><Rebalancing t={t} M={M} faktor={faktor} kode={mataAktif} nilai={Object.fromEntries(KELAS.map(k => [k, sum(k, 'nilai')])) as Record<Kelas, number>} target={d.target || {}} nama={NAMA} warna={WARNA}
            onTarget={(k, v) => setD(p => { const tg = { ...(p.target || {}) }; if (v == null) delete tg[k]; else tg[k] = v; return { ...p, target: tg } })} onSemua={v => setD(p => ({ ...p, target: v }))} /></main>
        ) : tab === 'performa' ? (
          <main><Performa t={t} seri={seriPenuh} income={incomeHarian} memuat={butuh.some(n => !cache[n.key])} /></main>
        ) : tab === 'kalender' ? (
          <main><Kalender t={t} /></main>
          ) : tab === 'analisis' ? (
            <main><Analisis t={t} M={M} faktor={faktor} kode={mataAktif} nilai={Object.fromEntries(KELAS.map(k => [k, sum(k, 'nilai')])) as Record<Kelas, number>} aset={asetDatar} target={d.target || {}} nama={NAMA} warna={WARNA} onKeRebalancing={() => { setFokus(null); setTab('rebalancing') }} /></main>
          ) : tab === 'perencanaan' ? (
            <main><Perencanaan t={t} M={M} faktor={faktor} kode={mataAktif} totalPorto={KELAS.reduce((a, k) => a + sum(k, 'nilai'), 0)} nama={NAMA} warna={WARNA} /></main>
          ) : tab === 'kalkulator' ? (
            <main><KalkulatorForex t={t} /></main>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <main className="min-w-0 space-y-3">
              <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{t(NAMA[tab])}</h2><p className="text-sm text-slate-500">{t('Nilai')} {M(sum(tab, 'nilai'))} · {t('Modal')} {M(sum(tab, 'modal'))}</p></div><button className="btn-p" onClick={() => setForm({ k: tab })}>{t('Tambah')}</button></div>
              {fAset && fBaris && <RingkasanAset k={tab} a={fAset} r={fBaris} cache={cache} M={M} t={t} onTambahTrx={() => setFormTrx({ k: tab, aid: fAset.id })} onUbahTrx={tid => setFormTrx({ k: tab, aid: fAset.id, tid })} onHapusTrx={tid => hapusTrx(tab, fAset.id, tid)} kurs={d.harga.kurs} onTambahTerima={() => setFormTerima({ k: tab, aid: fAset.id })} onUbahTerima={tid => setFormTerima({ k: tab, aid: fAset.id, tid })} onHapusTerima={tid => hapusTerima(tab, fAset.id, tid)} />}
              <Daftar t={t} rows={rows[tab]} M={M} onEdit={id => setForm({ k: tab, id })} onDel={hapus(tab)} fokus={fAset ? fokus : null} onFokus={id => setFokus(fokus === id ? null : id)} bisaBeli={punyaTrx(tab)} onBeli={id => setFormTrx({ k: tab, aid: id })} />
            </main>
            <Berita q={topik(tab, lang, fAset)} label={fAset && fBaris ? `${fBaris.nama} (${t(NAMA[tab])})` : `${t(NAMA[tab])} · ${t('berita umum')}`} lang={lang} t={t} />
          </div>
        )}
        </div>
        {!kelasTab && <PanelFitur t={t} aktif={tab} onPilih={(id: FiturId) => { setFokus(null); setTab(id) }} buka={rail} onBuka={bukaRail} headerRef={headerRef} />}
      </div>
      {kodeModal && <ModalKode t={t} mode={kodeModal} kode={kodePulih} err={errKode} butuh={butuhKode} username={namaDari(user?.email)} onBuat={buatKode} onTutup={() => { setKodeModal(null); setKodePulih(''); setErrKode('') }} />}
      {pulihEmail && <SandiBaru t={t} onSelesai={() => setPulihEmail(false)} />}
      {formTerima && (() => { const a = d[formTerima.k].find(x => x.id === formTerima.aid); return a ? <FormTerima k={formTerima.k} a={a} awal={formTerima.tid ? daftarTerima(a).find(x => x.id === formTerima.tid) : undefined} t={t} onSave={simpanTerima} onClose={() => setFormTerima(null)} /> : null })()}
      {formTrx && (() => { const a = d[formTrx.k].find(x => x.id === formTrx.aid); return a ? <FormTrx k={formTrx.k} a={a} awal={formTrx.tid ? daftarTrx(formTrx.k, a).find(x => x.id === formTrx.tid) : undefined} t={t} onSave={simpanTrx} onClose={() => setFormTrx(null)} /> : null })()}
      {form && <Form t={t} k={form.k} awal={form.id ? d[form.k].find(a => a.id === form.id) : undefined} onSave={simpanAset} onClose={() => setForm(null)} />}
      <Ticker saham={sahamTick} us={usTick} mata={mataTick} t={t} />
      <footer className="mt-10 text-center text-xs text-slate-500">{t('Harga bukan saran investasi dan bisa tertunda. Saham ±10-15 menit, NAV reksadana hanya diperbarui harian.')}<p className="mt-2 font-medium">Buat Masa Depan™ · {KREDIT} · © {new Date().getFullYear()} Dani</p></footer>
    </div>
  )
}
