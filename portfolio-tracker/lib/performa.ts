// Performa portofolio vs benchmark pada rentang waktu yang sama.
// Return portofolio dihitung time-weighted: tambahan dana (pembelian baru) tidak dianggap untung, dan dividen/kupon/sewa
// yang dicatat bisa ikut dihitung. Benchmark dihitung dari perubahan harganya.
import { Mentah, Titik, isiHari, harian, selisihHari } from './seri'

export type Pt = { t: string; v: number; m: number } // v = nilai total, m = modal total (kumulatif)
export type Rentang = '1M' | '6M' | 'YTD' | '1Y' | 'ALL'
export const RENTANG: Rentang[] = ['1M', '6M', 'YTD', '1Y', 'ALL']

const geser = (iso: string, hari: number) => new Date(Date.parse(iso + 'T00:00:00Z') + hari * 864e5).toISOString().slice(0, 10)
export function tanggalMulai(r: Rentang, today: string, awal: string): string {
  if (r === '1M') return geser(today, -30)
  if (r === '6M') return geser(today, -182)
  if (r === '1Y') return geser(today, -365)
  if (r === 'YTD') return `${Number(today.slice(0, 4)) - 1}-12-31` // penutupan tahun lalu
  return awal
}

// Faktor pertumbuhan harian (1 = awal rentang). Titik awal = hari terakhir yang <= tanggal mulai; kalau data portofolio baru
// ada setelah tanggal mulai, rentang otomatis dimulai dari data pertama (mulaiEfektif).
export function hitungPerforma(seri: Pt[], income: Record<string, number>, denganPenerimaan: boolean, mulai: string): { mulaiEfektif: string; pts: { t: string; g: number }[] } {
  if (seri.length < 2) return { mulaiEfektif: seri[0]?.t || mulai, pts: [] }
  const G: number[] = [1]
  for (let i = 1; i < seri.length; i++) {
    const a = seri[i - 1], b = seri[i], arus = b.m - a.m, inc = denganPenerimaan ? income[b.t] || 0 : 0
    const r = a.v > 0 ? (b.v - arus + inc) / a.v - 1 : 0
    G.push(G[i - 1] * (1 + r))
  }
  let i0 = 0
  seri.forEach((p, i) => { if (p.t <= mulai) i0 = i })
  return { mulaiEfektif: seri[i0].t, pts: seri.slice(i0).map((p, j) => ({ t: p.t, g: G[i0 + j] / G[i0] })) }
}

// Harga benchmark per hari (hari libur diisi harga terakhir), dari mulaiEfektif sampai hari ini.
export function seriBenchmark(m: Mentah, mulaiEfektif: string, today: string): Map<string, number> {
  const s: Titik[] = isiHari(m, mulaiEfektif, today)
  return new Map(s.map(p => [p.t, p.v]))
}

// Gabungkan jadi baris grafik (persen perubahan sejak awal rentang) + return akhir tiap seri.
export function gabungPerforma(port: { pts: { t: string; g: number }[] }, benchmarks: { id: string; peta: Map<string, number> }[]) {
  const t0 = port.pts[0]?.t
  const awal: Record<string, number | undefined> = {}
  benchmarks.forEach(b => { awal[b.id] = b.peta.get(t0) ?? b.peta.values().next().value })
  const data = port.pts.map(p => {
    const row: Record<string, any> = { t: p.t, p: (p.g - 1) * 100 }
    benchmarks.forEach(b => { const v = b.peta.get(p.t), v0 = awal[b.id]; if (v != null && v0) row[b.id] = (v / v0 - 1) * 100 })
    return row
  })
  const akhir: Record<string, number | undefined> = { p: data.length ? data[data.length - 1].p : undefined }
  benchmarks.forEach(b => { for (let i = data.length - 1; i >= 0; i--) if (data[i][b.id] != null) { akhir[b.id] = data[i][b.id]; break } })
  return { data, akhir }
}
export { harian, selisihHari }
