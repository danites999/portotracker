// Rebalancing helper: dari nilai tiap kelas aset dan persentase target, hitung berapa yang perlu dibeli/dijual.
import { Kelas } from './types'

export type Mode = 'penuh' | 'dana' // penuh = boleh jual & beli; dana = hanya beli memakai dana baru (tanpa jual)
export type BarisRb = { k: Kelas; nilai: number; pct: number; target: number; setelah: number; aksi: number } // aksi: + beli, - jual (Rp)
export type HasilRb = { baris: BarisRb[]; total: number; totalTarget: number; totalSetelah: number; bersih: number }

export function hitungRebalance(nilai: Record<string, number>, target: Partial<Record<Kelas, number>>, o: { mode: Mode; dana: number; toleransi: number }): HasilRb {
  const ks = Object.keys(nilai) as Kelas[]
  const total = ks.reduce((s, k) => s + (nilai[k] || 0), 0)
  const totalTarget = ks.reduce((s, k) => s + Math.max(0, target[k] || 0), 0)
  const dana = o.mode === 'dana' ? Math.max(0, o.dana || 0) : 0
  const w = (k: Kelas) => (totalTarget > 0 ? Math.max(0, target[k] || 0) / totalTarget : 0) // target dinormalkan ke 100%
  const V = total + dana
  let aksi: Record<string, number> = {}
  if (totalTarget <= 0 || V <= 0) ks.forEach(k => (aksi[k] = 0))
  else if (o.mode === 'penuh') {
    ks.forEach(k => {
      const pct = total > 0 ? ((nilai[k] || 0) / total) * 100 : 0
      aksi[k] = Math.abs(pct - w(k) * 100) <= Math.max(0, o.toleransi) ? 0 : w(k) * V - (nilai[k] || 0) // dalam batas toleransi: dibiarkan
    })
  } else {
    const butuh: Record<string, number> = {}
    ks.forEach(k => (butuh[k] = Math.max(0, w(k) * V - (nilai[k] || 0))))
    const S = ks.reduce((s, k) => s + butuh[k], 0)
    ks.forEach(k => (aksi[k] = S > 0 ? (dana * butuh[k]) / S : 0)) // dana dibagi sebanding kekurangan tiap kelas
  }
  const bersih = ks.reduce((s, k) => s + aksi[k], 0), totalSetelah = total + bersih
  const baris = ks.map(k => ({ k, nilai: nilai[k] || 0, pct: total > 0 ? ((nilai[k] || 0) / total) * 100 : 0, target: w(k) * 100, setelah: totalSetelah > 0 ? (((nilai[k] || 0) + aksi[k]) / totalSetelah) * 100 : 0, aksi: aksi[k] }))
  return { baris, total, totalTarget, totalSetelah, bersih }
}

// Target = porsi sekarang (dibulatkan 1 desimal, selisih pembulatan dibebankan ke kelas terbesar agar totalnya tepat 100).
export function samakanDenganSekarang(nilai: Record<string, number>): Partial<Record<Kelas, number>> {
  const ks = (Object.keys(nilai) as Kelas[]).filter(k => (nilai[k] || 0) > 0), total = ks.reduce((s, k) => s + nilai[k], 0)
  if (!total) return {}
  const out: Partial<Record<Kelas, number>> = {}
  ks.forEach(k => (out[k] = Math.round((nilai[k] / total) * 1000) / 10))
  const sisa = Math.round((100 - ks.reduce((s, k) => s + (out[k] || 0), 0)) * 10) / 10
  const besar = ks.reduce((a, k) => (nilai[k] > nilai[a] ? k : a), ks[0])
  out[besar] = Math.round(((out[besar] || 0) + sisa) * 10) / 10
  return out
}
