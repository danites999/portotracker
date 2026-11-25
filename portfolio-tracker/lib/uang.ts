// Membaca angka yang diketik pengguna.
// Mengerti pemisah ribuan/desimal sesuai bahasa ("1.000.000" dan "2,5" untuk id; "1,000,000" dan "2.5" untuk en)
// dan, bila singkatan = true, akhiran seperti "10jt", "500rb", "1,5 miliar". Hasil NaN berarti tidak terbaca.
const SKALA: Record<string, number> = { jt: 1e6, juta: 1e6, mio: 1e6, rb: 1e3, ribu: 1e3, k: 1e3, miliar: 1e9, milyar: 1e9 }

export function bacaAngka(teks: string, lokal: 'id' | 'en', singkatan = false): number {
  let x = (teks || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^rp\.?/, '')
  let skala = 1
  if (singkatan) {
    const m = x.match(/^([\d.,]+)([a-z]+)$/)
    if (m && SKALA[m[2]]) { skala = SKALA[m[2]]; x = m[1] }
  }
  if (!/^[\d.,]+$/.test(x)) return NaN
  const rb = lokal === 'id' ? '.' : ',' // pemisah ribuan
  const ds = lokal === 'id' ? ',' : '.' // pemisah desimal
  const hitung = (c: string) => x.split(c).length - 1
  if (hitung(rb) && hitung(ds)) {
    if (hitung(ds) !== 1 || x.lastIndexOf(rb) > x.lastIndexOf(ds)) return NaN
    x = x.split(rb).join('').replace(ds, '.')
  } else if (hitung(rb)) {
    const kelompok = new RegExp(`^\\d{1,3}(\\${rb}\\d{3})+$`).test(x)
    if (kelompok) x = x.split(rb).join('')
    else if (hitung(rb) === 1) x = x.replace(rb, '.') // mis. "2.5jt": titik tunggal dibaca desimal
    else return NaN
  } else if (hitung(ds)) {
    if (hitung(ds) !== 1) return NaN
    x = x.replace(ds, '.')
  }
  const n = parseFloat(x) * skala
  return isFinite(n) ? n : NaN
}
