// Membangun deret harian (tanggal beli -> hari ini) untuk tiap aset, lalu menjumlahkannya jadi riwayat total.
import { Data, Kelas, Aset } from './types'
import { Baris } from './calc'
import { daftarTrx } from './transaksi'

export type Titik = { t: string; v: number }
export type Mentah = [string, number][]
export type Cache = Record<string, { m: Mentah; potong?: boolean } | 'gagal'>

const DAY = 864e5
export const hariIni = () => new Date().toISOString().slice(0, 10)
const ms = (s: string) => new Date(s + 'T00:00:00Z').getTime()
export const selisihHari = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY)

export function harian(dari: string, sampai: string): string[] {
  const out: string[] = []
  const n = selisihHari(dari, sampai)
  if (!isFinite(n) || n < 0 || n > 20000) return out
  for (let i = 0; i <= n; i++) out.push(new Date(ms(dari) + i * DAY).toISOString().slice(0, 10))
  return out
}

// Aset yang harga historisnya diambil dari /api/riwayat
export const dariApi = (k: Kelas) => k === 'saham' || k === 'crypto' || k === 'forex' || k === 'emas'
export const simbolApi = (k: Kelas, a: Aset): string => (k === 'saham' ? a.kode : k === 'crypto' ? a.coinId : k === 'forex' ? a.mata : '')
export const kunciSeri = (k: Kelas, a: Aset) => `${k}|${simbolApi(k, a)}|${a.tanggal}`
export const jumlahAset = (k: Kelas, a: Aset): number =>
  k === 'saham' ? a.lembar : k === 'crypto' || k === 'forex' ? a.jumlah : k === 'emas' ? a.gram : k === 'reksa' ? a.unit : 1

// Isi hari tanpa data (akhir pekan/libur) dengan harga terakhir yang diketahui.
export function isiHari(m: Mentah, dari: string, sampai: string): Titik[] {
  const urut = [...m].sort((x, y) => (x[0] < y[0] ? -1 : 1))
  const out: Titik[] = []
  let i = 0, cur: number | undefined = urut[0]?.[1]
  const first = urut[0]?.[0]
  for (const t of harian(dari, sampai)) {
    while (i < urut.length && urut[i][0] <= t) { cur = urut[i][1]; i++ }
    // Hari sebelum data pertama hanya diisi mundur maksimal 7 hari (beli di akhir pekan/libur); selebihnya dikosongkan.
    if (first && t < first && selisihHari(t, first) > 7) continue
    if (cur != null) out.push({ t, v: cur })
  }
  return out
}

function linear(t0: string, v0: number, t1: string, v1: number, dari: string, sampai: string): Titik[] {
  const span = selisihHari(t0, t1)
  return harian(dari, sampai).map(t => {
    if (span <= 0 || t >= t1) return { t, v: v1 }
    if (t <= t0) return { t, v: v0 }
    return { t, v: v0 + ((v1 - v0) * selisihHari(t0, t)) / span }
  })
}

// Harga per satuan (atau nilai total untuk properti & deposito) dari tanggal beli sampai hari ini. null = tidak ada data.
export function seriAset(k: Kelas, a: Aset, c?: Cache[string]): Titik[] | null {
  const today = hariIni(), dari = a.tanggal
  if (!dari || dari > today) return null
  if (dariApi(k) && !(k === 'emas' && a.hargaManual > 0)) {
    if (!c || c === 'gagal') return null
    const s = isiHari(c.m, dari, today)
    return s.length ? s : null
  }
  if (k === 'emas') return linear(dari, a.hargaBeli, today, a.hargaManual, dari, today)
  if (k === 'reksa') return linear(dari, a.navBeli, a.tglNav > dari ? a.tglNav : today, a.navTerbaru, dari, today)
  if (k === 'properti') return linear(dari, a.hargaBeli, a.tglNilai > dari ? a.tglNilai : today, a.nilai, dari, today)
  if (k === 'deposito') {
    const mulai = new Date(a.tanggal + 'T00:00:00Z'), jt = new Date(mulai)
    jt.setUTCMonth(jt.getUTCMonth() + a.tenor)
    const hariTenor = (jt.getTime() - mulai.getTime()) / DAY, net = 1 - a.pajak / 100
    return harian(dari, today).map(t => {
      const hr = Math.max(0, Math.min(selisihHari(dari, t), a.aro ? 1e9 : hariTenor))
      return { t, v: a.pokok + ((a.pokok * a.bunga) / 100) * (hr / 365) * net }
    })
  }
  return null
}

// Riwayat total portofolio dari tanggal beli paling awal sampai hari ini.
// Aset tanpa data harga historis dihitung sebesar modalnya (garis datar) supaya total tidak terlihat turun.
export type TitikTotal = Titik & { m: number } // v = total nilai, m = total modal pada hari itu
export function totalHarian(d: Data, rows: Record<Kelas, Baris[]>, cache: Cache): { seri: TitikTotal[]; tanpaData: number } {
  const peta = new Map<string, number>(), pm = new Map<string, number>(), today = hariIni()
  let awal = today, tanpaData = 0
  for (const k of Object.keys(rows) as Kelas[]) {
    for (const a of (d[k] || []) as Aset[]) {
      if (!a.tanggal || a.tanggal > today) continue
      const s = seriAset(k, a, cache[kunciSeri(k, a)])
      const modal = rows[k].find(r => r.id === a.id)?.modal ?? 0
      // Riwayat pembelian: jumlah yang dimiliki dan modal bertambah di tiap tanggal beli (properti & deposito = 1 pembelian).
      const trx = daftarTrx(k, a), totalM = trx.reduce((n, x) => n + x.jumlah * x.harga, 0)
      const qAt = (t: string) => trx.reduce((n, x) => (x.tanggal <= t ? n + x.jumlah : n), 0)
      const modalAt = (t: string) => (trx.length && totalM > 0 ? (modal * trx.reduce((n, x) => (x.tanggal <= t ? n + x.jumlah * x.harga : n), 0)) / totalM : modal)
      if (a.tanggal < awal) awal = a.tanggal
      harian(a.tanggal, today).forEach(t => pm.set(t, (pm.get(t) || 0) + modalAt(t))) // garis modal: naik di tiap tanggal pembelian
      if (s && s[0].t > a.tanggal) harian(a.tanggal, s[0].t).slice(0, -1).forEach(t => peta.set(t, (peta.get(t) || 0) + modalAt(t))) // sebelum data tersedia: sebesar modal
      if (s) s.forEach(p => peta.set(p.t, (peta.get(p.t) || 0) + (trx.length ? qAt(p.t) * p.v : p.v)))
      else { tanpaData++; harian(a.tanggal, today).forEach(t => peta.set(t, (peta.get(t) || 0) + modalAt(t))) }
    }
  }
  const seri = harian(awal, today).filter(t => peta.has(t)).map(t => ({ t, v: peta.get(t)!, m: pm.get(t) || 0 }))
  return { seri, tanpaData }
}

// Kurangi jumlah titik supaya grafik tetap ringan.
export function ringkas<T extends { t: string }>(s: T[], maks = 400): T[] {
  if (s.length <= maks) return s
  const step = Math.ceil(s.length / maks), out = s.filter((_, i) => i % step === 0)
  if (out[out.length - 1] !== s[s.length - 1]) out.push(s[s.length - 1])
  return out
}
