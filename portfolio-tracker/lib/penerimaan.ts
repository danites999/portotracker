// Penerimaan tunai dari aset: dividen, kupon, sewa, dsb. Dicatat per aset dan dijumlahkan ke "total hasil".
// Deposito sengaja tidak ikut: bunganya sudah dihitung harian di dalam nilai deposito (akan terhitung dua kali).
import { Kelas, Aset } from './types'

export type Terima = { id: string; tanggal: string; jumlah: number; jenis: string }
export const BISA_TERIMA: Kelas[] = ['saham', 'ussaham', 'reksa', 'crypto', 'properti']
export const JENIS_TERIMA: Record<string, string[]> = { saham: ['Dividen'], ussaham: ['Dividen'], reksa: ['Dividen', 'Kupon'], crypto: ['Staking', 'Lainnya'], properti: ['Sewa', 'Lainnya'] }
export const punyaTerima = (k: Kelas) => BISA_TERIMA.includes(k)
// Mata uang penerimaan: saham AS dan crypto berharga USD dicatat dalam USD, sisanya Rupiah.
export const mataTerima = (k: Kelas, a: Aset) => (k === 'ussaham' || (k === 'crypto' && a.mata === 'USD') ? 'USD' : 'IDR')
export const daftarTerima = (a: Aset): Terima[] => [...(Array.isArray(a.penerimaan) ? a.penerimaan : [])].sort((x, y) => (x.tanggal < y.tanggal ? 1 : x.tanggal > y.tanggal ? -1 : 0))
export const totalTerima = (a: Aset) => (Array.isArray(a.penerimaan) ? a.penerimaan : []).reduce((s: number, x: Terima) => s + (Number(x.jumlah) || 0), 0)

// Total penerimaan per tanggal (Rp). Penerimaan USD dikonversi dengan kurs terbaru.
export function penerimaanHarian(d: any, kurs: number): Record<string, number> {
  const out: Record<string, number> = {}
  BISA_TERIMA.forEach(k => (d[k] || []).forEach((a: Aset) => {
    const f = mataTerima(k, a) === 'USD' ? kurs : 1
    ;(Array.isArray(a.penerimaan) ? a.penerimaan : []).forEach((x: Terima) => { out[x.tanggal] = (out[x.tanggal] || 0) + (Number(x.jumlah) || 0) * f })
  }))
  return out
}
