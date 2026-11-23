'use client'
import { Lang } from '@/lib/i18n'

// Palet halaman awal: hijau hutan gelap + emas (nyambung dengan rupiah dan emas), tetap sama di mode terang/gelap.
export const T = { bg: '#0C2623', panel: '#12352F', garis: '#24514A', teks: '#EEF3EE', redup: '#9DB8B0', emas: '#E6B94A', untung: '#6FD8A6' }
const ALOK: [string, number, string][] = [['Saham', 38, '#4C8DF6'], ['Crypto', 18, '#F0A53A'], ['Emas', 14, '#E6C34A'], ['Reksadana', 12, '#3DBE8B'], ['Deposito', 10, '#9B7BEA'], ['Properti', 8, '#E5677D']]
const KELAS: [string, string][] = [['Saham', '#2563eb'], ['Saham AS & ETF', '#4f46e5'], ['Reksadana', '#059669'], ['Crypto', '#d97706'], ['Forex', '#0891b2'], ['Emas', '#ca8a04'], ['Properti', '#be123c'], ['Deposito', '#7c3aed']]
const FITUR: [string, string][] = [
  ['Ringkasan tiap aset', 'Lihat harga beli, harga hari ini, untung rugi, dan grafik pergerakannya sejak hari pertama kamu membeli.'],
  ['Berita hari ini di sebelahnya', 'Setiap kelas aset punya panel berita terbaru. Buka satu aset, beritanya ikut menyesuaikan.'],
  ['Harga diperbarui otomatis', 'Saham IDX dan AS, ETF, crypto, kurs, dan emas dunia dalam rupiah. Harga saham tertunda sekitar 10-15 menit.'],
  ['Dividen, kupon, dan sewa ikut dihitung', 'Catat penerimaan dari tiap aset. Hasil investasimu tidak hanya selisih harga, tapi juga uang yang benar-benar masuk.'],
  ['Riwayat total nilai', 'Grafik total portofolio dihitung dari tanggal beli tiap aset, jadi langsung terisi sejak hari pertama.'],
  ['Privat dan sinkron', 'Masuk dengan username, tanpa email. Data tersimpan di akunmu dan bisa dibuka dari HP maupun laptop. Nominal bisa disembunyikan dengan satu tombol.'],
]
const fokus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6B94A]'

export function Logo({ besar }: { besar?: boolean }) {
  const u = besar ? 34 : 28
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={u} height={u} viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="8" fill={T.emas} /><rect x="6" y="15" width="4" height="7" rx="1.2" fill={T.bg} /><rect x="12" y="10.5" width="4" height="11.5" rx="1.2" fill={T.bg} /><rect x="18" y="6" width="4" height="16" rx="1.2" fill={T.bg} /></svg>
      <span className={`font-bold tracking-tight ${besar ? 'text-xl' : 'text-lg'}`}>Portfolio Tracker<sup className="text-[10px] font-medium">™</sup></span>
    </span>
  )
}

