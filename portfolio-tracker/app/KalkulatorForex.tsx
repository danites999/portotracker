'use client'
import { useCallback, useEffect, useState } from 'react'
import { bacaAngka } from '@/lib/uang'
import { InputUang } from './InputUang'
import { MATA } from '@/lib/mata'

const card = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
// Kurs diambil lewat /api/forex (terhadap IDR). Kurs silang, mis. USD ke GBP, dihitung dari dua kurs terhadap IDR.
const LAIN = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'JPY', 'AUD']

export function KalkulatorForex({ t }: { t: (s: string) => string }) {
  const [jumlah, setJumlah] = useState('1')
  const [dari, setDari] = useState('USD'), [ke, setKe] = useState('IDR')
  const [harga, setHarga] = useState<Record<string, number> | null>(null)
  const [waktu, setWaktu] = useState('')
  const [status, setStatus] = useState<'muat' | 'ok' | 'gagal'>('muat')
  const loc = t('id-ID'), lokal = loc.startsWith('id') ? 'id' : 'en'

  const muat = useCallback(() => {
    setStatus('muat')
    fetch(`/api/forex?mata=${MATA.map(m => m[0]).filter(k => k !== 'IDR').join(',')}`)
      .then(r => r.json())
      .then(j => { if (j?.harga && Object.keys(j.harga).length) { setHarga(j.harga); setWaktu(j.waktu || ''); setStatus('ok') } else setStatus('gagal') })
      .catch(() => setStatus('gagal'))
  }, [])
  useEffect(() => { muat() }, [muat])

  const kurs = (c: string): number | undefined => (c === 'IDR' ? 1 : harga?.[c])
  const a = bacaAngka(jumlah, lokal), rd = kurs(dari), rk = kurs(ke)
  const fmt = (n: number) => n.toLocaleString(loc, { maximumFractionDigits: Math.abs(n) >= 1 ? 2 : Math.abs(n) >= 0.01 ? 4 : 8 })
  const hasil = isFinite(a) && rd && rk ? (a * rd) / rk : null
  const lainnya = LAIN.filter(c => c !== dari).slice(0, 6)
  const opsi = (x: [string, string]) => <option key={x[0]} value={x[0]}>{x[0]} ({t(x[1])})</option>
  const label = 'mb-1 block text-sm font-medium'

  return (
    <div className="space-y-3">
      <div className={`${card} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold">{t('Kalkulator forex')}</h2>
          <p className="text-sm text-slate-500">{t('Hitung nilai tukar antar mata uang, mis. IDR ke USD atau USD ke GBP.')}</p>
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div><label htmlFor="fx-jumlah" className={label}>{t('Jumlah')}</label><InputUang id="fx-jumlah" tampil lokal={lokal} value={jumlah} onChange={setJumlah} aria-invalid={!isFinite(a)} /></div>
          <div><label htmlFor="fx-dari" className={label}>{t('Dari')}</label><select id="fx-dari" value={dari} onChange={e => setDari(e.target.value)}>{MATA.map(opsi)}</select></div>
          <button type="button" className="btn h-[38px] justify-self-start" onClick={() => { setDari(ke); setKe(dari) }} aria-label={t('Tukar posisi')} title={t('Tukar posisi')}>⇄</button>
          <div><label htmlFor="fx-ke" className={label}>{t('Ke')}</label><select id="fx-ke" value={ke} onChange={e => setKe(e.target.value)}>{MATA.map(opsi)}</select></div>
        </div>

        {!isFinite(a) && jumlah.trim() !== '' && <p className="text-sm text-red-600">{t('Jumlah tidak valid')}</p>}

        {status === 'muat' && !harga && <p className="text-sm text-slate-500">{t('Memuat kurs…')}</p>}
        {hasil != null && rd && rk && (
          <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
            <p className="text-sm text-slate-500">{fmt(a)} {dari} =</p>
            <p className="text-2xl font-semibold tabular-nums">{fmt(hasil)} {ke}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">1 {dari} = {fmt(rd / rk)} {ke}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">1 {ke} = {fmt(rk / rd)} {dari}</p>
          </div>
        )}
        {harga && (!rd || !rk) && <p className="text-sm text-amber-700 dark:text-amber-400">{t('Kurs belum tersedia untuk')} {!rd ? dari : ke}.</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {status === 'ok' && waktu && <span>{t('Diperbarui')} {new Date(waktu).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</span>}
          {status === 'gagal' && <span className="text-amber-700 dark:text-amber-400">{t('Gagal memuat kurs. Coba lagi.')}</span>}
          <button type="button" className="font-medium underline disabled:opacity-50" onClick={muat} disabled={status === 'muat'}>{t('Muat ulang kurs')}</button>
        </div>
      </div>

      {isFinite(a) && rd && (
        <div className={card}>
          <h3 className="mb-2 font-medium">{t('Nilai dalam mata uang lain')}</h3>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {lainnya.map(c => { const rc = kurs(c); return rc ? (
              <li key={c} className="flex justify-between border-b border-slate-200 py-2 text-sm dark:border-slate-800"><span className="text-slate-500">{c}</span><span className="tabular-nums">{fmt((a * rd) / rc)}</span></li>
            ) : null })}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500">{t('Kurs tengah (mid-market) dari Yahoo Finance, cadangan open.er-api.com. Kurs jual/beli bank atau money changer berbeda karena ada selisih (spread) dan biaya.')}</p>
    </div>
  )
}
