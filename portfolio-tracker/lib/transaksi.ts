// Riwayat pembelian per aset. Total jumlah, harga rata-rata, dan tanggal beli pertama selalu DIHITUNG dari daftar ini,
// lalu disalin ke field lama (lembar/hargaBeli/tanggal, dst.) supaya semua perhitungan lain tetap berjalan.
import { Kelas, Aset } from './types'

export type Trx = { id: string; tanggal: string; jumlah: number; harga: number }

// Kelas yang bisa dibeli bertahap. Properti dan deposito dibeli sekali, jadi tidak ikut.
export const BISA: Kelas[] = ['saham', 'reksa', 'crypto', 'forex', 'emas']
export const punyaTrx = (k: Kelas) => BISA.includes(k)

// Nama field jumlah (q) dan harga beli (h) pada tiap kelas aset
export const KUNCI: Record<string, { q: string; h: string }> = {
  saham: { q: 'lembar', h: 'hargaBeli' }, reksa: { q: 'unit', h: 'navBeli' }, crypto: { q: 'jumlah', h: 'hargaBeli' },
  forex: { q: 'jumlah', h: 'kursBeli' }, emas: { q: 'gram', h: 'hargaBeli' },
}

const bulat = (n: number) => Math.round(n * 1e12) / 1e12 // buang sisa pecahan floating point (0.1 + 0.2)
const urut = (l: Trx[]) => [...l].sort((x, y) => (x.tanggal < y.tanggal ? -1 : x.tanggal > y.tanggal ? 1 : 0))

// Daftar pembelian terurut dari yang terlama. Aset lama (tanpa riwayat) dianggap satu pembelian.
export function daftarTrx(k: Kelas, a: Aset): Trx[] {
  if (!punyaTrx(k)) return []
  if (Array.isArray(a.transaksi) && a.transaksi.length) return urut(a.transaksi)
  const K = KUNCI[k]
  return [{ id: 'awal', tanggal: a.tanggal, jumlah: a[K.q], harga: a[K.h] }]
}

export function ringkasTrx(trx: Trx[]) {
  const l = urut(trx), jumlah = bulat(l.reduce((s, x) => s + x.jumlah, 0)), modal = l.reduce((s, x) => s + x.jumlah * x.harga, 0)
  return { jumlah, modal, rata: jumlah ? modal / jumlah : 0, awal: l[0]?.tanggal || '', akhir: l[l.length - 1]?.tanggal || '' }
}

// Pasang daftar pembelian ke aset dan hitung ulang jumlah total, harga rata-rata, dan tanggal beli pertama.
export function terapkan(k: Kelas, a: Aset, trx: Trx[]): Aset {
  const K = KUNCI[k], r = ringkasTrx(trx)
  return { ...a, transaksi: urut(trx), [K.q]: r.jumlah, [K.h]: r.rata, tanggal: r.awal }
}