export function Awal({ t, lang, setLang, onMasuk, onDaftar, lokal }: { t: (s: string) => string; lang: Lang; setLang: (l: Lang) => void; onMasuk: () => void; onDaftar: () => void; lokal?: boolean }) {
  const btn = `rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${fokus}`
  const cta = (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={lokal ? onMasuk : onDaftar} className={btn} style={{ background: T.emas, color: '#2A2000' }}>{lokal ? t('Buka aplikasi') : t('Daftar gratis')}</button>
      {!lokal && <button onClick={onMasuk} className={`${btn} border`} style={{ borderColor: T.garis }}>{t('Sudah punya akun? Masuk')}</button>}
    </div>
  )
  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.teks }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <select aria-label="Language" value={lang} onChange={e => setLang(e.target.value as Lang)} className="!w-auto !rounded-lg !border-[#24514A] !bg-transparent !py-1.5 !text-[#9DB8B0]">
            <option className="text-slate-900" value="id">Indonesia</option><option className="text-slate-900" value="en">English</option>
          </select>
          {!lokal && <button onClick={onMasuk} className={`hidden rounded-lg px-3 py-1.5 text-sm font-medium sm:block ${fokus}`} style={{ color: T.teks }}>{t('Masuk')}</button>}
          <button onClick={lokal ? onMasuk : onDaftar} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${fokus}`} style={{ background: T.emas, color: '#2A2000' }}>{lokal ? t('Buka aplikasi') : t('Daftar gratis')}</button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{t('Semua investasimu, satu layar.')}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: T.redup }}>{t('Pantau saham Indonesia dan Amerika, ETF, reksadana, crypto, forex, emas, properti, dan deposito. Harga terbarunya dalam rupiah, untung rugi dan dividen dihitung otomatis.')}</p>
          <div className="mt-8">{cta}</div>
          <p className="mt-4 text-sm" style={{ color: T.redup }}>{lokal ? t('Data tersimpan di browser ini.') : t('Tanpa email. Cukup username dan kata sandi.')}</p>
        </div>

        <div aria-hidden="true" className="rounded-3xl border p-5 shadow-2xl sm:p-6" style={{ background: T.panel, borderColor: T.garis }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs" style={{ color: T.redup }}>{t('Total nilai')}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">Rp 248.600.000</p>
              <p className="mt-1 text-sm font-medium tabular-nums" style={{ color: T.untung }}>+Rp 27.450.000 (+12,41%)</p>
            </div>
            <span className="shrink-0 rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: T.garis, color: T.redup }}>{t('Contoh tampilan')}</span>
          </div>
          <svg viewBox="0 0 320 110" preserveAspectRatio="none" className="mt-5 h-32 w-full">
            <defs><linearGradient id="isi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={T.untung} stopOpacity=".28" /><stop offset="1" stopColor={T.untung} stopOpacity="0" /></linearGradient></defs>
            <path d="M0 84 C20 80 30 88 52 76 S86 66 108 70 S140 50 164 54 S198 58 220 40 S262 36 284 26 S306 20 320 14 L320 110 L0 110 Z" fill="url(#isi)" />
            <path className="garis-gambar" pathLength={1} d="M0 84 C20 80 30 88 52 76 S86 66 108 70 S140 50 164 54 S198 58 220 40 S262 36 284 26 S306 20 320 14" fill="none" stroke={T.untung} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between text-[11px]" style={{ color: T.redup }}><span>{t('Tanggal beli')}</span><span>{t('Hari ini')}</span></div>
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full">{ALOK.map(([n, p, c]) => <i key={n} style={{ width: `${p}%`, background: c }} />)}</div>
          <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">{ALOK.map(([n, p, c]) => <li key={n} className="flex items-center gap-1.5" style={{ color: T.redup }}><i className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />{t(n)} <span className="ml-auto tabular-nums" style={{ color: T.teks }}>{p}%</span></li>)}</ul>
          <ul className="mt-5 divide-y text-sm" style={{ borderColor: T.garis }}>
            {[['BBCA', '10 lot', '+13,9%'], ['Bitcoin', '0,25 BTC', '+8,2%'], [t('Emas batangan'), '10 gram', '+6,1%']].map(([n, s, g]) => (
              <li key={n} className="flex items-center justify-between py-2.5" style={{ borderColor: T.garis }}><span className="font-medium">{n} <span className="text-xs font-normal" style={{ color: T.redup }}>{s}</span></span><span className="tabular-nums" style={{ color: T.untung }}>{g}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y" style={{ borderColor: T.garis }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-6">
          <p className="text-sm font-medium" style={{ color: T.redup }}>{t('Satu total dari delapan jenis aset')}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">{KELAS.map(([n, c]) => <li key={n} className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{t(n)}</li>)}</ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:sticky lg:top-10 lg:self-start">{t('Dari tanggal beli sampai harga hari ini')}</h2>
        <ul className="divide-y" style={{ borderColor: T.garis }}>
          {FITUR.map(([j, i]) => (
            <li key={j} className="py-6 first:pt-0" style={{ borderColor: T.garis }}>
              <h3 className="text-lg font-bold">{t(j)}</h3>
              <p className="mt-1.5 max-w-xl leading-relaxed" style={{ color: T.redup }}>{t(i)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl border p-8 sm:p-12" style={{ background: T.panel, borderColor: T.garis }}>
          <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{t('Mulai catat investasi pertamamu hari ini.')}</h2>
          <div className="mt-7">{cta}</div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl space-y-1 px-5 pb-10 text-center text-xs" style={{ color: T.redup }}>
        <p>{t('Harga bukan saran investasi dan bisa tertunda.')}</p>
        <p className="font-medium">Portfolio Tracker™ · Created by Dani · © {new Date().getFullYear()} Dani</p>
      </footer>
    </div>
  )
}
