'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine } from 'recharts'
import { Data, Kelas } from '@/lib/types'
import { muat, simpan, muatCloud, simpanCloud, kosong, ekspor, impor, contoh } from '@/lib/storage'
import { sb } from '@/lib/supabase'
import { tr, Lang } from '@/lib/i18n'
import { hitung, rp, Baris } from '@/lib/calc'
import { Cache, seriAset, kunciSeri, dariApi, simbolApi, totalHarian, ringkas, hariIni, selisihHari } from '@/lib/seri'

const NAMA: Record<Kelas, string> = { saham: 'Saham', reksa: 'Reksadana', crypto: 'Crypto', forex: 'Forex', emas: 'Emas', properti: 'Properti', deposito: 'Deposito' }
const WARNA: Record<Kelas, string> = { saham: '#2563eb', reksa: '#059669', crypto: '#d97706', forex: '#0891b2', emas: '#ca8a04', properti: '#be123c', deposito: '#7c3aed' }
const KELAS = Object.keys(NAMA) as Kelas[]
const KREDIT = 'Created by Dani'
const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const warna = (n: number) => (n >= 0 ? 'text-emerald-600' : 'text-red-600')
const jam = (s: string | undefined, t: (x: string) => string) => (s ? new Date(s).toLocaleTimeString(t('id-ID'), { hour: '2-digit', minute: '2-digit' }) : t('belum pernah'))

