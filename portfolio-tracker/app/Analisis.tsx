'use client'
import { useState } from 'react'
import { Kelas } from '@/lib/types'
import { PROFIL_TARGET, Profil, alokasiDana, catatanPorto } from '@/lib/analisis'
import { bacaAngka } from '@/lib/uang'

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const CEPAT = [1, 5, 10, 50, 100] // juta rupiah
const PROFIL: { id: Profil; nama: string; ket: string }[] = [
  { id: 'konservatif', nama: 'Konservatif', ket: 'Mengutamakan keamanan nilai: deposito, reksadana, dan emas.' },
  { id: 'moderat', nama: 'Moderat', ket: 'Seimbang antara pertumbuhan dan kestabilan.' },
  { id: 'agresif', nama: 'Agresif', ket: 'Mengejar pertumbuhan dan siap menerima naik turun yang besar.' },
  { id: 'saya', nama: 'Target saya', ket: 'Memakai target yang Anda isi di menu Rebalancing.' },
]

export function Analisis({ t, M, nilai, aset, target, nama, warna, onKeRebalancing }: {
  t: (s: string) => string; M: (n: number) => string
  nilai: Record<Kelas, number>; aset: { nama: string; k: Kelas; nilai: number }[]
  target: Partial<Record<Kelas, number>>; nama: Record<Kelas, string>; warna: Record<Kelas, string>
  onKeRebalancing: () => void
}) {
  const [teks, setTeks] = useState('10jt')
  const [profil, setProfil] = useState<Profil>('moderat')
  const loc = t('id-ID'), lokal = loc.startsWith('id') ? 'id' : 'en'
  const pct = (n: number) => `${n.toLocaleString(loc, { maximumFractionDigits: 1 })}%`

  const dana = bacaAngka(teks, lokal, true)
  const danaOk = isFinite(dana) && dana > 0 && dana < 1e15
  const targetAktif = profil === 'saya' ? target : PROFIL_TARGET[profil]
  const adaTarget = Object.values(targetAktif).some(v => (v || 0) > 0)
  const r = alokasiDana(nilai, targetAktif, danaOk ? dana : 0)
  const bagian = r.baris.filter(x => x.bagian > 0).sort((a, b) => b.bagian - a.bagian)
  const tampil = r.baris.filter(x => x.target > 0 || x.nilai > 0)
  const catatan = catatanPorto(nilai, aset)
  const seg = (aktif: boolean) => `rounded-lg px-3 py-1.5 text-sm ${aktif ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`
  const th = 'px-2 py-2 font-medium', td = 'px-2 py-2.5 align-middle'

  const judul = (c: ReturnType<typeof catatanPorto>[number]): [string, string] => {
    const n = c.k ? t(nama[c.k]) : c.nama || ''
    switch (c.id) {
      case 'kelas': return [`${t('Porsi terbesar')}: ${n} ${pct(c.angka || 0)}`, t('Satu kelas aset di atas 50% membuat hasil portofolio sangat bergantung pada satu jenis risiko.')]
      case 'aset': return [`${t('Aset terbesar')}: ${n} ${pct(c.angka || 0)}`, t('Satu aset di atas 30% berarti kerugian di aset itu akan terasa besar bagi seluruh portofolio.')]
      case 'beragam': return [`${t('Jumlah kelas aset')}: ${c.angka}`, t('Dengan sedikit kelas aset, portofolio mudah turun bersamaan. Kelas yang berbeda tidak selalu naik dan turun bersamaan.')]
      case 'valas': return [`${t('Eksposur dolar & valas')}: ${pct(c.angka || 0)}`, t('Nilai portofolio ikut naik turun mengikuti kurs rupiah terhadap mata uang asing.')]
      case 'crypto': return [`${n}: ${pct(c.angka || 0)}`, t('Crypto sangat fluktuatif; porsi di atas 15% membuat nilai portofolio mudah berayun.')]
      default: return [t('Tidak ada konsentrasi berlebih yang terdeteksi dengan aturan sederhana ini.'), '']
    }
  }

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold">{t('Analisis & alokasi dana')}</h2>
          <p className="text-sm text-slate-500">{t('Masukkan dana yang ingin diinvestasikan. Aplikasi membandingkan portofolio Anda dengan target porsi, lalu membagi dana ke kelas aset yang porsinya paling kurang.')}</p>
        </div>

        <div>
          <label htmlFor="dana-alokasi" className="mb-1 block text-sm font-medium">{t('Dana yang akan dialokasikan')}</label>
          <input id="dana-alokasi" inputMode="decimal" autoComplete="off" value={teks} onChange={e => setTeks(e.target.value)} placeholder={t('mis. 10jt atau 10.000.000')} aria-invalid={!danaOk && teks.trim() !== ''} className="sm:max-w-xs" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CEPAT.map(j => <button key={j} type="button" className="btn" onClick={() => setTeks(`${j}jt`)}>{j} {t('jt')}</button>)}
          </div>
          {!danaOk && <p className="mt-2 text-sm text-red-600">{t('Masukkan jumlah dana yang valid, mis. 10jt atau 10.000.000')}</p>}
          {danaOk && <p className="mt-2 text-sm text-slate-500">{M(dana)}</p>}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">{t('Profil risiko')}</p>
          <div className="flex flex-wrap gap-2">
            {PROFIL.map(p => <button key={p.id} type="button" aria-pressed={profil === p.id} className={seg(profil === p.id)} onClick={() => setProfil(p.id)}>{t(p.nama)}</button>)}
          </div>
          <p className="mt-2 text-sm text-slate-500">{t(PROFIL.find(p => p.id === profil)!.ket)}{profil !== 'saya' && ` ${t('Target ini hanya contoh umum untuk tiap profil. Sesuaikan dengan tujuan, jangka waktu, dan toleransi risiko Anda.')}`}</p>
          {profil === 'saya' && !adaTarget && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
              {t('Anda belum mengisi target porsi.')}
              <button type="button" className="font-medium underline" onClick={onKeRebalancing}>{t('Atur target di Rebalancing')}</button>
            </p>
          )}
        </div>
      </div>

      {danaOk && adaTarget && (
        <div className={card}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">{t('Usulan pembagian dana')}</h3>
            <p className="text-sm text-slate-500">{t('Total dibagi')}: {M(bagian.reduce((s, x) => s + x.bagian, 0))}</p>
          </div>
          {bagian.length ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {bagian.map(x => (
                <li key={x.k} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: warna[x.k] }} />{t(nama[x.k])}</span>
                    <span className="text-right font-semibold">{M(x.bagian)} <span className="text-xs font-normal text-slate-500">({pct((x.bagian / r.dana) * 100)} {t('dari dana')})</span></span>
                  </div>
                  <p className="mt-0.5 pl-[18px] text-xs text-slate-500">{t('Sekarang')} {pct(x.pct)}, {t('setelah')} {pct(x.setelah)}, {t('target')} {pct(x.target)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="py-4 text-center text-sm text-slate-500">{t('Tidak ada kelas aset yang perlu ditambah berdasarkan target ini.')}</p>}
          {r.tidakIkut.includes('properti') && <p className="mt-2 text-xs text-slate-500">{t('Properti belum mencapai target, tetapi tidak ikut dibagi karena biasanya dibeli utuh, bukan dicicil dari dana kecil.')}</p>}
        </div>
      )}

      {adaTarget && (
        <div className={card}>
          <h3 className="mb-2 font-medium">{t('Perbandingan porsi')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800"><th className={th}>{t('Kelas aset')}</th><th className={`${th} text-right`}>{t('Sekarang')}</th><th className={`${th} text-right`}>{t('Target')}</th><th className={`${th} text-right`}>{t('Setelah')}</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {tampil.map(x => (
                  <tr key={x.k}>
                    <td className={td}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: warna[x.k] }} />{t(nama[x.k])}</td>
                    <td className={`${td} text-right tabular-nums`}>{pct(x.pct)}</td>
                    <td className={`${td} text-right tabular-nums`}>{pct(x.target)}</td>
                    <td className={`${td} text-right tabular-nums`}>{pct(x.setelah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={card}>
        <h3 className="mb-2 font-medium">{t('Catatan portofolio')}</h3>
        {catatan.length ? (
          <ul className="space-y-2">
            {catatan.map((c, i) => {
              const [j, p] = judul(c), aman = c.id === 'aman'
              return (
                <li key={i} className={`rounded-lg border-l-4 py-2 pl-3 pr-2 text-sm ${aman ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'}`}>
                  <p className="font-medium">{j}</p>
                  {p && <p className="mt-0.5 text-slate-600 dark:text-slate-400">{p}</p>}
                </li>
              )
            })}
          </ul>
        ) : <p className="py-4 text-center text-sm text-slate-500">{t('Belum ada aset. Pembagian dana di atas mengikuti target porsi dari awal.')}</p>}
      </div>

      <p className="text-xs text-slate-500">{t('Alat hitung berbasis aturan sederhana, bukan saran investasi. Pertimbangkan tujuan, jangka waktu, dan toleransi risiko Anda, dan pertimbangkan berkonsultasi dengan perencana keuangan berlisensi.')}</p>
    </div>
  )
}
