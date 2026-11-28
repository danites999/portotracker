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

// ---- Pemisah ribuan otomatis untuk kolom nominal ----
export type Angka = { int: string; frac: string | null }
const pemisah = (lokal: 'id' | 'en') => (lokal === 'id' ? { rb: '.', ds: ',' } : { rb: ',', ds: '.' }) // rb: pemisah ribuan, ds: pemisah desimal

// Memecah teks angka (digit, titik, koma) menjadi bagian bulat dan pecahan.
// Pemisah desimal bahasa itu selalu desimal. Pemisah ribuan yang membentuk kelompok tiga angka ("10.000.000") dibaca ribuan;
// pemisah tunggal lain ("1543.21") dibaca desimal; pemisah di ujung teks ("10.") dianggap masih diketik.
export function pisahAngka(teks: string, lokal: 'id' | 'en'): Angka {
  const { rb, ds } = pemisah(lokal)
  const s = (teks || '').replace(/[^0-9.,]/g, '')
  if (!s) return { int: '', frac: null }
  let int: string, frac: string | null = null
  const iDs = s.indexOf(ds)
  if (iDs >= 0) {
    int = s.slice(0, iDs).split(rb).join('')
    frac = s.slice(iDs + 1).replace(/[.,]/g, '')
  } else {
    const inti = s.endsWith(rb) ? s.slice(0, -1) : s
    const n = inti.split(rb).length - 1
    if (n === 0) int = inti
    else if (new RegExp(`^\\d{1,3}(\\${rb}\\d{3})+$`).test(inti)) int = inti.split(rb).join('')
    else if (n === 1) { const [a, b] = inti.split(rb); int = a; frac = b }
    else int = inti.split(rb).join('')
  }
  int = int.replace(/^0+(?=\d)/, '').slice(0, 15)
  if (frac !== null) { frac = frac.slice(0, 12); if (int === '') int = '0' }
  return { int, frac }
}
export function formatAngka(a: Angka, lokal: 'id' | 'en'): string {
  if (a.int === '' && a.frac === null) return ''
  const { rb, ds } = pemisah(lokal)
  return a.int.replace(/\B(?=(\d{3})+(?!\d))/g, rb) + (a.frac !== null ? ds + a.frac : '')
}
export const polosAngka = (a: Angka): string => (a.int === '' && a.frac === null ? '' : (a.int || '0') + (a.frac !== null ? '.' + a.frac : ''))
export function dariPolos(p: string): Angka | null {
  if (!/^\d*\.?\d*$/.test(p)) return null
  const [i, f] = p.split('.')
  return { int: i, frac: p.includes('.') ? f ?? '' : null }
}