type Fld = [string, string, string, string[]?]
const F: Record<Kelas, Fld[]> = {
  saham: [['kode', 'Kode saham (mis. BBCA)', 'text'], ['jumlah', 'Jumlah', 'number'], ['satuan', 'Satuan', 'select', ['Lot', 'Lembar']], ['hargaBeli', 'Harga beli rata-rata per lembar (Rp)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  reksa: [['nama', 'Nama produk', 'text'], ['jenis', 'Jenis', 'select', ['Pasar uang', 'Obligasi', 'Campuran', 'Saham']], ['unit', 'Jumlah unit', 'number'], ['navBeli', 'NAV beli per unit (Rp)', 'number'], ['tanggal', 'Tanggal beli', 'date'], ['navTerbaru', 'NAV terbaru (Rp)', 'number'], ['tglNav', 'Tanggal NAV terbaru', 'date']],
  crypto: [['coinId', 'ID coin CoinGecko (mis. bitcoin)', 'text'], ['simbol', 'Simbol (mis. BTC)', 'text'], ['jumlah', 'Jumlah koin', 'desimal'], ['hargaBeli', 'Harga beli rata-rata per koin', 'number'], ['mata', 'Mata uang harga beli', 'select', ['IDR', 'USD']], ['tanggal', 'Tanggal beli', 'date']],
  forex: [['mata', 'Mata uang', 'select', ['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'AUD', 'MYR', 'CNY', 'HKD', 'SAR']], ['jumlah', 'Jumlah (dalam mata uang asing)', 'number'], ['kursBeli', 'Kurs beli rata-rata (Rp per 1 unit)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  emas: [['jenis', 'Jenis', 'select', ['Emas batangan', 'Perhiasan', 'Emas digital']], ['gram', 'Jumlah (gram)', 'number'], ['hargaBeli', 'Harga beli per gram (Rp)', 'number'], ['hargaManual', 'Harga jual sekarang per gram (opsional)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  properti: [['nama', 'Nama properti', 'text'], ['jenis', 'Jenis', 'select', ['Tanah', 'Rumah', 'Apartemen', 'Ruko']], ['lokasi', 'Lokasi (opsional)', 'text'], ['hargaBeli', 'Harga beli (Rp)', 'number'], ['nilai', 'Estimasi nilai sekarang (Rp)', 'number'], ['tglNilai', 'Tanggal estimasi nilai', 'date'], ['tanggal', 'Tanggal beli', 'date']],
  deposito: [['bank', 'Bank', 'text'], ['pokok', 'Nominal pokok (Rp)', 'number'], ['bunga', 'Bunga per tahun (%)', 'number'], ['tanggal', 'Tanggal mulai', 'date'], ['tenor', 'Tenor (bulan)', 'number'], ['pajak', 'Pajak bunga (%)', 'number'], ['aro', 'Perpanjang otomatis (ARO)', 'select', ['Tidak', 'Ya']]],
}

// Login memakai username: di balik layar diubah jadi email palsu "username@DOMAIN" karena Supabase Auth butuh email.
const DOMAIN = 'portfolio-tracker.app'
const keEmail = (u: string) => { const x = u.trim(); return x.includes('@') ? x : `${x.toLowerCase()}@${DOMAIN}` }
const namaDari = (e?: string) => (e && e.endsWith(`@${DOMAIN}`) ? e.slice(0, -(DOMAIN.length + 1)) : '')

const topik = (k: Kelas, lang: Lang, a?: any): string => {
  const en = lang === 'en'
  if (!a) return (en
    ? { saham: 'Indonesia stocks IDX', reksa: 'Indonesia mutual funds', crypto: 'cryptocurrency price', forex: 'rupiah exchange rate', emas: 'gold price', properti: 'Indonesia property market', deposito: 'time deposit interest rates' }
    : { saham: 'saham IHSG', reksa: 'reksadana', crypto: 'cryptocurrency harga', forex: 'kurs rupiah dolar', emas: 'harga emas', properti: 'harga properti', deposito: 'suku bunga deposito' })[k]
  if (k === 'saham') return `${a.kode} ${en ? 'stock' : 'saham'}`
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

function RingkasanAset({ k, a, r, cache, M, t }: { k: Kelas; a: any; r: Baris; cache: Cache; M: (n: number) => string; t: (s: string) => string }) {
  const loc = t('id-ID'), pasar = k === 'saham' || k === 'crypto' || k === 'forex' || k === 'emas'
  const c = dariApi(k) && !(k === 'emas' && a.hargaManual > 0) ? cache[kunciSeri(k, a)] : undefined
  const s = useMemo(() => seriAset(k, a, c), [k, a, c])
  const tgl = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const tick = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(loc, s && s.length > 180 ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const lama = a.tanggal ? selisihHari(a.tanggal, hariIni()) : 0
  const pl = r.nilai - r.modal, pp = r.modal ? (pl / r.modal) * 100 : 0
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
        {stat(t('Untung/rugi'), M(pl), warna(pl))}
        {stat('%', pct(pp), warna(pl))}
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
    for (const [key, label, tp] of F[k]) {
      const x = (v[key] || '').trim()
      if (tp === 'select') continue
      if (!x) { if (key === 'hargaManual' || key === 'lokasi') continue; return setErr(`${t(label)} ${t('wajib diisi')}`) }
      if (tp === 'number' || tp === 'desimal') {
        const n = Number(x.replace(',', '.'))
        if (!isFinite(n) || n < 0) return setErr(`${t(label)} ${t('harus berupa angka positif')}`)
        if (n === 0 && key !== 'bunga' && key !== 'pajak') return setErr(`${t(label)} ${t('harus lebih dari 0')}`)
      }
    }
    if (k === 'deposito' && (Number(v.pajak) > 100 || !Number.isInteger(Number(v.tenor)))) return setErr(t('Pajak maksimal 100% dan tenor harus bilangan bulat'))
    const o: any = { id: awal?.id || Math.random().toString(36).slice(2) + Date.now().toString(36) }
    F[k].forEach(([key, , tp]) => { o[key] = tp === 'number' ? Number(v[key]) : tp === 'desimal' ? Number(v[key].trim().replace(',', '.')) : v[key].trim() })
    if (k === 'saham') { o.lembar = v.satuan === 'Lot' ? o.jumlah * 100 : o.jumlah; o.kode = o.kode.toUpperCase(); delete o.jumlah; delete o.satuan }
    if (k === 'crypto') { o.coinId = o.coinId.toLowerCase(); o.simbol = o.simbol.toUpperCase() }
    if (k === 'deposito') o.aro = v.aro === 'Ya'
    onSave(o)
  }
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-slate-900 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{t(awal ? 'Ubah' : 'Tambah')} {t(NAMA[k]).toLowerCase()}</h2>
        <div className="space-y-3">
          {F[k].map(([key, label, tp, opts]) => (
            <label key={key} className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t(label)}</span>
              {tp === 'select' ? <select value={v[key]} onChange={e => ubah(key, e.target.value)}>{opts!.map(o => <option key={o} value={o}>{t(o)}</option>)}</select>
                : <input type={tp === 'number' ? 'number' : tp === 'desimal' ? 'text' : tp} step="any" inputMode={tp === 'number' || tp === 'desimal' ? 'decimal' : undefined} placeholder={tp === 'desimal' ? '0.5' : undefined} list={key === 'coinId' ? 'coins' : undefined} value={v[key]} onChange={e => ubah(key, tp === 'desimal' ? e.target.value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/^(\d*\.\d*)\..*$/, '$1') : e.target.value)} />}
            </label>
          ))}
          <datalist id="coins">{opsi.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}</datalist>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>{t('Batal')}</button><button className="btn-p" onClick={kirim}>{t('Simpan')}</button></div>
      </div>
    </div>
  )
}

function Daftar({ rows, M, t, onEdit, onDel, fokus, onFokus }: { t: (s: string) => string; rows: Baris[]; M: (n: number) => string; onEdit: (id: string) => void; onDel: (id: string) => void; fokus: string | null; onFokus: (id: string) => void }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-slate-500">{t('Belum ada aset di sini. Tekan Tambah untuk memasukkan yang pertama.')}</p>
  const pl = (r: Baris) => r.nilai - r.modal
  const pp = (r: Baris) => (r.modal ? (pl(r) / r.modal) * 100 : 0)
  const Aksi = ({ id }: { id: string }) => (
    <span className="flex flex-wrap justify-end gap-x-3 text-sm"><button className="text-emerald-700 dark:text-emerald-500" onClick={() => onFokus(id)}>{fokus === id ? t('Tutup') : t('Ringkasan')}</button><button className="text-blue-600" onClick={() => onEdit(id)}>{t('Ubah')}</button><button className="text-red-600" onClick={() => confirm(t('Hapus aset ini?')) && onDel(id)}>{t('Hapus')}</button></span>
  )
  const Info = ({ r }: { r: Baris }) => <p className={`text-xs ${r.warn ? 'text-amber-600' : 'text-slate-500'}`}>{r.info}{r.est != null && ` · ${t('Estimasi saat jatuh tempo')} ${M(r.est)}`}</p>
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map(r => (
          <div key={r.id} className={`${card}${fokus === r.id ? ' ring-2 ring-emerald-600' : ''}`}>
            <div className="flex justify-between"><div><p className="font-semibold">{r.nama}</p><p className="text-xs text-slate-500">{r.sub}</p></div><Aksi id={r.id} /></div>
            <p className="mt-2 text-xl font-semibold">{M(r.nilai)}</p>
            <p className={`text-sm ${warna(pl(r))}`}>{M(pl(r))} ({pct(pp(r))})</p>
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
              <td className={`px-3 py-2 ${warna(pl(r))}`}>{M(pl(r))}<br />{pct(pp(r))}</td><td className="px-3 py-2"><Aksi id={r.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Masuk({ t, lang, setLang }: { t: (s: string) => string; lang: Lang; setLang: (l: Lang) => void }) {
  const [daftar, setDaftar] = useState(false)
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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Portfolio Tracker</h1>
        <select className="!w-auto" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language"><option value="id">Indonesia</option><option value="en">English</option></select></div>
      <p className="text-sm text-slate-500">{t('Data portofolio tersimpan di akunmu dan sinkron di semua perangkat.')}</p>
      <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" placeholder="Username" value={nama} onChange={e => setNama(e.target.value)} />
      <input type="password" autoComplete={daftar ? 'new-password' : 'current-password'} placeholder={t('Kata sandi')} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && kirim()} />
      {err && <p className="text-sm text-red-600">{err}</p>}{info && <p className="text-sm text-emerald-700">{info}</p>}
      <button className="btn-p" disabled={busy} onClick={kirim}>{daftar ? t('Daftar') : t('Masuk')}</button>
      <button className="text-sm text-blue-600" onClick={() => { setDaftar(!daftar); setErr(''); setInfo('') }}>{daftar ? t('Sudah punya akun? Masuk') : t('Belum punya akun? Daftar')}</button>
      <p className="mt-4 text-center text-xs text-slate-500">Portfolio Tracker™ · {KREDIT}</p>
    </div>
  )
}

export default function Home() {
  const [d, setD] = useState<Data>(kosong())
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<'ringkasan' | Kelas>('ringkasan')
  const [kelasAkhir, setKelasAkhir] = useState<Kelas>('saham')
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
  const uid = user?.id
  useEffect(() => {
    setHide(localStorage.getItem('pt-hide') === '1')
    setLang(localStorage.getItem('pt-lang') === 'en' ? 'en' : 'id')
    if (!sb) { setD(muat()); setOk(true); return }
    sb.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setCek(false) })
    const { data: l } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
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

  const refresh = useCallback(async () => {
    setLoad(true)
    setCache(p => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== 'gagal')))
    const cur = ref.current
    const kode = Array.from(new Set(cur.saham.map(a => a.kode))).join(',')
    const ids = Array.from(new Set(cur.crypto.map(a => a.coinId))).join(',')
    const mt = Array.from(new Set(cur.forex.map(a => a.mata))).join(',')
    const [s, c, f] = await Promise.all([
      kode ? fetch(`/api/saham?kode=${kode}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      fetch(`/api/crypto?ids=${ids}`).then(r => r.json()).catch(() => null),
      mt || cur.emas.length ? fetch(`/api/forex?mata=${mt}${cur.emas.length ? '&emas=1' : ''}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
    ])
    const now = new Date().toISOString()
    const sOk = s?.harga && Object.keys(s.harga).length > 0, cOk = c?.harga && Object.keys(c.harga).length > 0, fOk = f?.harga && Object.keys(f.harga).length > 0
    setD(p => ({ ...p, harga: { saham: { ...p.harga.saham, ...(s?.harga || {}) }, crypto: { ...p.harga.crypto, ...(c?.harga || {}) }, forex: { ...p.harga.forex, ...(f?.harga || {}) }, emas: f?.emas || p.harga.emas || 0, kurs: f?.harga?.USD || c?.kurs || p.harga.kurs, waktu: { saham: sOk ? now : p.harga.waktu.saham, crypto: cOk ? now : p.harga.waktu.crypto, forex: fOk ? now : p.harga.waktu.forex } } }))
    const bad = [...(s?.gagal || []), ...(f?.gagal || []), ...(mt && !f ? ['forex'] : []), ...(kode && !s ? ['saham'] : []), ...(ids && !cOk ? ['crypto'] : [])]
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
  }, [d.saham, d.crypto, d.forex, d.emas])
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
  const sum = (k: Kelas, f: 'modal' | 'nilai') => rows[k].reduce((a, r) => a + r[f], 0)
  const total = KELAS.reduce((a, k) => a + sum(k, 'nilai'), 0), modal = KELAS.reduce((a, k) => a + sum(k, 'modal'), 0)
  const pl = total - modal
  const hist = useMemo(() => totalHarian(d, rows, cache), [d, rows, cache])
  const grafik = useMemo(() => {
    if (hist.seri.length < 2) return d.riwayat
    const s = hist.seri.slice(), today = hariIni()
    if (total > 0) { if (s[s.length - 1].t === today) s[s.length - 1] = { t: today, v: total }; else s.push({ t: today, v: total }) }
    return ringkas(s)
  }, [hist, d.riwayat, total])
  const pakaiHist = hist.seri.length > 1
  const tickTotal = (x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(t('id-ID'), grafik.length > 180 ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const pilih = (k: Kelas) => { setTab(k); setKelasAkhir(k); setFokus(null) }

  // Snapshot harian untuk grafik riwayat
  useEffect(() => {
    if (!ok || !total) return
    const t = new Date().toISOString().slice(0, 10)
    setD(p => { const l = p.riwayat[p.riwayat.length - 1]; if (l?.t === t && Math.round(l.v) === Math.round(total)) return p
      return { ...p, riwayat: [...(l?.t === t ? p.riwayat.slice(0, -1) : p.riwayat), { t, v: total }].slice(-730) } })
  }, [total, ok])

  const M = (n: number) => (hide ? 'Rp ••••••' : rp(n))
  const simpanAset = (o: any) => { const k = form!.k; setD(p => ({ ...p, [k]: p[k].some(a => a.id === o.id) ? p[k].map(a => (a.id === o.id ? o : a)) : [...p[k], o] })); setForm(null); setTimeout(refresh, 0) }
  const hapus = (k: Kelas) => (id: string) => setD(p => ({ ...p, [k]: p[k].filter(a => a.id !== id) }))
  const ket: Record<Kelas, string> = {
    saham: `${t('harga diperbarui')} ${jam(d.harga.waktu.saham, t)}, ${t('tertunda ±10-15 menit')}`, reksa: t('NAV manual'), crypto: `${t('harga diperbarui')} ${jam(d.harga.waktu.crypto, t)}`,
    forex: `${t('kurs diperbarui')} ${jam(d.harga.waktu.forex, t)}`, emas: t('harga emas dunia, bisa beda dari harga toko'), properti: t('estimasi manual'), deposito: t('dihitung harian'),
  }
  const donut = KELAS.map(k => ({ k, name: t(NAMA[k]), value: sum(k, 'nilai') })).filter(x => x.value > 0)
  const tabs: ['ringkasan' | Kelas, string][] = [['ringkasan', 'Ringkasan'], ...KELAS.map(k => [k, NAMA[k]] as [Kelas, string])]

  const fAset = tab !== 'ringkasan' && fokus ? d[tab].find(a => a.id === fokus) : undefined
  const fBaris = tab !== 'ringkasan' && fAset ? rows[tab].find(r => r.id === fAset.id) : undefined

  if (sb && cek) return null
  if (sb && !user) return <Masuk t={t} lang={lang} setLang={pilihBahasa} />
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      <header className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-stone-50/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-lg font-semibold leading-tight">{t('Portfolio Tracker')}<sup className="text-[10px]">™</sup></h1><p className="text-[11px] leading-tight text-slate-500">{KREDIT}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="!w-auto" value={lang} onChange={e => pilihBahasa(e.target.value as Lang)} aria-label="Language"><option value="id">{t('Indonesia')}</option><option value="en">{t('English')}</option></select>
            <button className="btn" onClick={() => { setHide(!hide); localStorage.setItem('pt-hide', hide ? '0' : '1') }}>{hide ? t('Tampilkan nominal') : t('Sembunyikan nominal')}</button>
            <select className="!w-auto" value={every} onChange={e => setEvery(Number(e.target.value))} aria-label="Auto-refresh"><option value={0}>{t('Auto-refresh mati')}</option><option value={1}>{t('Tiap 1 menit')}</option><option value={5}>{t('Tiap 5 menit')}</option><option value={15}>{t('Tiap 15 menit')}</option></select>
            <button className="btn-p" onClick={refresh} disabled={load}>{load ? t('Memuat…') : t('Refresh sekarang')}</button>
            {sb && namaDari(user?.email) && <span className="text-sm text-slate-500">@{namaDari(user.email)}</span>}
            {sb && <button className="btn" onClick={() => sb.auth.signOut()}>{t('Keluar')}</button>}
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => { setTab('ringkasan'); setFokus(null) }} className={`whitespace-nowrap rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-medium ${tab === 'ringkasan' ? 'bg-emerald-700 text-white' : 'text-emerald-700 dark:text-emerald-500'}`}>{t('Ringkasan total')}</button>
          <button onClick={() => tab === 'ringkasan' && pilih(kelasAkhir)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${tab !== 'ringkasan' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}>{t('Investasi')}</button>
        </nav>
        {tab !== 'ringkasan' && <nav className="mt-2 flex gap-1 overflow-x-auto border-t border-slate-200 pt-2 dark:border-slate-800">{KELAS.map(k => <button key={k} onClick={() => pilih(k)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-slate-200 font-medium dark:bg-slate-700' : 'text-slate-600 dark:text-slate-400'}`}>{t(NAMA[k])}</button>)}</nav>}
      </header>
      {msg && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">{msg}</p>}

      {tab === 'ringkasan' ? (
        <main className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={card}><p className="text-sm text-slate-500">{t('Total nilai')}</p><p className="text-2xl font-semibold">{M(total)}</p></div>
            <div className={card}><p className="text-sm text-slate-500">{t('Total modal')}</p><p className="text-2xl font-semibold">{M(modal)}</p></div>
            <div className={card}><p className="text-sm text-slate-500">{t('Untung/rugi')}</p><p className={`text-2xl font-semibold ${warna(pl)}`}>{M(pl)}</p><p className={`text-sm ${warna(pl)}`}>{pct(modal ? (pl / modal) * 100 : 0)}</p></div>
          </div>
          <div className={card}><h2 className="mb-2 font-medium">{t('Riwayat nilai total')}</h2>
            {grafik.length > 1 ? <div className="h-64"><ResponsiveContainer><AreaChart data={grafik}><XAxis dataKey="t" tick={{ fontSize: 11 }} tickFormatter={tickTotal} minTickGap={40} /><YAxis hide domain={['auto', 'auto']} /><Tooltip formatter={(v: number) => M(v)} labelFormatter={(x: string) => new Date(x + 'T00:00:00Z').toLocaleDateString(t('id-ID'), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} /><Area dataKey="v" type="monotone" stroke="#059669" fill="#05966933" /></AreaChart></ResponsiveContainer></div>
              : <p className="py-10 text-center text-sm text-slate-500">{t('Grafik muncul setelah aplikasi dibuka di lebih dari satu hari.')}</p>}
            {pakaiHist && <p className="mt-2 text-xs text-slate-500">{t('Dihitung dari tanggal beli tiap aset memakai harga historis.')}{hist.tanpaData > 0 && ` ${t('Aset tanpa data harga historis dihitung sebesar modal.')}`}{butuh.some(n => !cache[n.key]) && ` ${t('Memuat riwayat harga…')}`}</p>}
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
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="min-w-0 space-y-3">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{t(NAMA[tab])}</h2><p className="text-sm text-slate-500">{t('Nilai')} {M(sum(tab, 'nilai'))} · {t('Modal')} {M(sum(tab, 'modal'))}</p></div><button className="btn-p" onClick={() => setForm({ k: tab })}>{t('Tambah')}</button></div>
            {fAset && fBaris && <RingkasanAset k={tab} a={fAset} r={fBaris} cache={cache} M={M} t={t} />}
            <Daftar t={t} rows={rows[tab]} M={M} onEdit={id => setForm({ k: tab, id })} onDel={hapus(tab)} fokus={fAset ? fokus : null} onFokus={id => setFokus(fokus === id ? null : id)} />
          </main>
          <Berita q={topik(tab, lang, fAset)} label={fAset && fBaris ? `${fBaris.nama} (${t(NAMA[tab])})` : `${t(NAMA[tab])} · ${t('berita umum')}`} lang={lang} t={t} />
        </div>
      )}
      {form && <Form t={t} k={form.k} awal={form.id ? d[form.k].find(a => a.id === form.id) : undefined} onSave={simpanAset} onClose={() => setForm(null)} />}
      <footer className="mt-10 text-center text-xs text-slate-500">{t('Harga bukan saran investasi dan bisa tertunda. Saham ±10-15 menit, NAV reksadana hanya diperbarui harian.')}<p className="mt-2 font-medium">Portfolio Tracker™ · {KREDIT} · © {new Date().getFullYear()} Dani</p></footer>
    </div>
  )
}
