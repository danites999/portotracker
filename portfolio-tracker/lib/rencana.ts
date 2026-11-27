// Perencanaan tujuan keuangan: profil risiko menurut jenis tujuan dan jangka waktu, usulan penempatan dana,
// lama mencapai target, dan setoran bulanan yang dibutuhkan. Aturan sederhana dan transparan, bukan saran investasi.
// Semua nilai uang dalam rupiah; return dalam persen per tahun (nominal, sebelum pajak dan biaya).

export type Tujuan = 'pendidikan' | 'pensiun' | 'rumah' | 'darurat' | 'liburan' | 'lain'
export type Sikap = 'hati' | 'sesuai' | 'berani'
export type KelasRencana = 'deposito' | 'reksa' | 'emas' | 'saham' | 'ussaham' | 'crypto'
export type Skenario = 'hati' | 'dasar' | 'optimis'

// maks = tingkat risiko tertinggi yang pantas untuk tujuan itu (1 sangat konservatif ... 6 agresif).
// Tujuan dengan tenggat tetap (pendidikan, rumah) dibatasi supaya dana tidak terlalu berisiko; dana darurat selalu paling aman.
export const TUJUAN: Record<Tujuan, { nama: string; maks: number; inflasi: number; tahun: number; target: number }> = {
  pendidikan: { nama: 'Dana pendidikan anak', maks: 4, inflasi: 8, tahun: 12, target: 5e9 },
  pensiun: { nama: 'Dana pensiun', maks: 6, inflasi: 4, tahun: 25, target: 5e9 },
  rumah: { nama: 'Dana pembelian rumah', maks: 4, inflasi: 6, tahun: 7, target: 1e9 },
  darurat: { nama: 'Dana darurat', maks: 1, inflasi: 4, tahun: 2, target: 100e6 },
  liburan: { nama: 'Liburan atau pernikahan', maks: 3, inflasi: 4, tahun: 2, target: 50e6 },
  lain: { nama: 'Tujuan lain', maks: 6, inflasi: 4, tahun: 10, target: 500e6 },
}

export const TINGKAT = ['', 'Sangat konservatif', 'Konservatif', 'Moderat-konservatif', 'Moderat', 'Pertumbuhan', 'Agresif']

// Porsi per tingkat risiko (tiap tingkat berjumlah 100%). Properti dan forex tidak diusulkan: properti dibeli utuh, forex bersifat spekulatif.
export const ALOKASI: Record<number, Record<KelasRencana, number>> = {
  1: { deposito: 60, reksa: 40, emas: 0, saham: 0, ussaham: 0, crypto: 0 },
  2: { deposito: 40, reksa: 40, emas: 10, saham: 10, ussaham: 0, crypto: 0 },
  3: { deposito: 25, reksa: 35, emas: 15, saham: 15, ussaham: 10, crypto: 0 },
  4: { deposito: 10, reksa: 25, emas: 15, saham: 30, ussaham: 20, crypto: 0 },
  5: { deposito: 5, reksa: 15, emas: 10, saham: 40, ussaham: 25, crypto: 5 },
  6: { deposito: 0, reksa: 10, emas: 10, saham: 45, ussaham: 30, crypto: 5 },
}

// Asumsi return nominal per tahun (r) dan rentang naik-turun (band, poin persen) tiap kelas. Hanya perkiraan, bukan jaminan.
export const ASUMSI: Record<KelasRencana, { r: number; band: number }> = {
  deposito: { r: 4.5, band: 1 }, reksa: { r: 6.5, band: 2.5 }, emas: { r: 6, band: 4 },
  saham: { r: 10, band: 6 }, ussaham: { r: 10, band: 6 }, crypto: { r: 15, band: 12 },
}

export const tingkatDariTahun = (tahun: number) => (tahun <= 1 ? 1 : tahun <= 3 ? 2 : tahun <= 5 ? 3 : tahun <= 10 ? 4 : tahun <= 20 ? 5 : 6)

export function tingkat(tujuan: Tujuan, tahun: number, sikap: Sikap = 'sesuai'): number {
  const geser = sikap === 'hati' ? -1 : sikap === 'berani' ? 1 : 0
  return Math.max(1, Math.min(TUJUAN[tujuan].maks, tingkatDariTahun(tahun) + geser))
}

export function returnCampuran(al: Record<KelasRencana, number>): Record<Skenario, number> {
  let dasar = 0, band = 0
  ;(Object.keys(al) as KelasRencana[]).forEach(k => { dasar += (al[k] * ASUMSI[k].r) / 100; band += (al[k] * ASUMSI[k].band) / 100 })
  return { hati: Math.max(0, dasar - band), dasar, optimis: dasar + band }
}

