'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'
import { Data, Kelas } from '@/lib/types'
import { muat, simpan, muatCloud, simpanCloud, kosong, ekspor, impor, contoh } from '@/lib/storage'
import { sb } from '@/lib/supabase'
import { tr, Lang } from '@/lib/i18n'
import { hitung, rp, Baris } from '@/lib/calc'

const NAMA: Record<Kelas, string> = { saham: 'Saham', reksa: 'Reksadana', crypto: 'Crypto', forex: 'Forex', emas: 'Emas', properti: 'Properti', deposito: 'Deposito' }
const WARNA: Record<Kelas, string> = { saham: '#2563eb', reksa: '#059669', crypto: '#d97706', forex: '#0891b2', emas: '#ca8a04', properti: '#be123c', deposito: '#7c3aed' }
const KELAS = Object.keys(NAMA) as Kelas[]
const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const warna = (n: number) => (n >= 0 ? 'text-emerald-600' : 'text-red-600')
const jam = (s: string | undefined, t: (x: string) => string) => (s ? new Date(s).toLocaleTimeString(t('id-ID'), { hour: '2-digit', minute: '2-digit' }) : t('belum pernah'))

type Fld = [string, string, string, string[]?]
const F: Record<Kelas, Fld[]> = {
  saham: [['kode', 'Kode saham (mis. BBCA)', 'text'], ['jumlah', 'Jumlah', 'number'], ['satuan', 'Satuan', 'select', ['Lot', 'Lembar']], ['hargaBeli', 'Harga beli rata-rata per lembar (Rp)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  reksa: [['nama', 'Nama produk', 'text'], ['jenis', 'Jenis', 'select', ['Pasar uang', 'Obligasi', 'Campuran', 'Saham']], ['unit', 'Jumlah unit', 'number'], ['navBeli', 'NAV beli per unit (Rp)', 'number'], ['tanggal', 'Tanggal beli', 'date'], ['navTerbaru', 'NAV terbaru (Rp)', 'number'], ['tglNav', 'Tanggal NAV terbaru', 'date']],
  crypto: [['coinId', 'ID coin CoinGecko (mis. bitcoin)', 'text'], ['simbol', 'Simbol (mis. BTC)', 'text'], ['jumlah', 'Jumlah koin', 'number'], ['hargaBeli', 'Harga beli rata-rata per koin', 'number'], ['mata', 'Mata uang harga beli', 'select', ['IDR', 'USD']], ['tanggal', 'Tanggal beli', 'date']],
  forex: [['mata', 'Mata uang', 'select', ['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'AUD', 'MYR', 'CNY', 'HKD', 'SAR']], ['jumlah', 'Jumlah (dalam mata uang asing)', 'number'], ['kursBeli', 'Kurs beli rata-rata (Rp per 1 unit)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  emas: [['jenis', 'Jenis', 'select', ['Emas batangan', 'Perhiasan', 'Emas digital']], ['gram', 'Jumlah (gram)', 'number'], ['hargaBeli', 'Harga beli per gram (Rp)', 'number'], ['hargaManual', 'Harga jual sekarang per gram (opsional)', 'number'], ['tanggal', 'Tanggal beli', 'date']],
  properti: [['nama', 'Nama properti', 'text'], ['jenis', 'Jenis', 'select', ['Tanah', 'Rumah', 'Apartemen', 'Ruko']], ['lokasi', 'Lokasi (opsional)', 'text'], ['hargaBeli', 'Harga beli (Rp)', 'number'], ['nilai', 'Estimasi nilai sekarang (Rp)', 'number'], ['tglNilai', 'Tanggal estimasi nilai', 'date'], ['tanggal', 'Tanggal beli', 'date']],
  deposito: [['bank', 'Bank', 'text'], ['pokok', 'Nominal pokok (Rp)', 'number'], ['bunga', 'Bunga per tahun (%)', 'number'], ['tanggal', 'Tanggal mulai', 'date'], ['tenor', 'Tenor (bulan)', 'number'], ['pajak', 'Pajak bunga (%)', 'number'], ['aro', 'Perpanjang otomatis (ARO)', 'select', ['Tidak', 'Ya']]],
}

function Form({ k, awal, t, onSave, onClose }: { t: (s: string) => string; k: Kelas; awal?: any; onSave: (o: any) => void; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [v, setV] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    F[k].forEach(([key, , t, opts]) => {
      let x = awal?.[key]
      if (k === 'saham' && key === 'jumlah') x = awal?.lembar
      if (k === 'saham' && key === 'satuan') x = awal ? 'Lembar' : 'Lot'
      if (key === 'aro' && awal) x = awal.aro ? 'Ya' : 'Tidak'
      if (key === 'hargaManual' && !x) x = ''
      o[key] = x != null ? String(x) : t === 'date' ? today : key === 'pajak' ? '20' : opts ? opts[0] : ''
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
    for (const [key, label, t] of F[k]) {
      const x = (v[key] || '').trim()
      if (t === 'select') continue
      if (!x) { if (key === 'hargaManual' || key === 'lokasi') continue; return setErr(`${t(label)} ${t('wajib diisi')}`) }
      if (t === 'number') {
        const n = Number(x)
        if (!isFinite(n) || n < 0) return setErr(`${t(label)} ${t('harus berupa angka positif')}`)
        if (n === 0 && key !== 'bunga' && key !== 'pajak') return setErr(`${t(label)} ${t('harus lebih dari 0')}`)
      }
    }
    if (k === 'deposito' && (Number(v.pajak) > 100 || !Number.isInteger(Number(v.tenor)))) return setErr(t('Pajak maksimal 100% dan tenor harus bilangan bulat'))
    const o: any = { id: awal?.id || Math.random().toString(36).slice(2) + Date.now().toString(36) }
    F[k].forEach(([key, , t]) => { o[key] = t === 'number' ? Number(v[key]) : v[key].trim() })
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
          {F[k].map(([key, label, t, opts]) => (
            <label key={key} className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t(label)}</span>
              {t === 'select' ? <select value={v[key]} onChange={e => ubah(key, e.target.value)}>{opts!.map(o => <option key={o} value={o}>{t(o)}</option>)}</select>
                : <input type={t === 'number' ? 'number' : t} step="any" inputMode={t === 'number' ? 'decimal' : undefined} list={key === 'coinId' ? 'coins' : undefined} value={v[key]} onChange={e => ubah(key, e.target.value)} />}
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

function Daftar({ rows, M, t, onEdit, onDel }: { t: (s: string) => string; rows: Baris[]; M: (n: number) => string; onEdit: (id: string) => void; onDel: (id: string) => void }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-slate-500">{t('Belum ada aset di sini. Tekan Tambah untuk memasukkan yang pertama.')}</p>
  const pl = (r: Baris) => r.nilai - r.modal
  const pp = (r: Baris) => (r.modal ? (pl(r) / r.modal) * 100 : 0)
  const Aksi = ({ id }: { id: string }) => (
    <span className="space-x-3 text-sm"><button className="text-blue-600" onClick={() => onEdit(id)}>{t('Ubah')}</button><button className="text-red-600" onClick={() => confirm(t('Hapus aset ini?')) && onDel(id)}>{t('Hapus')}</button></span>
  )
  const Info = ({ r }: { r: Baris }) => <p className={`text-xs ${r.warn ? 'text-amber-600' : 'text-slate-500'}`}>{r.info}{r.est != null && ` · ${t('Estimasi saat jatuh tempo')} ${M(r.est)}`}</p>
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map(r => (
          <div key={r.id} className={card}>
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
            <tr key={r.id} className="border-t border-slate-200 align-top dark:border-slate-800">
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
  const [email, setEmail] = useState(''), [pw, setPw] = useState('')
  const [err, setErr] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false)
  const kirim = async () => {
    setErr(''); setInfo('')
    if (pw.length < 6) return setErr(t('Kata sandi minimal 6 karakter'))
    setBusy(true)
    const r = daftar ? await sb!.auth.signUp({ email, password: pw }) : await sb!.auth.signInWithPassword({ email, password: pw })
    if (r.error) setErr(r.error.message)
    else if (daftar && !r.data.session) setInfo(t('Cek email kamu untuk konfirmasi, lalu masuk.'))
    setBusy(false)
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Portfolio Tracker</h1>
        <select className="!w-auto" value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language"><option value="id">Indonesia</option><option value="en">English</option></select></div>
      <p className="text-sm text-slate-500">{t('Data portofolio tersimpan di akunmu dan sinkron di semua perangkat.')}</p>
      <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" autoComplete={daftar ? 'new-password' : 'current-password'} placeholder={t('Kata sandi')} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && kirim()} />
      {err && <p className="text-sm text-red-600">{err}</p>}{info && <p className="text-sm text-emerald-700">{info}</p>}
      <button className="btn-p" disabled={busy} onClick={kirim}>{daftar ? t('Daftar') : t('Masuk')}</button>
      <button className="text-sm text-blue-600" onClick={() => { setDaftar(!daftar); setErr(''); setInfo('') }}>{daftar ? t('Sudah punya akun? Masuk') : t('Belum punya akun? Daftar')}</button>
    </div>
  )
}

export default function Home() {
  const [d, setD] = useState<Data>(kosong())
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<'ringkasan' | Kelas>('ringkasan')
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
    if (uid) muatCloud().then(c => { setD(c || kosong()); setOk(true) }).catch(() => setMsg(t('Gagal membaca file')))
  }, [uid])
  useEffect(() => {
    if (!ok) return
    if (!sb) { simpan(d); return }
    const h = setTimeout(() => { if (uid) simpanCloud(uid, d).catch(() => setMsg(t('Gagal menyimpan ke akun. Periksa koneksi.'))) }, 800)
    return () => clearTimeout(h)
  }, [d, ok])

  const refresh = useCallback(async () => {
    setLoad(true)
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
  const sum = (k: Kelas, f: 'modal' | 'nilai') => rows[k].reduce((a, r) => a + r[f], 0)
  const total = KELAS.reduce((a, k) => a + sum(k, 'nilai'), 0), modal = KELAS.reduce((a, k) => a + sum(k, 'modal'), 0)
  const pl = total - modal

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

  if (sb && cek) return null
  if (sb && !user) return <Masuk t={t} lang={lang} setLang={pilihBahasa} />
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <header className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-stone-50/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{t('Portfolio Tracker')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <select className="!w-auto" value={lang} onChange={e => pilihBahasa(e.target.value as Lang)} aria-label="Language"><option value="id">{t('Indonesia')}</option><option value="en">{t('English')}</option></select>
            <button className="btn" onClick={() => { setHide(!hide); localStorage.setItem('pt-hide', hide ? '0' : '1') }}>{hide ? t('Tampilkan nominal') : t('Sembunyikan nominal')}</button>
            <select className="!w-auto" value={every} onChange={e => setEvery(Number(e.target.value))} aria-label="Auto-refresh"><option value={0}>{t('Auto-refresh mati')}</option><option value={1}>{t('Tiap 1 menit')}</option><option value={5}>{t('Tiap 5 menit')}</option><option value={15}>{t('Tiap 15 menit')}</option></select>
            <button className="btn-p" onClick={refresh} disabled={load}>{load ? t('Memuat…') : t('Refresh sekarang')}</button>
            {sb && <button className="btn" onClick={() => sb.auth.signOut()}>{t('Keluar')}</button>}
          </div>
        </div>
        <nav className="-mb-1 mt-3 flex gap-1 overflow-x-auto">{tabs.map(([k, n]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}>{t(n)}</button>)}</nav>
      </header>
      {msg && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">{msg}</p>}

      {tab === 'ringkasan' ? (
        <main className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={card}><p className="text-sm text-slate-500">{t('Total nilai')}</p><p className="text-2xl font-semibold">{M(total)}</p></div>
            <div className={card}><p className="text-sm text-slate-500">{t('Total modal')}</p><p className="text-2xl font-semibold">{M(modal)}</p></div>
            <div className={card}><p className="text-sm text-slate-500">{t('Untung/rugi')}</p><p className={`text-2xl font-semibold ${warna(pl)}`}>{M(pl)}</p><p className={`text-sm ${warna(pl)}`}>{pct(modal ? (pl / modal) * 100 : 0)}</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={card}><h2 className="mb-2 font-medium">{t('Alokasi aset')}</h2>
              {donut.length ? <><div className="h-52"><ResponsiveContainer><PieChart><Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{donut.map(x => <Cell key={x.k} fill={WARNA[x.k]} />)}</Pie><Tooltip formatter={(v: number) => M(v)} /></PieChart></ResponsiveContainer></div>
                <ul className="mt-2 space-y-1 text-sm">{donut.map(x => <li key={x.k} className="flex justify-between"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: WARNA[x.k] }} />{x.name}</span><span>{((x.value / total) * 100).toFixed(1)}%</span></li>)}</ul></>
                : <p className="py-10 text-center text-sm text-slate-500">{t('Belum ada data. Tambahkan aset atau muat data contoh di bawah.')}</p>}
            </div>
            <div className={card}><h2 className="mb-2 font-medium">{t('Riwayat nilai total')}</h2>
              {d.riwayat.length > 1 ? <div className="h-60"><ResponsiveContainer><AreaChart data={d.riwayat}><XAxis dataKey="t" tick={{ fontSize: 11 }} /><YAxis hide domain={['auto', 'auto']} /><Tooltip formatter={(v: number) => M(v)} /><Area dataKey="v" stroke="#059669" fill="#05966933" /></AreaChart></ResponsiveContainer></div>
                : <p className="py-10 text-center text-sm text-slate-500">{t('Grafik muncul setelah aplikasi dibuka di lebih dari satu hari.')}</p>}
            </div>
          </div>
          <div className={card}><h2 className="mb-2 font-medium">{t('Per kelas aset')}</h2>
            <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">{KELAS.map(k => <li key={k} className="flex justify-between py-2"><span>{t(NAMA[k])} <span className="text-xs text-slate-500">({ket[k]})</span></span><span>{M(sum(k, 'nilai'))}</span></li>)}</ul>
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
        <main className="mt-4 space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{t(NAMA[tab])}</h2><p className="text-sm text-slate-500">{t('Nilai')} {M(sum(tab, 'nilai'))} · {t('Modal')} {M(sum(tab, 'modal'))}</p></div><button className="btn-p" onClick={() => setForm({ k: tab })}>{t('Tambah')}</button></div>
          <Daftar t={t} rows={rows[tab]} M={M} onEdit={id => setForm({ k: tab, id })} onDel={hapus(tab)} />
        </main>
      )}
      {form && <Form t={t} k={form.k} awal={form.id ? d[form.k].find(a => a.id === form.id) : undefined} onSave={simpanAset} onClose={() => setForm(null)} />}
      <footer className="mt-10 text-center text-xs text-slate-500">{t('Harga bukan saran investasi dan bisa tertunda. Saham ±10-15 menit, NAV reksadana hanya diperbarui harian.')}</footer>
    </div>
  )
}
