'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts'
import { Kelas } from '@/lib/types'
import { bacaAngka } from '@/lib/uang'
import { TUJUAN, TINGKAT, ASUMSI, Tujuan, Sikap, KelasRencana, rencana, bulanMencapai } from '@/lib/rencana'

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const IKON: Record<Tujuan, string> = { pendidikan: '🎓', pensiun: '🌴', rumah: '🏠', darurat: '🛟', liburan: '✈️', lain: '⭐' }
const SIKAP: { id: Sikap; nama: string }[] = [{ id: 'hati', nama: 'Lebih hati-hati' }, { id: 'sesuai', nama: 'Sesuai tujuan' }, { id: 'berani', nama: 'Lebih berani' }]
const SKENARIO = [
  { id: 'hati' as const, nama: 'Hati-hati', warna: '#d97706' },
  { id: 'dasar' as const, nama: 'Dasar', warna: '#059669' },
  { id: 'optimis' as const, nama: 'Optimistis', warna: '#2563eb' },
]
const URUT: KelasRencana[] = ['deposito', 'reksa', 'emas', 'saham', 'ussaham', 'crypto']

export function Perencanaan({ t, M, faktor = 1, kode = 'IDR', totalPorto, nama, warna }: {
  t: (s: string) => string; M: (n: number) => string
  faktor?: number; kode?: string // faktor: nilai rupiah x faktor = nilai dalam mata uang tampilan
  totalPorto: number // total nilai portofolio (rupiah), untuk mengisi dana awal
  nama: Record<Kelas, string>; warna: Record<Kelas, string>
}) {
  const loc = t('id-ID'), lokal = loc.startsWith('id') ? 'id' : 'en'
  const pct = (n: number) => `${n.toLocaleString(loc, { maximumFractionDigits: 1 })}%`
  const compact = (v: number) => new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  const teksDari = (idr: number) => String(Number((idr * faktor).toPrecision(2))) // nilai awal yang rapi dalam mata uang tampilan

  const [tujuan, setTujuan] = useState<Tujuan>('pendidikan')
  const [teksTarget, setTeksTarget] = useState(() => teksDari(TUJUAN.pendidikan.target))
  const [teksTahun, setTeksTahun] = useState(String(TUJUAN.pendidikan.tahun))
  const [teksAwal, setTeksAwal] = useState('')
  const [teksSetoran, setTeksSetoran] = useState('')
  const [sikap, setSikap] = useState<Sikap>('sesuai')
  const [inflasiOn, setInflasiOn] = useState(false)
  const [teksInflasi, setTeksInflasi] = useState(String(TUJUAN.pendidikan.inflasi))

  const pilihTujuan = (tj: Tujuan) => {
    setTujuan(tj); setTeksTarget(teksDari(TUJUAN[tj].target)); setTeksTahun(String(TUJUAN[tj].tahun)); setTeksInflasi(String(TUJUAN[tj].inflasi))
  }

  // Bila mata uang tampilan diganti, isian uang ikut dikonversi supaya nilainya tetap setara.
  const sebelum = useRef(faktor)
  useEffect(() => {
    const lama = sebelum.current
    if (lama !== faktor) {
      const konv = (s: string) => { const v = bacaAngka(s, lokal, true); return s.trim() && isFinite(v) ? String(Number(((v / lama) * faktor).toPrecision(3))) : s }
      setTeksTarget(konv); setTeksAwal(konv); setTeksSetoran(konv)
    }
  }, [kode]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { sebelum.current = faktor })

  const kosong = (s: string) => s.trim() === ''
  const nTarget = bacaAngka(teksTarget, lokal, true) / faktor
  const nTahun = Number(teksTahun.trim().replace(',', '.'))
  const nAwal = kosong(teksAwal) ? 0 : bacaAngka(teksAwal, lokal, true) / faktor
  const nSetoran = kosong(teksSetoran) ? 0 : bacaAngka(teksSetoran, lokal, true) / faktor
  const nInfl = Number(teksInflasi.trim().replace(',', '.'))
  const errTarget = !(isFinite(nTarget) && nTarget > 0 && nTarget < 1e15)
  const errTahun = !(isFinite(nTahun) && nTahun >= 0.5 && nTahun <= 60)
  const errAwal = !isFinite(nAwal) || nAwal < 0 || nAwal >= 1e15
  const errSetoran = !isFinite(nSetoran) || nSetoran < 0 || nSetoran >= 1e15
  const errInfl = inflasiOn && !(isFinite(nInfl) && nInfl >= 0 && nInfl <= 50)
  const valid = !errTarget && !errTahun && !errAwal && !errSetoran && !errInfl

  const h = useMemo(
    () => (valid ? rencana({ tujuan, target: nTarget, tahun: nTahun, awal: nAwal, setoran: nSetoran, sikap, inflasiOn, inflasi: isFinite(nInfl) ? nInfl : 0 }) : null),
    [valid, tujuan, nTarget, nTahun, nAwal, nSetoran, sikap, inflasiOn, nInfl],
  )

  const sat = (n: number, k: 'tahun' | 'bulan') => `${n} ${lokal === 'en' && n === 1 ? (k === 'tahun' ? 'year' : 'month') : t(k)}`
  const lama = (b: number | null) => {
    if (b === null) return t('lebih dari 100 tahun')
    if (b === 0) return t('sudah tercapai')
    return [Math.floor(b / 12) ? sat(Math.floor(b / 12), 'tahun') : '', b % 12 ? sat(b % 12, 'bulan') : ''].filter(Boolean).join(' ')
  }
  const petunjuk = (k: KelasRencana, tk: number) => {
    if (k === 'deposito') return t('Deposito atau tabungan berjangka')
    if (k === 'emas') return t('Emas, sebagai lindung nilai inflasi')
    if (k === 'saham') return t('Saham atau ETF Indonesia (mis. berbasis indeks)')
    if (k === 'ussaham') return t('Saham atau ETF AS (mis. berbasis indeks)')
    if (k === 'crypto') return t('Crypto, risikonya sangat tinggi, porsi kecil')
    return t(tk <= 1 ? 'Reksadana pasar uang' : tk <= 3 ? 'Reksadana pasar uang atau pendapatan tetap' : tk === 4 ? 'Reksadana pendapatan tetap atau campuran' : 'Reksadana campuran atau saham')
  }

  const seg = (aktif: boolean) => `rounded-lg px-3 py-1.5 text-sm ${aktif ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`
  const lbl = 'mb-1 block text-sm font-medium'
  const th = 'px-2 py-2 font-medium', td = 'px-2 py-2.5 align-middle'
  const salahTeks = 'mt-1 text-xs text-red-600'

  const capaiDasar = h?.capai?.dasar
  const status: 'cukup' | 'kurang' | null = h && h.capai ? (capaiDasar != null && capaiDasar <= h.bulan ? 'cukup' : 'kurang') : null
  const tanpaInvestasi = h ? bulanMencapai(nAwal, nSetoran, 0, h.targetAkhir) : null
  const adaCapai = !!h?.capai
  const jalurBeda = !!h && new Set(h.jalur.map(j => j.tk)).size > 1
  const kolomAlokasi = h ? URUT.filter(k => h.alokasi[k] > 0 || h.jalur.some(j => j.alokasi[k] > 0)) : []

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold">{t('Perencanaan tujuan')}</h2>
          <p className="text-sm text-slate-500">{t('Pilih tujuan dan isi targetnya. Aplikasi mengusulkan penempatan dana yang sesuai dengan risiko tujuan itu, dan menghitung berapa lama target tercapai serta setoran bulanan yang dibutuhkan.')}</p>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">{t('Tujuan')}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TUJUAN) as Tujuan[]).map(k => <button key={k} type="button" aria-pressed={tujuan === k} className={seg(tujuan === k)} onClick={() => pilihTujuan(k)}><span aria-hidden="true">{IKON[k]}</span> {t(TUJUAN[k].nama)}</button>)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rc-target" className={lbl}>{t('Target dana')} ({kode})</label>
            <input id="rc-target" inputMode="decimal" autoComplete="off" value={teksTarget} onChange={e => setTeksTarget(e.target.value)} placeholder={t('mis. 5 miliar atau 500jt')} aria-invalid={errTarget} />
            {errTarget && <p className={salahTeks}>{t('Masukkan target dana yang valid, mis. 5 miliar atau 500jt')}</p>}
          </div>
          <div>
            <label htmlFor="rc-tahun" className={lbl}>{t('Dana dibutuhkan dalam (tahun)')}</label>
            <input id="rc-tahun" inputMode="decimal" autoComplete="off" value={teksTahun} onChange={e => setTeksTahun(e.target.value)} aria-invalid={errTahun} />
            {errTahun && <p className={salahTeks}>{t('Masukkan jangka waktu antara 0,5 dan 60 tahun')}</p>}
          </div>
          <div>
            <label htmlFor="rc-awal" className={lbl}>{t('Dana awal yang sudah ada')} ({kode})</label>
            <input id="rc-awal" inputMode="decimal" autoComplete="off" value={teksAwal} onChange={e => setTeksAwal(e.target.value)} placeholder="0" aria-invalid={errAwal} />
            {errAwal && <p className={salahTeks}>{t('Jumlah tidak valid')}</p>}
            {totalPorto > 0 && <button type="button" className="mt-1 text-xs font-medium underline" onClick={() => setTeksAwal(String(kode === 'IDR' ? Math.round(totalPorto) : Math.round(totalPorto * faktor * 100) / 100))}>{t('Isi dari total portofolio saya')} ({M(totalPorto)})</button>}
          </div>
          <div>
            <label htmlFor="rc-setoran" className={lbl}>{t('Setoran per bulan')} ({kode})</label>
            <input id="rc-setoran" inputMode="decimal" autoComplete="off" value={teksSetoran} onChange={e => setTeksSetoran(e.target.value)} placeholder={t('kosongkan untuk melihat yang dibutuhkan')} aria-invalid={errSetoran} />
            {errSetoran && <p className={salahTeks}>{t('Jumlah tidak valid')}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 !w-auto" checked={inflasiOn} onChange={e => setInflasiOn(e.target.checked)} />
            <span>{t('Target ini adalah harga hari ini (naikkan sesuai kenaikan biaya per tahun)')}</span>
          </label>
          {inflasiOn && (
            <div className="mt-2 sm:max-w-xs">
              <label htmlFor="rc-infl" className={lbl}>{t('Perkiraan kenaikan biaya per tahun (%)')}</label>
              <input id="rc-infl" inputMode="decimal" autoComplete="off" value={teksInflasi} onChange={e => setTeksInflasi(e.target.value)} aria-invalid={errInfl} />
              {errInfl && <p className={salahTeks}>{t('Masukkan angka antara 0 dan 50')}</p>}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">{t('Sikap terhadap risiko')}</p>
          <div className="flex flex-wrap gap-2">
            {SIKAP.map(s => <button key={s.id} type="button" aria-pressed={sikap === s.id} className={seg(sikap === s.id)} onClick={() => setSikap(s.id)}>{t(s.nama)}</button>)}
          </div>
          {tujuan === 'darurat' && <p className="mt-2 text-xs text-slate-500">{t('Dana darurat selalu diusulkan di instrumen paling aman dan mudah dicairkan.')}</p>}
        </div>
      </div>

      {h && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={card}>
              <p className="text-xs text-slate-500">{t('Profil penempatan')}</p>
              <p className="mt-1 text-lg font-semibold">{t(TINGKAT[h.tk])}</p>
              <p className="mt-1 text-xs text-slate-500">{pct(h.r.dasar)} {t('per tahun (perkiraan)')}, {t('rentang')} {pct(h.r.hati)} - {pct(h.r.optimis)}</p>
            </div>
            <div className={card}>
              <p className="text-xs text-slate-500">{t('Dana yang dibutuhkan')}</p>
              <p className="mt-1 text-lg font-semibold">{M(h.targetAkhir)}</p>
              <p className="mt-1 text-xs text-slate-500">{t('dalam')} {lama(h.bulan)}{inflasiOn && ` · ${t('setara')} ${M(nTarget)} ${t('hari ini')}`}</p>
            </div>
            <div className={card}>
              <p className="text-xs text-slate-500">{t('Setoran per bulan agar tepat waktu')}</p>
              <p className="mt-1 text-lg font-semibold">{M(h.perlu.dasar)}</p>
              <p className="mt-1 text-xs text-slate-500">{t('skenario dasar')}</p>
            </div>
          </div>

          {status && (
            <div role="status" className={`rounded-xl border-l-4 p-3 text-sm ${status === 'cukup' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'}`}>
              <p className="font-medium">{status === 'cukup' ? t('Tepat waktu') : t('Belum cukup')}</p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {nSetoran > 0 ? `${t('Dengan setoran')} ${M(nSetoran)} ${t('per bulan')}` : t('Dengan dana awal saja')}
                {': '}
                {status === 'cukup'
                  ? `${t('target tercapai dalam')} ${lama(capaiDasar ?? null)} (${t('skenario dasar')}).`
                  : capaiDasar == null
                    ? `${t('target belum tercapai dalam 100 tahun')}. ${t('Naikkan setoran menjadi')} ${M(h.perlu.dasar)} ${t('per bulan atau perpanjang jangka waktu.')}`
                    : `${t('butuh')} ${lama(capaiDasar)}, ${t('melewati batas waktu')}. ${t('Naikkan setoran menjadi')} ${M(h.perlu.dasar)} ${t('per bulan atau perpanjang jangka waktu.')}`}
              </p>
            </div>
          )}

          <div className={card}>
            <h3 className="mb-2 font-medium">{t('Berapa lama target tercapai')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                  <th className={th}>{t('Skenario')}</th><th className={`${th} text-right`}>{t('Return per tahun')}</th><th className={`${th} text-right`}>{t('Setoran/bulan agar tepat waktu')}</th>{adaCapai && <th className={`${th} text-right`}>{t('Lama dengan dana Anda')}</th>}
                </tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {SKENARIO.map(s => (
                    <tr key={s.id}>
                      <td className={td}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.warna }} />{t(s.nama)}</td>
                      <td className={`${td} text-right tabular-nums`}>{pct(h.r[s.id])}</td>
                      <td className={`${td} text-right tabular-nums`}>{M(h.perlu[s.id])}</td>
                      {adaCapai && <td className={`${td} text-right`}>{lama(h.capai![s.id])}</td>}
                    </tr>
                  ))}
                  <tr className="text-slate-500">
                    <td className={td}>{t('Tanpa investasi (0%)')}</td>
                    <td className={`${td} text-right tabular-nums`}>{pct(0)}</td>
                    <td className={`${td} text-right tabular-nums`}>{M(h.perlu.tanpa)}</td>
                    {adaCapai && <td className={`${td} text-right`}>{lama(tanpaInvestasi)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t('Skenario hati-hati dan optimistis memakai batas bawah dan atas dari perkiraan return. Hasil sebenarnya bisa di luar rentang itu.')}</p>
          </div>

          <div className={card}>
            <h3 className="mb-1 font-medium">{t('Proyeksi pertumbuhan dana')}</h3>
            <p className="mb-2 text-xs text-slate-500">{t('Dengan setoran')} {M(h.setoranPakai)} {t('per bulan')}{nSetoran > 0 ? '' : ` (${t('yang dibutuhkan, skenario dasar')})`}</p>
            <div className="h-72"><ResponsiveContainer><LineChart data={h.grafik}>
              <XAxis type="number" dataKey="tahun" domain={[0, 'dataMax']} allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis orientation="right" width={56} tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(v: number) => compact(v * faktor)} />
              <Tooltip formatter={(v: number, n: string) => [M(v), n]} labelFormatter={(x: number) => `${t('Tahun ke')} ${x}`} />
              <Legend verticalAlign="top" height={28} iconType="plainline" />
              <ReferenceLine y={h.targetAkhir} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine x={nTahun} stroke="#94a3b8" strokeDasharray="4 4" />
              {SKENARIO.map(s => <Line key={s.id} name={t(s.nama)} dataKey={s.id} type="monotone" stroke={s.warna} strokeWidth={s.id === 'dasar' ? 3 : 1.75} dot={false} />)}
            </LineChart></ResponsiveContainer></div>
            <p className="mt-2 text-xs text-slate-500">{t('Garis putus-putus: target dana dan batas waktu. Garis yang sudah melewati target sebelum batas waktu berarti target tercapai lebih cepat.')}</p>
          </div>

          <div className={card}>
            <h3 className="mb-2 font-medium">{t('Usulan penempatan dana')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                  <th className={th}>{t('Kelas aset')}</th><th className={`${th} text-right`}>{t('Porsi')}</th><th className={`${th} text-right`}>{t('Dana awal')}</th><th className={`${th} text-right`}>{t('Setoran/bulan')}</th><th className={th}>{t('Instrumen')}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {URUT.filter(k => h.alokasi[k] > 0).map(k => (
                    <tr key={k}>
                      <td className={td}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: warna[k as Kelas] }} />{t(nama[k as Kelas])}</td>
                      <td className={`${td} text-right tabular-nums`}>{pct(h.alokasi[k])}</td>
                      <td className={`${td} text-right tabular-nums`}>{nAwal > 0 ? M((nAwal * h.alokasi[k]) / 100) : '-'}</td>
                      <td className={`${td} text-right tabular-nums`}>{h.setoranPakai > 0 ? M((h.setoranPakai * h.alokasi[k]) / 100) : '-'}</td>
                      <td className={`${td} text-slate-600 dark:text-slate-400`}>{petunjuk(k, h.tk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t('Properti dan forex tidak diusulkan: properti dibeli utuh dan forex bersifat spekulatif. Daftar ini hanya jenis instrumen, bukan rekomendasi produk atau saham tertentu.')}</p>
          </div>

          {jalurBeda && (
            <div className={card}>
              <h3 className="mb-1 font-medium">{t('Geser ke instrumen lebih aman mendekati tenggat')}</h3>
              <p className="mb-2 text-xs text-slate-500">{t('Dana yang segera dipakai sebaiknya tidak lagi bergantung pada naik turunnya pasar. Porsi berikut menyesuaikan sisa waktu.')}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                    <th className={th}>{t('Kelas aset')}</th>
                    {h.jalur.map((j, i) => <th key={i} className={`${th} text-right`}>{i === 0 ? t('Sekarang') : `${t('Sisa')} ${sat(j.sisa, 'tahun')}`}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {kolomAlokasi.map(k => (
                      <tr key={k}>
                        <td className={td}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: warna[k as Kelas] }} />{t(nama[k as Kelas])}</td>
                        {h.jalur.map((j, i) => <td key={i} className={`${td} text-right tabular-nums`}>{pct(j.alokasi[k])}</td>)}
                      </tr>
                    ))}
                    <tr className="text-slate-500"><td className={td}>{t('Profil')}</td>{h.jalur.map((j, i) => <td key={i} className={`${td} text-right`}>{t(TINGKAT[j.tk])}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <details className={card}>
            <summary className="cursor-pointer font-medium">{t('Asumsi perhitungan')}</summary>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>{t('Perkiraan return nominal per tahun (sebelum pajak dan biaya) dan rentangnya:')}</p>
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {URUT.map(k => <li key={k} className="flex justify-between border-b border-slate-200 py-1.5 dark:border-slate-800"><span>{t(nama[k as Kelas])}</span><span className="tabular-nums">{pct(ASUMSI[k].r)} (±{ASUMSI[k].band.toLocaleString(loc)})</span></li>)}
              </ul>
              <p>{t('Setoran dianggap masuk di akhir tiap bulan dan hasil investasi diputar ulang tiap bulan. Pajak, biaya transaksi, dan perubahan setoran dari waktu ke waktu tidak dihitung.')}</p>
              <p>{t('Angka return adalah asumsi umum untuk simulasi, bukan prediksi atau jaminan. Pasar bisa jauh lebih rendah atau lebih tinggi dari rentang ini.')}</p>
            </div>
          </details>
        </>
      )}

      <p className="text-xs text-slate-500">{t('Alat simulasi berbasis aturan sederhana, bukan saran investasi. Pertimbangkan kondisi keuangan, tujuan, dan toleransi risiko Anda, dan pertimbangkan berkonsultasi dengan perencana keuangan berlisensi.')}</p>
    </div>
  )
}