const perBulan = (rTahunan: number) => Math.pow(1 + rTahunan / 100, 1 / 12) - 1 // return bulanan setara; setoran di akhir bulan

export function nilaiAkhir(awal: number, setoran: number, r: number, bulan: number): number {
  const m = perBulan(r)
  if (m === 0) return awal + setoran * bulan
  const f = Math.pow(1 + m, bulan)
  return awal * f + (setoran * (f - 1)) / m
}

// Jumlah bulan sampai target tercapai; null bila tidak tercapai dalam `maks` bulan (default 100 tahun).
export function bulanMencapai(awal: number, setoran: number, r: number, target: number, maks = 1200): number | null {
  if (awal >= target) return 0
  const m = perBulan(r)
  if (setoran <= 0 && m <= 0) return null
  let v = awal
  for (let b = 1; b <= maks; b++) { v = v * (1 + m) + setoran; if (v >= target) return b }
  return null
}

export function setoranDibutuhkan(awal: number, target: number, r: number, bulan: number): number {
  if (bulan <= 0) return Math.max(0, target - awal)
  const m = perBulan(r)
  const c = m === 0 ? (target - awal) / bulan : ((target - awal * Math.pow(1 + m, bulan)) * m) / (Math.pow(1 + m, bulan) - 1)
  return Math.max(0, Math.ceil(c))
}

export type Masukan = { tujuan: Tujuan; target: number; tahun: number; awal: number; setoran: number; sikap: Sikap; inflasiOn: boolean; inflasi: number }
export type Hasil = {
  tk: number; alokasi: Record<KelasRencana, number>; r: Record<Skenario, number>
  targetAkhir: number; bulan: number
  perlu: Record<Skenario | 'tanpa', number> // setoran per bulan agar target tercapai tepat pada waktunya
  capai: Record<Skenario, number | null> | null // bulan sampai target dengan setoran pengguna; null bila belum ada dana awal maupun setoran
  setoranPakai: number // setoran pengguna, atau setoran yang dibutuhkan (skenario dasar) bila pengguna belum mengisi
  jalur: { sisa: number; tk: number; alokasi: Record<KelasRencana, number> }[] // penyesuaian porsi menjelang tenggat
  grafik: { tahun: number; hati: number; dasar: number; optimis: number }[]
}

export function rencana(m: Masukan): Hasil {
  const tk = tingkat(m.tujuan, m.tahun, m.sikap)
  const alokasi = ALOKASI[tk]
  const r = returnCampuran(alokasi)
  const bulan = Math.max(1, Math.round(m.tahun * 12))
  const targetAkhir = m.inflasiOn ? m.target * Math.pow(1 + m.inflasi / 100, m.tahun) : m.target
  const perlu = {
    hati: setoranDibutuhkan(m.awal, targetAkhir, r.hati, bulan),
    dasar: setoranDibutuhkan(m.awal, targetAkhir, r.dasar, bulan),
    optimis: setoranDibutuhkan(m.awal, targetAkhir, r.optimis, bulan),
    tanpa: setoranDibutuhkan(m.awal, targetAkhir, 0, bulan),
  }
  const capai = m.awal > 0 || m.setoran > 0
    ? { hati: bulanMencapai(m.awal, m.setoran, r.hati, targetAkhir), dasar: bulanMencapai(m.awal, m.setoran, r.dasar, targetAkhir), optimis: bulanMencapai(m.awal, m.setoran, r.optimis, targetAkhir) }
    : null
  const setoranPakai = m.setoran > 0 ? m.setoran : perlu.dasar
  const tahunGrafik = Math.min(60, Math.ceil(Math.max(m.tahun, capai?.dasar != null ? capai.dasar / 12 : 0)))
  const grafik = Array.from({ length: tahunGrafik + 1 }, (_, y) => ({
    tahun: y,
    hati: nilaiAkhir(m.awal, setoranPakai, r.hati, 12 * y),
    dasar: nilaiAkhir(m.awal, setoranPakai, r.dasar, 12 * y),
    optimis: nilaiAkhir(m.awal, setoranPakai, r.optimis, 12 * y),
  }))
  // Jalur penyesuaian: makin dekat tenggat, porsi digeser ke yang lebih aman.
  const sisaTahun = [m.tahun, ...(m.tahun > 3 ? [3] : []), ...(m.tahun > 1 ? [1] : [])]
  const jalur = sisaTahun.map(s => { const t = tingkat(m.tujuan, s, m.sikap); return { sisa: s, tk: t, alokasi: ALOKASI[t] } })
  return { tk, alokasi, r, targetAkhir, bulan, perlu, capai, setoranPakai, jalur, grafik }
}
