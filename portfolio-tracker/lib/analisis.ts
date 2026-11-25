// Analisis portofolio dan pembagian dana baru ke kelas aset berdasarkan target porsi.
// Aturan sederhana dan transparan (bukan saran investasi): dana dibagi ke kelas yang porsinya paling kurang dari target.
import { Kelas } from './types'

export type Profil = 'konservatif' | 'moderat' | 'agresif' | 'saya'

// Target contoh umum per profil (total tiap profil 100%). Pengguna bisa memakai target sendiri lewat menu Rebalancing.
export const PROFIL_TARGET: Record<'konservatif' | 'moderat' | 'agresif', Partial<Record<Kelas, number>>> = {
  konservatif: { saham: 10, ussaham: 5, reksa: 25, emas: 20, properti: 10, deposito: 30 },
  moderat: { saham: 25, ussaham: 10, reksa: 20, crypto: 5, emas: 15, properti: 10, deposito: 15 },
  agresif: { saham: 35, ussaham: 20, reksa: 10, crypto: 10, emas: 10, properti: 10, deposito: 5 },
}

// Kelas yang dibeli utuh, bukan dicicil dari dana kecil: tetap dihitung di target, tetapi tidak ikut menerima dana.
export const TIDAK_DARI_DANA_KECIL: Kelas[] = ['properti']

export type BarisAlokasi = { k: Kelas; nilai: number; pct: number; target: number; bagian: number; setelah: number }
export type HasilAlokasi = { baris: BarisAlokasi[]; total: number; totalTarget: number; dana: number; tidakIkut: Kelas[] }

export function alokasiDana(nilai: Record<string, number>, target: Partial<Record<Kelas, number>>, danaMasuk: number, bulat = 1000): HasilAlokasi {
  const ks = Object.keys(nilai) as Kelas[]
  const dana = Math.max(0, danaMasuk || 0)
  const total = ks.reduce((s, k) => s + (nilai[k] || 0), 0)
  const totalTarget = ks.reduce((s, k) => s + Math.max(0, target[k] || 0), 0)
  const w = (k: Kelas) => (totalTarget > 0 ? Math.max(0, target[k] || 0) / totalTarget : 0) // target dinormalkan ke 100%
  const bisa = (k: Kelas) => !TIDAK_DARI_DANA_KECIL.includes(k) && w(k) > 0
  const V = total + dana

  const kurang: Record<string, number> = {}
  ks.forEach(k => (kurang[k] = bisa(k) ? Math.max(0, w(k) * V - (nilai[k] || 0)) : 0))
  const S = ks.reduce((s, k) => s + kurang[k], 0)

  const bagian: Record<string, number> = {}
  if (!totalTarget || dana <= 0 || !ks.some(bisa)) ks.forEach(k => (bagian[k] = 0))
  else if (S >= dana) ks.forEach(k => (bagian[k] = (dana * kurang[k]) / S)) // dibagi sebanding kekurangan tiap kelas
  else {
    // Semua kekurangan sudah tertutup dan dana masih sisa: sisanya dibagi sesuai porsi target kelas yang boleh menerima.
    const wb = ks.reduce((s, k) => s + (bisa(k) ? w(k) : 0), 0)
    ks.forEach(k => (bagian[k] = kurang[k] + (bisa(k) ? ((dana - S) * w(k)) / wb : 0)))
  }

  // Pembulatan ke kelipatan `bulat` rupiah; selisih pembulatan dibebankan ke kelas dengan bagian terbesar agar totalnya pas.
  const b = dana >= bulat * 10 ? bulat : 1
  const ada = ks.filter(k => bagian[k] > 0)
  if (ada.length && dana > 0) {
    const bulatan: Record<string, number> = {}
    ks.forEach(k => (bulatan[k] = Math.round(bagian[k] / b) * b))
    const besar = ada.reduce((a, k) => (bagian[k] > bagian[a] ? k : a), ada[0])
    bulatan[besar] += dana - ks.reduce((s, k) => s + bulatan[k], 0)
    ks.forEach(k => (bagian[k] = Math.max(0, Math.round(bulatan[k]))))
  }

  const setelahTotal = total + dana
  const baris: BarisAlokasi[] = ks.map(k => ({
    k, nilai: nilai[k] || 0,
    pct: total > 0 ? ((nilai[k] || 0) / total) * 100 : 0,
    target: w(k) * 100,
    bagian: bagian[k],
    setelah: setelahTotal > 0 ? (((nilai[k] || 0) + bagian[k]) / setelahTotal) * 100 : 0,
  }))
  const tidakIkut = ks.filter(k => TIDAK_DARI_DANA_KECIL.includes(k) && w(k) > 0 && (nilai[k] || 0) < w(k) * V)
  return { baris, total, totalTarget, dana, tidakIkut }
}

// Catatan portofolio berbasis aturan sederhana. Tiap catatan berupa id + angka; teksnya disusun di komponen supaya bisa diterjemahkan.
export type Catatan = { id: 'kelas' | 'aset' | 'beragam' | 'valas' | 'crypto' | 'aman'; nama?: string; k?: Kelas; angka?: number }

export function catatanPorto(nilai: Record<string, number>, aset: { nama: string; k: Kelas; nilai: number }[]): Catatan[] {
  const ks = (Object.keys(nilai) as Kelas[]).filter(k => (nilai[k] || 0) > 0)
  const total = ks.reduce((s, k) => s + nilai[k], 0)
  if (total <= 0) return []
  const out: Catatan[] = []
  const pct = (k: string) => ((nilai[k] || 0) / total) * 100
  const kelasBesar = ks.reduce((a, k) => (nilai[k] > nilai[a] ? k : a), ks[0])
  if (ks.length >= 2 && pct(kelasBesar) > 50) out.push({ id: 'kelas', k: kelasBesar, angka: pct(kelasBesar) })
  if (ks.length <= 2) out.push({ id: 'beragam', angka: ks.length })
  const ada = aset.filter(a => a.nilai > 0)
  if (ada.length >= 2) {
    const besar = ada.reduce((a, x) => (x.nilai > a.nilai ? x : a), ada[0])
    if ((besar.nilai / total) * 100 > 30) out.push({ id: 'aset', nama: besar.nama, angka: (besar.nilai / total) * 100 })
  }
  const valas = pct('ussaham') + pct('forex')
  if (valas > 40) out.push({ id: 'valas', angka: valas })
  if (pct('crypto') > 15) out.push({ id: 'crypto', k: 'crypto', angka: pct('crypto') })
  if (!out.length) out.push({ id: 'aman' })
  return out
}
