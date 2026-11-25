'use client'
import { useState } from 'react'
import { Kelas } from '@/lib/types'
import { Mode, hitungRebalance, samakanDenganSekarang } from '@/lib/rebalance'

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
const ILIKUID: Kelas[] = ['properti', 'deposito']

export function Rebalancing({ t, M, nilai, target, nama, warna, onTarget, onSemua }: {
  t: (s: string) => string; M: (n: number) => string
  nilai: Record<Kelas, number>; target: Partial<Record<Kelas, number>>; nama: Record<Kelas, string>; warna: Record<Kelas, string>
  onTarget: (k: Kelas, v: number | undefined) => void; onSemua: (v: Partial<Record<Kelas, number>>) => void
}) {
  const [mode, setMode] = useState<Mode>('penuh')
  const [dana, setDana] = useState(''), [tol, setTol] = useState('5')
  const loc = t('id-ID')
  const r = hitungRebalance(nilai, target, { mode, dana: Number(dana) || 0, toleransi: Number(tol) || 0 })
  const pct = (n: number) => `${n.toLocaleString(loc, { maximumFractionDigits: 1 })}%`
  const hampir = Math.abs(r.totalTarget - 100) < 0.05
  const seg = (aktif: boolean) => `rounded-lg px-3 py-1.5 text-sm ${aktif ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`
  const th = 'px-2 py-2 font-medium', td = 'px-2 py-2.5 align-middle'
  const semua = r.baris // tampilkan semua kelas supaya target bisa diisi untuk kelas yang belum dimiliki

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-3`}>
        <div><h2 className="text-lg font-semibold">{t('Rebalancing')}</h2><p className="text-sm text-slate-500">{t('Isi target persentase tiap kelas aset. Aplikasi menghitung berapa yang perlu dibeli atau dijual agar porsinya kembali sesuai target.')}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={seg(mode === 'penuh')} onClick={() => setMode('penuh')}>{t('Jual dan beli')}</button>
          <button className={seg(mode === 'dana')} onClick={() => setMode('dana')}>{t('Tambah dana saja (tanpa jual)')}</button>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {mode === 'dana'
            ? <label className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t('Dana baru yang akan ditambahkan (Rp)')}</span><input className="!w-56" type="number" inputMode="decimal" min="0" value={dana} onChange={e => setDana(e.target.value)} /></label>
            : <label className="block text-sm"><span className="mb-1 block text-slate-600 dark:text-slate-400">{t('Toleransi selisih (poin persen)')}</span><input className="!w-32" type="number" inputMode="decimal" min="0" step="0.5" value={tol} onChange={e => setTol(e.target.value)} /></label>}
          <button className="btn" onClick={() => onSemua(samakanDenganSekarang(nilai))}>{t('Samakan dengan porsi sekarang')}</button>
          <button className="btn" onClick={() => onSemua({})}>{t('Kosongkan target')}</button>
        </div>
        <p className="text-xs text-slate-500">{mode === 'penuh' ? t('Kelas yang selisihnya masih dalam batas toleransi dibiarkan (tidak perlu transaksi).') : t('Dana baru dibagi ke kelas yang porsinya di bawah target, sebanding dengan kekurangannya. Tidak ada yang dijual.')}</p>
      </div>

      <div className={card}>
        {r.total <= 0 && <p className="mb-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">{t('Belum ada aset. Tambahkan aset dulu supaya porsi sekarang bisa dihitung.')}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th className={th}>{t('Kelas aset')}</th><th className={th}>{t('Sekarang')}</th><th className={th}>{t('Target (%)')}</th><th className={th}>{t('Setelah')}</th><th className={`${th} text-right`}>{t('Yang perlu dilakukan')}</th></tr></thead>
          <tbody>{semua.map(b => {
            const diam = Math.abs(b.aksi) < 1
            return (
              <tr key={b.k} className="border-t border-slate-200 dark:border-slate-800">
                <td className={td}>
                  <span className="flex items-center gap-2 font-medium"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: warna[b.k] }} />{t(nama[b.k])}</span>
                  <span className="relative mt-1.5 block h-1.5 w-full max-w-[9rem] overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                    <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${Math.min(100, b.pct)}%`, background: warna[b.k] }} />
                    {b.target > 0 && <i className="absolute inset-y-0 block w-0.5 bg-slate-900 dark:bg-white" style={{ left: `${Math.min(99.5, b.target)}%` }} />}
                  </span>
                </td>
                <td className={td}><span className="tabular-nums">{M(b.nilai)}</span><span className="block text-xs tabular-nums text-slate-500">{pct(b.pct)}</span></td>
                <td className={td}><span className="flex items-center gap-1"><input className="!w-20 text-right" type="number" inputMode="decimal" min="0" max="100" step="0.5" aria-label={`${t('Target (%)')} ${t(nama[b.k])}`} value={target[b.k] ?? ''} onChange={e => { const v = e.target.value; onTarget(b.k, v === '' ? undefined : Math.min(100, Math.max(0, Number(v)))) }} />%</span></td>
                <td className={`${td} tabular-nums`}>{pct(b.setelah)}</td>
                <td className={`${td} text-right`}>
                  {r.totalTarget <= 0 ? <span className="text-slate-400">-</span>
                    : diam ? <span className="text-slate-500">{t('Sesuai target')}</span>
                    : <span className={`font-medium tabular-nums ${b.aksi > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{b.aksi > 0 ? t('Beli') : t('Jual')} {M(Math.abs(b.aksi))}</span>}
                  {!diam && b.aksi < 0 && ILIKUID.includes(b.k) && <span className="block text-xs text-slate-500">{t('Aset kurang likuid, pertimbangkan strategi tambah dana.')}</span>}
                </td>
              </tr>
            )
          })}</tbody>
          <tfoot><tr className="border-t border-slate-300 font-medium dark:border-slate-700">
            <td className={td}>{t('Total')}</td><td className={`${td} tabular-nums`}>{M(r.total)}</td>
            <td className={`${td} tabular-nums ${hampir ? 'text-emerald-600' : 'text-amber-600'}`}>{pct(r.totalTarget)}</td>
            <td className={`${td} tabular-nums`}>{r.totalTarget > 0 ? '100%' : '-'}</td>
            <td className={`${td} text-right text-xs font-normal text-slate-500`}>{mode === 'dana' && r.totalTarget > 0 ? `${t('Total pembelian')} ${M(r.bersih)}` : ''}</td>
          </tr></tfoot>
        </table></div>
        {r.totalTarget > 0 && !hampir && <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{t('Total target')} {pct(r.totalTarget)}, {r.totalTarget < 100 ? t('kurang') : t('lebih')} {pct(Math.abs(100 - r.totalTarget))}. {t('Untuk perhitungan, target dinormalkan menjadi 100%.')}</p>}
        <p className="mt-3 text-xs text-slate-500">{t('Garis tegak di batang menunjukkan target. Ini alat bantu hitung, bukan saran investasi. Belum memperhitungkan biaya transaksi dan pajak.')}</p>
      </div>
    </div>
  )
}
